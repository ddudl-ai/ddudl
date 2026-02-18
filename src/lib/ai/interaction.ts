import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
    });
  }
  return _openai;
}

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-build',
    });
  }
  return _anthropic;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
);

export interface PostSummary {
  id: string;
  title: string;
  content: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  readingTime: number;
  confidence: number;
}

export interface EngagementComment {
  content: string;
  type: 'discussion_starter' | 'question' | 'opinion' | 'fact_check';
  confidence: number;
  reasoning: string;
}

export interface TranslationResult {
  originalLanguage: string;
  translatedContent: string;
  confidence: number;
  culturalNotes?: string[];
}

/**
 * Generate discussion-promoting comments for inactive posts
 */
export async function generateEngagementComment(
  postId: string,
  postTitle: string,
  postContent: string,
  channelTheme: string,
  existingComments: number = 0
): Promise<EngagementComment | null> {
  
  // Don't generate comments if post already has good engagement
  if (existingComments > 3) {
    return null;
  }
  
  const prompt = `Generate an engaging comment for this Korean Reddit-style post to encourage discussion:

Post Title: "${postTitle}"
Post Content: "${postContent}"
Post Title: "${postTitle}"
Post Content: "${postContent}"
Channel: c/${channelTheme}
Current Comments: ${existingComments}

Requirements:
- Write in Korean
- Be genuinely helpful and add value
- Ask thoughtful questions or provide interesting perspectives
- Match the channel's tone and culture
- Encourage others to share their experiences or opinions
- Keep it natural and not obviously AI-generated
- Length: 50-200 characters

Return JSON with: content, type (discussion_starter/question/opinion/fact_check), confidence (0-100), reasoning`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful Korean community member who writes engaging comments to promote healthy discussions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.content || result.confidence < 60) {
      return null;
    }
    
    return {
      content: result.content,
      type: result.type || 'discussion_starter',
      confidence: result.confidence || 70,
      reasoning: result.reasoning || 'AI-generated engagement comment'
    };
    
  } catch (error) {
    console.error('Failed to generate engagement comment:', error);
    return null;
  }
}

/**
 * Generate 3-line summary for long posts
 */
export async function generatePostSummary(
  postId: string,
  title: string,
  content: string
): Promise<PostSummary | null> {
  
  // Only summarize posts longer than 500 characters
  if (content.length < 500) {
    return null;
  }
  
  const prompt = `Summarize this Korean post in exactly 3 lines:

Title: "${title}"
Content: "${content}"

Requirements:
- Write in Korean
- Exactly 3 lines, each line should be concise
- Capture the main points and key information
- Maintain the original tone and intent
- Each line should be 30-50 characters
- Include key points as bullet points
- Determine sentiment (positive/negative/neutral)
- Estimate reading time in minutes

Return JSON with: summary (3-line string), keyPoints (array), sentiment, readingTime, confidence (0-100)`;

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textContent = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    const result = JSON.parse(textContent);
    
    if (!result.summary || result.confidence < 70) {
      return null;
    }
    
    return {
      id: postId,
      title,
      content,
      summary: result.summary,
      keyPoints: result.keyPoints || [],
      sentiment: result.sentiment || 'neutral',
      readingTime: result.readingTime || Math.ceil(content.length / 200),
      confidence: result.confidence || 70
    };
    
  } catch (error) {
    console.error('Failed to generate post summary:', error);
    return null;
  }
}

/**
 * Translate foreign content and post it
 */
export async function translateAndPost(
  originalContent: string,
  sourceLanguage: string,
  targetChannel: string,
  originalUrl?: string
): Promise<TranslationResult | null> {
  
  const prompt = `Translate this content from ${sourceLanguage} to Korean for a Korean Reddit-like community:

Original Content: "${originalContent}"
Original Content: "${originalContent}"
Target Channel: c/${targetChannel}

Requirements:
- Translate naturally to Korean, not word-for-word
- Adapt cultural references for Korean audience
- Maintain the original meaning and tone
- Add cultural context notes if needed
- Make it engaging for Korean users
- Include any important cultural adaptations

Return JSON with: translatedContent, confidence (0-100), culturalNotes (array of strings)`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in adapting content for Korean audiences.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.translatedContent || result.confidence < 70) {
      return null;
    }
    
    return {
      originalLanguage: sourceLanguage,
      translatedContent: result.translatedContent,
      confidence: result.confidence || 70,
      culturalNotes: result.culturalNotes || []
    };
    
  } catch (error) {
    console.error('Failed to translate content:', error);
    return null;
  }
}

/**
 * Find inactive posts that need engagement
 */
export async function findInactivePosts(
  hoursThreshold: number = 24,
  limit: number = 10
): Promise<Array<{
  id: string;
  title: string;
  content: string;
  channelName: string;
  commentCount: number;
  createdAt: string;
}>> {
  
  try {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        comment_count,
        created_at,
        channels!inner(name)
      `)
      .eq('is_deleted', false)
      .eq('moderation_status', 'approved')
      .lt('comment_count', 2) // Posts with less than 2 comments
      .lt('created_at', thresholdDate.toISOString())
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Not older than 7 days
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    return (posts || []).map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content || '',
      channelName: (post.channels as any).name,
      commentCount: post.comment_count,
      createdAt: post.created_at
    }));
    
  } catch (error) {
    console.error('Failed to find inactive posts:', error);
    return [];
  }
}

/**
 * Find long posts that need summaries
 */
export async function findPostsNeedingSummary(
  minLength: number = 500,
  limit: number = 10
): Promise<Array<{
  id: string;
  title: string;
  content: string;
  channelName: string;
}>> {
  
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        channels!inner(name)
      `)
      .eq('is_deleted', false)
      .eq('moderation_status', 'approved')
      .not('content', 'is', null)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to filter by length
    
    if (error) {
      throw error;
    }
    
    // Filter by content length
    const longPosts = (posts || [])
      .filter((post: any) => (post.content || '').length >= minLength)
      .slice(0, limit);
    
    return longPosts.map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content || '',
      channelName: (post.channels as any).name
    }));
    
  } catch (error) {
    console.error('Failed to find posts needing summary:', error);
    return [];
  }
}

/**
 * Post an AI-generated comment
 */
export async function postAIComment(
  postId: string,
  content: string,
  _commentType: string = 'discussion_starter'
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  
  try {
    // Get or create AI bot user
    const botUser = await getOrCreateAIBotUser();
    
    // Insert comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        content,
        author_id: botUser.id,
        post_id: postId,
        ai_generated: true
      })
      .select('id')
      .single();
    
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      commentId: comment.id
    };
    
  } catch (error) {
    console.error('Failed to post AI comment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Post a summary comment for a long post
 */
export async function postSummaryComment(
  postId: string,
  summary: PostSummary
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  
  const summaryContent = `📝 **3줄 요약**

${summary.summary}

**주요 points:**
${summary.keyPoints.map(point => `• ${point}`).join('\n')}

*읽는 시간: 약 ${summary.readingTime}분 | 감정: ${summary.sentiment === 'positive' ? '긍정적' : summary.sentiment === 'negative' ? '부정적' : '중립적'}*

---
*이 요약은 AI가 자동 생성했습니다.*`;

  return await postAIComment(postId, summaryContent, 'summary');
}

/**
 * Get or create AI bot user for interactions
 */
async function getOrCreateAIBotUser() {
  const { data: existingBot } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'ai-assistant')
    .single();
  
  if (existingBot) {
    return existingBot;
  }
  
  // Create AI assistant user
  const { data: newBot, error } = await supabase
    .from('users')
    .insert({
      username: 'ai-assistant',
      email_hash: 'ai-assistant-hash',
      karma_points: 500
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create AI assistant user: ${error.message}`);
  }
  
  return newBot;
}

/**
 * Run engagement tasks for inactive posts
 */
export async function runEngagementTasks(): Promise<{
  commentsGenerated: number;
  summariesGenerated: number;
  errors: string[];
}> {
  
  const results = {
    commentsGenerated: 0,
    summariesGenerated: 0,
    errors: [] as string[]
  };
  
  try {
    // Find inactive posts and generate engagement comments
    const inactivePosts = await findInactivePosts(24, 5);
    
    for (const post of inactivePosts) {
      try {
        const comment = await generateEngagementComment(
          post.id,
          post.title,
          post.content,
          post.channelName,
          post.commentCount
        );
        
        if (comment && comment.confidence > 70) {
          const result = await postAIComment(post.id, comment.content, comment.type);
          if (result.success) {
            results.commentsGenerated++;
          } else {
            results.errors.push(`Failed to post comment: ${result.error}`);
          }
        }
        
      } catch (error) {
        results.errors.push(`Error processing post ${post.id}: ${error}`);
      }
    }
    
    // Find long posts and generate summaries
    const longPosts = await findPostsNeedingSummary(500, 3);
    
    for (const post of longPosts) {
      try {
        const summary = await generatePostSummary(post.id, post.title, post.content);
        
        if (summary && summary.confidence > 70) {
          const result = await postSummaryComment(post.id, summary);
          if (result.success) {
            results.summariesGenerated++;
          } else {
            results.errors.push(`Failed to post summary: ${result.error}`);
          }
        }
        
      } catch (error) {
        results.errors.push(`Error summarizing post ${post.id}: ${error}`);
      }
    }
    
  } catch (error) {
    results.errors.push(`General error in engagement tasks: ${error}`);
  }
  
  return results;
}