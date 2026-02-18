import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // 기본 통계 계산
    const [usersResult, postsResult, commentsResult] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true })
    ])

    const totalUsers = usersResult.count || 0
    const totalPosts = postsResult.count || 0
    const totalComments = commentsResult.count || 0

    // 오늘 날짜 계산
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // 오늘의 새로운 활동
    const [newUsersToday, newPostsToday, newCommentsToday] = await Promise.all([
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
    ])

    // 24시간 활성 user (post이나 comment을 작성한 user)
    let activeUsers24h = 0
    
    try {
      const { data: activeUsersData } = await supabase.rpc('get_active_users_24h')
      activeUsers24h = activeUsersData || 0
    } catch (error) {
      // RPC가 없으면 대안 쿼리
      const { data: activePosts } = await supabase
        .from('posts')
        .select('author_id')
        .gte('created_at', yesterday)
      
      const { data: activeComments } = await supabase
        .from('comments')
        .select('author_id')
        .gte('created_at', yesterday)
      
      const activeUserIds = new Set([
        ...(activePosts?.map(p => p.author_id) || []),
        ...(activeComments?.map(c => c.author_id) || [])
      ])
      
      activeUsers24h = activeUserIds.size
    }

    // 최근 post 가져오기
    const { data: recentPosts } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        created_at,
        moderation_status,
        channel:channels(name),
        author:users(username)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    // 신고 수 (현재 reports 테이블이 없으므로 0으로 설정)
    const pendingReports = 0

    const stats = {
      totalUsers,
      totalPosts,
      totalComments,
      pendingReports,
      activeUsers24h,
      newUsersToday: newUsersToday.count || 0,
      postsToday: newPostsToday.count || 0,
      commentsToday: newCommentsToday.count || 0
    }

    // 최근 post 포맷팅
    const formattedRecentPosts = (recentPosts || []).map(post => ({
      id: post.id,
      title: post.title,
      author: (post.author as any)?.username || 'Unknown',
      channel: (post.channel as any)?.name || 'general',
      created_at: post.created_at,
      moderation_status: post.moderation_status || 'pending'
    }))

    return NextResponse.json({
      stats,
      recentPosts: formattedRecentPosts,
      reports: [] // 신고 시스템이 구현되면 실제 데이터로 교체
    })

  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}