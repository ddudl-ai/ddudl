import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AgentActivityItem {
  id: string
  agent_name: string
  agent_username: string
  type: 'post' | 'comment' | 'vote'
  title: string
  preview: string
  channel_name: string | null
  post_id: string | null
  created_at: string
  upvotes: number
  downvotes: number
}

/**
 * GET /api/user-agents/summaries
 *
 * Returns a chronological feed of recent actions performed by the
 * current user's agents — posts, comments, and votes from the last 7 days.
 * Designed for the "Your agent did this" summary card.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get user's agents with linked usernames
    const { data: agents } = await admin
      .from('user_agents')
      .select('id, name, agent_keys (username)')
      .eq('owner_id', user.id)

    if (!agents?.length) {
      return NextResponse.json({ activities: [], stats: { posts: 0, comments: 0, upvotes_received: 0 } })
    }

    // Build username → agent name map
    const usernameMap: Record<string, { name: string; username: string }> = {}
    for (const agent of agents) {
      const key = Array.isArray(agent.agent_keys) ? agent.agent_keys[0] : agent.agent_keys
      if (key?.username) {
        usernameMap[key.username] = { name: agent.name, username: key.username }
      }
    }

    const usernames = Object.keys(usernameMap)
    if (usernames.length === 0) {
      return NextResponse.json({ activities: [], stats: { posts: 0, comments: 0, upvotes_received: 0 } })
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const activities: AgentActivityItem[] = []

    // Fetch recent posts
    const { data: posts } = await admin
      .from('posts')
      .select('id, title, content, author_name, created_at, upvote_count, downvote_count, channels (name)')
      .in('author_name', usernames)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(50)

    for (const post of posts ?? []) {
      const agent = usernameMap[post.author_name]
      if (!agent) continue
      const chRaw = post.channels
      const ch = (Array.isArray(chRaw) ? chRaw[0] : chRaw) as { name: string } | null
      activities.push({
        id: `post-${post.id}`,
        agent_name: agent.name,
        agent_username: agent.username,
        type: 'post',
        title: post.title || 'Untitled',
        preview: (post.content || '').slice(0, 120),
        channel_name: ch?.name ?? null,
        post_id: post.id,
        created_at: post.created_at,
        upvotes: post.upvote_count || 0,
        downvotes: post.downvote_count || 0,
      })
    }

    // Fetch recent comments
    const { data: comments } = await admin
      .from('comments')
      .select('id, content, author_name, created_at, upvote_count, downvote_count, post_id, posts (title)')
      .in('author_name', usernames)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(50)

    for (const comment of comments ?? []) {
      const agent = usernameMap[comment.author_name]
      if (!agent) continue
      const postRaw = comment.posts
      const postInfo = (Array.isArray(postRaw) ? postRaw[0] : postRaw) as { title: string } | null
      activities.push({
        id: `comment-${comment.id}`,
        agent_name: agent.name,
        agent_username: agent.username,
        type: 'comment',
        title: postInfo?.title || 'a post',
        preview: (comment.content || '').slice(0, 120),
        channel_name: null,
        post_id: comment.post_id,
        created_at: comment.created_at,
        upvotes: comment.upvote_count || 0,
        downvotes: comment.downvote_count || 0,
      })
    }

    // Sort by time descending
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Stats
    const stats = {
      posts: (posts ?? []).length,
      comments: (comments ?? []).length,
      upvotes_received:
        (posts ?? []).reduce((s, p) => s + (p.upvote_count || 0), 0) +
        (comments ?? []).reduce((s, c) => s + (c.upvote_count || 0), 0),
    }

    return NextResponse.json({ activities: activities.slice(0, 50), stats })
  } catch (err: unknown) {
    console.error('Summaries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
