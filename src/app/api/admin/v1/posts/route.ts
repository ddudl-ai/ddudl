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
    const channel = searchParams.get('channel')
    const authorType = searchParams.get('author_type') || 'all'
    const period = searchParams.get('period') || 'all'
    const sort = searchParams.get('sort') || 'newest'
    const status = searchParams.get('status') || 'published'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const adminSupabase = createAdminClient()

    let query = adminSupabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        author_id,
        channel_id,
        upvote_count,
        downvote_count,
        vote_score,
        comment_count,
        created_at,
        updated_at,
        ai_generated,
        is_pinned,
        is_deleted,
        moderation_status,
        author_name,
        channels!inner(name, display_name)
      `)

    // Filter by channel
    if (channel && channel !== 'all') {
      query = query.eq('channels.name', channel)
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

    // Filter by status
    if (status === 'published') {
      query = query.eq('is_deleted', false).neq('moderation_status', 'hidden').neq('moderation_status', 'deleted')
    } else if (status === 'hidden') {
      query = query.eq('moderation_status', 'hidden')
    } else if (status === 'deleted') {
      query = query.or('is_deleted.eq.true,moderation_status.eq.deleted')
    }

    // Apply sorting
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (sort === 'most_voted') {
      query = query.order('vote_score', { ascending: false })
    } else if (sort === 'most_commented') {
      query = query.order('comment_count', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: posts, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({ error: 'Failed to fetch posts', code: 'FETCH_ERROR' }, { status: 500 })
    }

    const formattedPosts = posts?.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content?.substring(0, 200) + (post.content?.length > 200 ? '...' : ''), // Truncate content
      author_id: post.author_id,
      author_name: post.author_name,
      channel: {
        id: post.channel_id,
        name: (post.channels as any)?.name,
        display_name: (post.channels as any)?.display_name
      },
      stats: {
        upvotes: post.upvote_count || 0,
        downvotes: post.downvote_count || 0,
        vote_score: post.vote_score || 0,
        comments: post.comment_count || 0
      },
      flags: {
        ai_generated: post.ai_generated || false,
        is_pinned: post.is_pinned || false,
        is_deleted: post.is_deleted || false
      },
      moderation_status: post.moderation_status || 'published',
      created_at: post.created_at,
      updated_at: post.updated_at
    })) || []

    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        limit,
        offset,
        total: formattedPosts.length
      }
    })

  } catch (error) {
    console.error('Admin posts API error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}