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
    const postId = searchParams.get('postId')
    const authorType = searchParams.get('author_type') || 'all'
    const period = searchParams.get('period') || 'all'
    const sort = searchParams.get('sort') || 'newest'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const adminSupabase = createAdminClient()

    let query = adminSupabase
      .from('comments')
      .select(`
        id,
        content,
        author_id,
        post_id,
        parent_id,
        upvote_count,
        downvote_count,
        vote_score,
        created_at,
        updated_at,
        ai_generated,
        is_deleted,
        moderation_status,
        author_name,
        posts!inner(title, channels!inner(name, display_name))
      `)

    // Filter by post ID
    if (postId) {
      query = query.eq('post_id', postId)
    }

    // Filter by author type
    if (authorType === 'human') {
      query = query.eq('ai_generated', false)
    } else if (authorType === 'agent') {
      query = query.eq('ai_generated', true)
    }

    // Filter by period
    const now = new Date()
    if (period === 'today') {
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString()
      query = query.gte('created_at', todayStart)
    } else if (period === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', weekAgo)
    } else if (period === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', monthAgo)
    }

    // Only show non-deleted comments by default
    query = query.eq('is_deleted', false)

    // Apply sorting
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (sort === 'most_voted') {
      query = query.order('vote_score', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments', code: 'FETCH_ERROR' }, { status: 500 })
    }

    const formattedComments = comments?.map(comment => ({
      id: comment.id,
      content: comment.content,
      author_id: comment.author_id,
      author_name: comment.author_name,
      post: {
        id: comment.post_id,
        title: (comment.posts as any)?.title,
        channel: {
          name: (comment.posts as any)?.channels?.name,
          display_name: (comment.posts as any)?.channels?.display_name
        }
      },
      parent_id: comment.parent_id,
      stats: {
        upvotes: comment.upvote_count || 0,
        downvotes: comment.downvote_count || 0,
        vote_score: comment.vote_score || 0
      },
      flags: {
        ai_generated: comment.ai_generated || false,
        is_deleted: comment.is_deleted || false
      },
      moderation_status: comment.moderation_status || 'published',
      created_at: comment.created_at,
      updated_at: comment.updated_at
    })) || []

    return NextResponse.json({
      comments: formattedComments,
      pagination: {
        limit,
        offset,
        total: formattedComments.length
      }
    })

  } catch (error) {
    console.error('Admin comments API error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}