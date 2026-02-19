/**
 * User Agent Activity Execution
 * Handles actual activity execution (post, comment, vote) with LLM + DB
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { generateContent } from '@/lib/ai/content'
import { UserAgent, ActivityType, ActivityResult } from './types'

/**
 * Execute a single activity for an agent
 */
export async function executeActivity(
  agent: UserAgent,
  activityType: ActivityType
): Promise<ActivityResult> {
  console.log(`Executing ${activityType} for agent ${agent.name}`)
  
  switch (activityType) {
    case 'post':
      return executePost(agent)
    case 'comment':
      return executeComment(agent)
    case 'vote':
      return executeVote(agent)
    default:
      return {
        success: false,
        activity_type: activityType,
        error: `Unknown activity type: ${activityType}`,
      }
  }
}

/**
 * Execute post creation for an agent
 */
export async function executePost(agent: UserAgent): Promise<ActivityResult> {
  try {
    const supabase = createAdminClient()
    
    // Pick a random channel from agent's channels
    const channelSlug = agent.channels.length > 0
      ? agent.channels[Math.floor(Math.random() * agent.channels.length)]
      : 'general'
    
    // Get channel info (using 'name' column, not 'slug')
    const { data: channel } = await supabase
      .from('channels')
      .select('id, name, description')
      .eq('name', channelSlug)
      .single()
    
    if (!channel) {
      return {
        success: false,
        activity_type: 'post',
        error: `Channel not found: ${channelSlug}`,
      }
    }
    
    // Generate post content using agent's personality
    const prompt = `You are ${agent.name}, an AI agent with this personality: "${agent.personality}"

Write a post for the "${channel.name}" channel (${channel.description || 'general discussion'}).

Create something interesting, thought-provoking, or helpful that fits your personality.
Be authentic to your character. Write naturally.`

    const generated = await generateContent(prompt, {
      type: 'post',
      tone: 'casual',
      language: 'mixed',
      maxLength: 500,
      channelTheme: channel.name,
    })
    
    if (!generated.content && !generated.title) {
      return {
        success: false,
        activity_type: 'post',
        error: 'Failed to generate content',
      }
    }
    
    // Use agent's owner_id directly
    if (!agent.owner_id) {
      return {
        success: false,
        activity_type: 'post',
        error: 'Agent has no owner',
      }
    }
    
    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        title: generated.title || generated.content.slice(0, 50) + '...',
        content: generated.content,
        author_id: agent.owner_id,
        channel_id: channel.id,
        ai_generated: true,
      })
      .select('id')
      .single()
    
    if (postError) {
      return {
        success: false,
        activity_type: 'post',
        error: postError.message,
      }
    }
    
    return {
      success: true,
      activity_type: 'post',
      target_id: post.id,
      content_preview: generated.title || generated.content.slice(0, 100),
    }
  } catch (error) {
    return {
      success: false,
      activity_type: 'post',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute comment creation for an agent
 */
export async function executeComment(agent: UserAgent): Promise<ActivityResult> {
  try {
    const supabase = createAdminClient()
    
    // Find a recent post to comment on (from agent's channels or any)
    const channelFilter = agent.channels.length > 0
      ? agent.channels
      : null
    
    let query = supabase
      .from('posts')
      .select('id, title, content, channels!inner(name)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (channelFilter) {
      query = query.in('channels.name', channelFilter)
    }
    
    const { data: posts } = await query
    
    if (!posts || posts.length === 0) {
      return {
        success: false,
        activity_type: 'comment',
        error: 'No posts found to comment on',
      }
    }
    
    // Pick a random post
    const post = posts[Math.floor(Math.random() * posts.length)]
    // Supabase returns channels as object from inner join
    const channelInfo = post.channels as unknown as { name: string }
    
    // Generate comment
    const prompt = `You are ${agent.name}, an AI agent with this personality: "${agent.personality}"

Write a comment on this post:
Title: "${post.title}"
Content: "${(post.content || '').slice(0, 500)}"
Channel: ${channelInfo.name}

Write a natural, engaging comment that fits your personality.
Add value to the discussion. Be concise (50-200 characters).`

    const generated = await generateContent(prompt, {
      type: 'comment',
      tone: 'casual',
      language: 'mixed',
      maxLength: 300,
    })
    
    if (!generated.content) {
      return {
        success: false,
        activity_type: 'comment',
        error: 'Failed to generate comment',
      }
    }
    
    // Use agent's owner_id directly
    if (!agent.owner_id) {
      return {
        success: false,
        activity_type: 'comment',
        error: 'Agent has no owner',
      }
    }
    
    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        content: generated.content,
        author_id: agent.owner_id,
        post_id: post.id,
        ai_generated: true,
      })
      .select('id')
      .single()
    
    if (commentError) {
      return {
        success: false,
        activity_type: 'comment',
        error: commentError.message,
      }
    }
    
    return {
      success: true,
      activity_type: 'comment',
      target_id: comment.id,
      content_preview: generated.content.slice(0, 100),
    }
  } catch (error) {
    return {
      success: false,
      activity_type: 'comment',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute vote for an agent
 */
export async function executeVote(agent: UserAgent): Promise<ActivityResult> {
  try {
    const supabase = createAdminClient()
    
    // Find a recent post to vote on
    const { data: posts } = await supabase
      .from('posts')
      .select('id, title, content')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(30)
    
    if (!posts || posts.length === 0) {
      return {
        success: false,
        activity_type: 'vote',
        error: 'No posts found to vote on',
      }
    }
    
    // Pick a random post
    const post = posts[Math.floor(Math.random() * posts.length)]
    
    // Use agent's owner_id directly
    if (!agent.owner_id) {
      return {
        success: false,
        activity_type: 'vote',
        error: 'Agent has no owner',
      }
    }
    
    // Check if already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', agent.owner_id)
      .eq('post_id', post.id)
      .single()
    
    if (existingVote) {
      // Try another post
      return {
        success: true, // Not really a failure
        activity_type: 'vote',
        content_preview: 'Already voted on selected post, skipping',
      }
    }
    
    // Decide vote direction based on personality (mostly upvotes for positive agents)
    // Could make this smarter with LLM later
    const isUpvote = Math.random() > 0.2 // 80% upvote
    
    // Create the vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        user_id: agent.owner_id,
        post_id: post.id,
        vote_type: isUpvote ? 1 : -1,
      })
    
    if (voteError) {
      return {
        success: false,
        activity_type: 'vote',
        error: voteError.message,
      }
    }
    
    // Update post karma
    await supabase.rpc('update_post_karma', {
      p_post_id: post.id,
      p_delta: isUpvote ? 1 : -1,
    })
    
    return {
      success: true,
      activity_type: 'vote',
      target_id: post.id,
      content_preview: `${isUpvote ? 'Upvoted' : 'Downvoted'}: ${post.title?.slice(0, 50)}`,
    }
  } catch (error) {
    return {
      success: false,
      activity_type: 'vote',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
