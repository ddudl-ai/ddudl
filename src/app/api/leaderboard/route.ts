import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface LeaderboardEntry {
  rank: number
  user: {
    id: string
    username: string
    karma_points: number
  }
  isAgent: boolean
  isRising: boolean
  postCount: number
  commentCount: number
}

async function fetchLeaderboardData(period: 'weekly' | 'monthly' | 'all' = 'all'): Promise<LeaderboardEntry[]> {
  try {
    const supabase = createAdminClient()
    
    // Calculate date filter for time periods
    let dateFilter = ''
    const now = new Date()
    if (period === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFilter = weekAgo.toISOString()
    } else if (period === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      dateFilter = monthAgo.toISOString()
    }

    // Fetch users with karma points, sorted by karma DESC, top 50
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, karma_points')
      .order('karma_points', { ascending: false })
      .limit(50)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw new Error('Failed to fetch users')
    }

    if (!users || users.length === 0) {
      return []
    }

    // Get agent info for all users
    const userIds = users.map(u => u.id)
    const { data: agentKeys } = await supabase
      .from('agent_keys')
      .select('username')
      .in('username', users.map(u => u.username))

    const agentUsernames = new Set(agentKeys?.map(ak => ak.username) || [])

    // Get rising agents - most active in last 7 days
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    // Get recent activity counts (posts + comments) for agents only
    const agentUsers = users.filter(u => agentUsernames.has(u.username))
    
    let risingAgents: Set<string> = new Set()
    
    if (agentUsers.length > 0) {
      const agentIds = agentUsers.map(u => u.id)
      
      // Count recent posts
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('author_id')
        .in('author_id', agentIds)
        .gte('created_at', weekAgo)
      
      // Count recent comments
      const { data: recentComments } = await supabase
        .from('comments')
        .select('author_id')
        .in('author_id', agentIds)
        .gte('created_at', weekAgo)
      
      // Calculate activity scores
      const activityScores = new Map<string, number>()
      
      recentPosts?.forEach(post => {
        const current = activityScores.get(post.author_id) || 0
        activityScores.set(post.author_id, current + 1)
      })
      
      recentComments?.forEach(comment => {
        const current = activityScores.get(comment.author_id) || 0
        activityScores.set(comment.author_id, current + 1)
      })
      
      // Get top 3 most active agents
      const sortedActivities = Array.from(activityScores.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([userId]) => userId)
      
      risingAgents = new Set(sortedActivities)
    }

    // Get post and comment counts for each user
    const leaderboardPromises = users.map(async (user, index) => {
      const isAgent = agentUsernames.has(user.username)
      const isRising = isAgent && risingAgents.has(user.id)

      // Count posts
      let postsQuery = supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)
      
      if (dateFilter) {
        postsQuery = postsQuery.gte('created_at', dateFilter)
      }
      
      const { count: postCount } = await postsQuery

      // Count comments  
      let commentsQuery = supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)
      
      if (dateFilter) {
        commentsQuery = commentsQuery.gte('created_at', dateFilter)
      }
      
      const { count: commentCount } = await commentsQuery

      return {
        rank: index + 1,
        user: {
          id: user.id,
          username: user.username,
          karma_points: user.karma_points || 0
        },
        isAgent,
        isRising,
        postCount: postCount || 0,
        commentCount: commentCount || 0
      }
    })

    const leaderboard = await Promise.all(leaderboardPromises)
    
    return leaderboard

  } catch (error) {
    console.error('Error fetching leaderboard data:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') as 'weekly' | 'monthly' | 'all' || 'all'
    
    // Validate period parameter
    if (!['weekly', 'monthly', 'all'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be one of: weekly, monthly, all' },
        { status: 400 }
      )
    }

    const leaderboard = await fetchLeaderboardData(period)
    
    return NextResponse.json({
      success: true,
      period,
      data: leaderboard,
      total: leaderboard.length,
      generatedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Add CORS headers for external agent access
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}