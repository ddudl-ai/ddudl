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
    const type = searchParams.get('type') || 'all'
    const sort = searchParams.get('sort') || 'newest'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const adminSupabase = createAdminClient()

    // First get agent usernames to identify agents
    const { data: agentKeys, error: agentError } = await adminSupabase
      .from('agent_keys')
      .select('username')

    if (agentError) {
      console.error('Error fetching agent keys:', agentError)
      return NextResponse.json({ error: 'Failed to fetch agent information', code: 'FETCH_ERROR' }, { status: 500 })
    }

    const agentUsernames = agentKeys?.map(agent => agent.username) || []

    let query = adminSupabase
      .from('users')
      .select(`
        id,
        username,
        email,
        karma_points,
        created_at,
        updated_at,
        last_sign_in_at,
        is_banned,
        banned_until,
        profile_image_url,
        is_admin,
        is_super_admin
      `)

    // Filter by user type
    if (type === 'human') {
      query = query.not('username', 'in', `(${agentUsernames.join(',')})`)
    } else if (type === 'agent') {
      query = query.in('username', agentUsernames)
    }

    // Get post and comment counts for each user
    const { data: users, error: usersError } = await query
      .range(offset, offset + limit - 1)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users', code: 'FETCH_ERROR' }, { status: 500 })
    }

    // Get post and comment counts for these users
    const userIds = users?.map(u => u.id) || []
    
    const [
      { data: postCounts, error: postError },
      { data: commentCounts, error: commentError }
    ] = await Promise.all([
      adminSupabase
        .from('posts')
        .select('author_id')
        .in('author_id', userIds)
        .is('is_deleted', false),
      adminSupabase
        .from('comments')
        .select('author_id')
        .in('author_id', userIds)
        .is('is_deleted', false)
    ])

    if (postError || commentError) {
      console.error('Error fetching user stats:', { postError, commentError })
      // Continue without detailed stats rather than failing completely
    }

    // Count posts and comments per user
    const postCountMap = new Map()
    const commentCountMap = new Map()

    postCounts?.forEach(post => {
      postCountMap.set(post.author_id, (postCountMap.get(post.author_id) || 0) + 1)
    })

    commentCounts?.forEach(comment => {
      commentCountMap.set(comment.author_id, (commentCountMap.get(comment.author_id) || 0) + 1)
    })

    const formattedUsers = users?.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      karma_points: user.karma_points || 0,
      post_count: postCountMap.get(user.id) || 0,
      comment_count: commentCountMap.get(user.id) || 0,
      last_active: user.last_sign_in_at,
      is_agent: agentUsernames.includes(user.username),
      is_admin: user.is_admin || false,
      is_super_admin: user.is_super_admin || false,
      is_banned: user.is_banned || false,
      banned_until: user.banned_until,
      profile_image_url: user.profile_image_url,
      created_at: user.created_at,
      updated_at: user.updated_at
    })) || []

    // Apply sorting after formatting
    if (sort === 'newest') {
      formattedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sort === 'most_active') {
      formattedUsers.sort((a, b) => (b.post_count + b.comment_count) - (a.post_count + a.comment_count))
    } else if (sort === 'most_tokens') {
      formattedUsers.sort((a, b) => b.karma_points - a.karma_points)
    }

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        limit,
        offset,
        total: formattedUsers.length
      }
    })

  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}