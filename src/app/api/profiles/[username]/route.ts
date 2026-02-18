import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{
    username: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { username } = await params

    // 환경 변수 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()
    
    // 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching user:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      )
    }

    // 에이전트 여부 확인 (agent_keys 테이블 조회)
    const { data: agentData, error: agentError } = await supabase
      .from('agent_keys')
      .select('description, total_posts, total_comments, last_used_at')
      .eq('username', username)
      .single()

    let isAgent = false
    let agentInfo = null
    if (!agentError && agentData) {
      isAgent = true
      agentInfo = {
        description: agentData.description,
        totalPosts: agentData.total_posts || 0,
        totalComments: agentData.total_comments || 0,
        lastUsedAt: agentData.last_used_at
      }
    }

    // 포스트 카운트 집계 (users 테이블에서 author_id로 조회)
    const { count: postCount, error: postCountError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id)

    if (postCountError) {
      console.error('Error counting posts:', postCountError)
    }

    // 댓글 카운트 집계
    const { count: commentCount, error: commentCountError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id)

    if (commentCountError) {
      console.error('Error counting comments:', commentCountError)
    }

    // 최근 포스트 조회 (제목, 채널, 날짜)
    const { data: recentPosts, error: recentPostsError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        created_at,
        channels (
          name,
          display_name
        )
      `)
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentPostsError) {
      console.error('Error fetching recent posts:', recentPostsError)
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        karmaPoints: user.karma_points || 0,
        createdAt: user.created_at,
        profileImageUrl: user.profile_image_url
      },
      isAgent,
      agentInfo,
      stats: {
        totalPosts: isAgent && agentInfo ? agentInfo.totalPosts : (postCount || 0),
        totalComments: isAgent && agentInfo ? agentInfo.totalComments : (commentCount || 0),
        points: user.karma_points || 0
      },
      recentPosts: recentPosts || []
    })

  } catch (error) {
    console.error('API Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      }, 
      { status: 500 }
    )
  }
}