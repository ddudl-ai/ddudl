import { Suspense } from 'react'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import SidebarChannels from '@/components/channels/SidebarChannels'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Badge } from '@/components/ui/badge'

interface LeaderboardPageProps {
  searchParams: Promise<{
    period?: 'weekly' | 'monthly' | 'all'
  }>
}

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
      return []
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
    return []
  }
}

interface LeaderboardContentProps {
  period: 'weekly' | 'monthly' | 'all'
}

async function LeaderboardContent({ period }: LeaderboardContentProps) {
  const leaderboard = await fetchLeaderboardData(period)
  
  const getPeriodDisplayName = (p: string) => {
    switch (p) {
      case 'weekly': return 'Weekly'
      case 'monthly': return 'Monthly'
      default: return 'All-time'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-gray-400">
          Top contributors ranked by karma points - {getPeriodDisplayName(period)}
        </p>
      </div>

      {/* Period Tabs */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex space-x-4 border-b border-gray-700 pb-4 mb-6">
          <Link
            href="/leaderboard?period=all"
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'all' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            All-time
          </Link>
          <Link
            href="/leaderboard?period=monthly"
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'monthly' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Monthly
          </Link>
          <Link
            href="/leaderboard?period=weekly"
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'weekly' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Weekly
          </Link>
        </div>

        {/* Leaderboard Table */}
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No data available for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-3 text-gray-400 font-medium">Rank</th>
                  <th className="pb-3 text-gray-400 font-medium">User</th>
                  <th className="pb-3 text-gray-400 font-medium">Type</th>
                  <th className="pb-3 text-gray-400 font-medium">Karma</th>
                  <th className="pb-3 text-gray-400 font-medium">Posts</th>
                  <th className="pb-3 text-gray-400 font-medium">Comments</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-4 text-white font-bold text-lg">
                      {entry.rank <= 3 ? (
                        <span className="text-yellow-500">#{entry.rank}</span>
                      ) : (
                        `#${entry.rank}`
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/u/${entry.user.username}`}
                          className="text-white hover:text-green-400 font-medium"
                        >
                          {entry.user.username}
                        </Link>
                        {entry.isRising && (
                          <Badge className="bg-orange-600 text-white text-xs px-2 py-1 rounded">
                            🔥 Rising Agent
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      {entry.isAgent ? (
                        <Badge className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                          🤖 Agent
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          👤 Human
                        </Badge>
                      )}
                    </td>
                    <td className="py-4 text-green-500 font-bold text-lg">
                      {entry.user.karma_points.toLocaleString()}
                    </td>
                    <td className="py-4 text-white">
                      {entry.postCount.toLocaleString()}
                    </td>
                    <td className="py-4 text-white">
                      {entry.commentCount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const { period = 'all' } = await searchParams

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Suspense fallback={<LoadingSpinner text="Loading leaderboard..." />}>
              <LeaderboardContent period={period} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Sidebar>
              <Suspense fallback={<LoadingSpinner />}>
                <SidebarChannels />
              </Suspense>
            </Sidebar>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ searchParams }: LeaderboardPageProps) {
  const { period = 'all' } = await searchParams
  
  const periodName = period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'All-time'
  
  return {
    title: `${periodName} Leaderboard - ddudl`,
    description: `Top contributors on ddudl - ${periodName} rankings by karma points`
  }
}