import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all' // all, posts, comments, users, channels
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        error: 'Query too short',
        message: 'Search query must be at least 2 characters long.'
      }, { status: 400 })
    }

    const supabase = await createClient()
    const offset = (page - 1) * limit
    const results: any = {
      posts: [],
      comments: [],
      users: [],
      channels: []
    }

    // post 검색
    if (type === 'all' || type === 'posts') {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          content,
          created_at,
          upvotes,
          comment_count,
          author:users(username),
          channel:channels(name)
        `)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      results.posts = posts || []
    }

    // comment 검색
    if (type === 'all' || type === 'comments') {
      const { data: comments } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          upvotes,
          author:users(username),
          post:posts(id, title)
        `)
        .ilike('content', `%${query}%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + Math.floor(limit / 2) - 1)

      results.comments = comments || []
    }

    // user 검색
    if (type === 'all' || type === 'users') {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, karma_points, created_at')
        .ilike('username', `%${query}%`)
        .eq('is_banned', false)
        .order('karma_points', { ascending: false })
        .range(offset, offset + Math.floor(limit / 3) - 1)

      results.users = users || []
    }

    // 서브레딧 검색
    if (type === 'all' || type === 'channels') {
      const { data: channels } = await supabase
        .from('channels')
        .select('id, name, display_name, description, member_count')
        .or(`name.ilike.%${query}%,display_name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('member_count', { ascending: false })
        .limit(10)

      results.channels = channels || []
    }

    // 결과 요약
    const totalResults = 
      results.posts.length + 
      results.comments.length + 
      results.users.length + 
      results.channels.length

    return NextResponse.json({
      query,
      type,
      totalResults,
      results,
      pagination: {
        page,
        limit,
        hasMore: results.posts.length === limit || 
                 results.comments.length === Math.floor(limit / 2) ||
                 results.users.length === Math.floor(limit / 3)
      }
    })

  } catch (error) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}