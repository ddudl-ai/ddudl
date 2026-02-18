import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Validate Admin API Key
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const adminSupabase = createAdminClient()

    // Get posts with high downvote ratio (potentially problematic content)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const [
      { data: flaggedPosts, error: postsError },
      { data: flaggedComments, error: commentsError }
    ] = await Promise.all([
      // Posts with negative vote score and recent activity
      adminSupabase
        .from('posts')
        .select(`
          id,
          title,
          content,
          author_name,
          upvote_count,
          downvote_count,
          vote_score,
          created_at,
          ai_generated,
          channels!inner(name, display_name)
        `)
        .lt('vote_score', -2) // More downvotes than upvotes
        .gte('created_at', last24Hours)
        .eq('is_deleted', false)
        .order('vote_score', { ascending: true })
        .limit(Math.floor(limit / 2)),

      // Comments with negative vote score and recent activity  
      adminSupabase
        .from('comments')
        .select(`
          id,
          content,
          author_name,
          upvote_count,
          downvote_count,
          vote_score,
          created_at,
          ai_generated,
          posts!inner(title, channels!inner(name, display_name))
        `)
        .lt('vote_score', -1)
        .gte('created_at', last24Hours)
        .eq('is_deleted', false)
        .order('vote_score', { ascending: true })
        .limit(Math.floor(limit / 2))
    ])

    if (postsError || commentsError) {
      console.error('Error fetching review queue:', { postsError, commentsError })
      return NextResponse.json({ error: 'Failed to fetch review queue', code: 'FETCH_ERROR' }, { status: 500 })
    }

    // Format flagged posts
    const formattedPosts = flaggedPosts?.map(post => ({
      type: 'post',
      id: post.id,
      title: post.title,
      content: post.content?.substring(0, 200) + (post.content?.length > 200 ? '...' : ''),
      author_name: post.author_name,
      channel: {
        name: (post.channels as any)?.name,
        display_name: (post.channels as any)?.display_name
      },
      stats: {
        upvotes: post.upvote_count || 0,
        downvotes: post.downvote_count || 0,
        vote_score: post.vote_score || 0
      },
      flags: {
        ai_generated: post.ai_generated || false,
        downvote_ratio: post.downvote_count > 0 ? (post.downvote_count / (post.upvote_count + post.downvote_count)) : 0
      },
      created_at: post.created_at,
      reason: 'High downvote ratio'
    })) || []

    // Format flagged comments
    const formattedComments = flaggedComments?.map(comment => ({
      type: 'comment',
      id: comment.id,
      content: comment.content,
      author_name: comment.author_name,
      post: {
        title: (comment.posts as any)?.title,
        channel: {
          name: (comment.posts as any)?.channels?.name,
          display_name: (comment.posts as any)?.channels?.display_name
        }
      },
      stats: {
        upvotes: comment.upvote_count || 0,
        downvotes: comment.downvote_count || 0,
        vote_score: comment.vote_score || 0
      },
      flags: {
        ai_generated: comment.ai_generated || false,
        downvote_ratio: comment.downvote_count > 0 ? (comment.downvote_count / (comment.upvote_count + comment.downvote_count)) : 0
      },
      created_at: comment.created_at,
      reason: 'High downvote ratio'
    })) || []

    // Combine and sort by severity (vote score)
    const reviewQueue = [...formattedPosts, ...formattedComments]
      .sort((a, b) => a.stats.vote_score - b.stats.vote_score) // Most negative first
      .slice(offset, offset + limit)

    return NextResponse.json({
      review_queue: reviewQueue,
      pagination: {
        limit,
        offset,
        total: reviewQueue.length
      },
      summary: {
        total_flagged: reviewQueue.length,
        posts: formattedPosts.length,
        comments: formattedComments.length,
        criteria: 'Content with negative vote score in last 24 hours'
      }
    })

  } catch (error) {
    console.error('Admin review queue API error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}