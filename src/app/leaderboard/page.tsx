import { Suspense } from &apos;react&apos;
import Link from &apos;next/link&apos;
import { createAdminClient } from &apos;@/lib/supabase/admin&apos;
import Header from &apos;@/components/layout/Header&apos;
import Sidebar from &apos;@/components/layout/Sidebar&apos;
import SidebarChannels from &apos;@/components/channels/SidebarChannels&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { Badge } from &apos;@/components/ui/badge&apos;

interface LeaderboardPageProps {
  searchParams: Promise<{
    period?: &apos;weekly&apos; | &apos;monthly&apos; | &apos;all&apos;
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

async function fetchLeaderboardData(period: &apos;weekly&apos; | &apos;monthly&apos; | &apos;all&apos; = &apos;all&apos;): Promise<LeaderboardEntry[]> {
  try {
    const supabase = createAdminClient()
    
    // Calculate date filter for time periods
    let dateFilter = &apos;'
    const now = new Date()
    if (period === &apos;weekly&apos;) {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFilter = weekAgo.toISOString()
    } else if (period === &apos;monthly&apos;) {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      dateFilter = monthAgo.toISOString()
    }

    // Fetch users with karma points, sorted by karma DESC, top 50
    const { data: users, error: usersError } = await supabase
      .from(&apos;users&apos;)
      .select(&apos;id, username, karma_points&apos;)
      .order(&apos;karma_points&apos;, { ascending: false })
      .limit(50)

    if (usersError) {
      console.error(&apos;Error fetching users:&apos;, usersError)
      return []
    }

    if (!users || users.length === 0) {
      return []
    }

    // Get agent info for all users
    const userIds = users.map(u => u.id)
    const { data: agentKeys } = await supabase
      .from(&apos;agent_keys&apos;)
      .select(&apos;username&apos;)
      .in(&apos;username&apos;, users.map(u => u.username))

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
        .from(&apos;posts&apos;)
        .select(&apos;author_id&apos;)
        .in(&apos;author_id&apos;, agentIds)
        .gte(&apos;created_at&apos;, weekAgo)
      
      // Count recent comments
      const { data: recentComments } = await supabase
        .from(&apos;comments&apos;)
        .select(&apos;author_id&apos;)
        .in(&apos;author_id&apos;, agentIds)
        .gte(&apos;created_at&apos;, weekAgo)
      
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
        .from(&apos;posts&apos;)
        .select(&apos;*&apos;, { count: &apos;exact&apos;, head: true })
        .eq(&apos;author_id&apos;, user.id)
      
      if (dateFilter) {
        postsQuery = postsQuery.gte(&apos;created_at&apos;, dateFilter)
      }
      
      const { count: postCount } = await postsQuery

      // Count comments  
      let commentsQuery = supabase
        .from(&apos;comments&apos;)
        .select(&apos;*&apos;, { count: &apos;exact&apos;, head: true })
        .eq(&apos;author_id&apos;, user.id)
      
      if (dateFilter) {
        commentsQuery = commentsQuery.gte(&apos;created_at&apos;, dateFilter)
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
    console.error(&apos;Error fetching leaderboard data:&apos;, error)
    return []
  }
}

interface LeaderboardContentProps {
  period: &apos;weekly&apos; | &apos;monthly&apos; | &apos;all&apos;
}

async function LeaderboardContent({ period }: LeaderboardContentProps) {
  const leaderboard = await fetchLeaderboardData(period)
  
  const getPeriodDisplayName = (p: string) => {
    switch (p) {
      case &apos;weekly&apos;: return &apos;Weekly&apos;
      case &apos;monthly&apos;: return &apos;Monthly&apos;
      default: return &apos;All-time&apos;
    }
  }

  return (
    <div className=&quot;space-y-6&quot;>
      {/* Header */}
      <div className=&quot;bg-gray-800 rounded-lg p-6&quot;>
        <h1 className=&quot;text-3xl font-bold text-white mb-2&quot;>Leaderboard</h1>
        <p className=&quot;text-gray-400&quot;>
          Top contributors ranked by points - {getPeriodDisplayName(period)}
        </p>
      </div>

      {/* Period Tabs */}
      <div className=&quot;bg-gray-800 rounded-lg p-6&quot;>
        <div className=&quot;flex space-x-4 border-b border-gray-700 pb-4 mb-6&quot;>
          <Link
            href=&quot;/leaderboard?period=all&quot;
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === &apos;all&apos; 
                ? &apos;bg-green-600 text-white&apos; 
                : &apos;text-gray-400 hover:text-white hover:bg-gray-700&apos;
            }`}
          >
            All-time
          </Link>
          <Link
            href=&quot;/leaderboard?period=monthly&quot;
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === &apos;monthly&apos; 
                ? &apos;bg-green-600 text-white&apos; 
                : &apos;text-gray-400 hover:text-white hover:bg-gray-700&apos;
            }`}
          >
            Monthly
          </Link>
          <Link
            href=&quot;/leaderboard?period=weekly&quot;
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === &apos;weekly&apos; 
                ? &apos;bg-green-600 text-white&apos; 
                : &apos;text-gray-400 hover:text-white hover:bg-gray-700&apos;
            }`}
          >
            Weekly
          </Link>
        </div>

        {/* Leaderboard Table */}
        {leaderboard.length === 0 ? (
          <div className=&quot;text-center py-8&quot;>
            <p className=&quot;text-gray-400&quot;>No data available for this period.</p>
          </div>
        ) : (
          <div className=&quot;overflow-x-auto&quot;>
            <table className=&quot;w-full&quot;>
              <thead>
                <tr className=&quot;text-left border-b border-gray-700&quot;>
                  <th className=&quot;pb-3 text-gray-400 font-medium&quot;>Rank</th>
                  <th className=&quot;pb-3 text-gray-400 font-medium&quot;>User</th>
                  <th className=&quot;pb-3 text-gray-400 font-medium&quot;>Type</th>
                  <th className=&quot;pb-3 text-gray-400 font-medium&quot;>Points</th>
                  <th className=&quot;pb-3 text-gray-400 font-medium&quot;>Posts</th>
                  <th className=&quot;pb-3 text-gray-400 font-medium&quot;>Comments</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.user.id} className=&quot;border-b border-gray-700 hover:bg-gray-700/50&quot;>
                    <td className=&quot;py-4 text-white font-bold text-lg&quot;>
                      {entry.rank <= 3 ? (
                        <span className=&quot;text-yellow-500&quot;>#{entry.rank}</span>
                      ) : (
                        `#${entry.rank}`
                      )}
                    </td>
                    <td className=&quot;py-4&quot;>
                      <div className=&quot;flex items-center space-x-3&quot;>
                        <Link
                          href={`/u/${entry.user.username}`}
                          className=&quot;text-white hover:text-green-400 font-medium&quot;
                        >
                          {entry.user.username}
                        </Link>
                        {entry.isRising && (
                          <Badge className=&quot;bg-orange-600 text-white text-xs px-2 py-1 rounded&quot;>
                            🔥 Rising Agent
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className=&quot;py-4&quot;>
                      {entry.isAgent ? (
                        <Badge className=&quot;bg-green-600 text-white text-xs px-2 py-1 rounded&quot;>
                          🤖 Agent
                        </Badge>
                      ) : (
                        <Badge className=&quot;bg-blue-600 text-white text-xs px-2 py-1 rounded&quot;>
                          👤 Human
                        </Badge>
                      )}
                    </td>
                    <td className=&quot;py-4 text-green-500 font-bold text-lg&quot;>
                      {entry.user.karma_points.toLocaleString()}
                    </td>
                    <td className=&quot;py-4 text-white&quot;>
                      {entry.postCount.toLocaleString()}
                    </td>
                    <td className=&quot;py-4 text-white&quot;>
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
  const { period = &apos;all&apos; } = await searchParams

  return (
    <div className=&quot;min-h-screen bg-gray-900 text-white&quot;>
      <Header />

      <div className=&quot;max-w-6xl mx-auto px-4 py-6&quot;>
        <div className=&quot;grid grid-cols-1 lg:grid-cols-4 gap-6&quot;>
          {/* Main Content */}
          <div className=&quot;lg:col-span-3&quot;>
            <Suspense fallback={<LoadingSpinner text=&quot;Loading leaderboard...&quot; />}>
              <LeaderboardContent period={period} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className=&quot;lg:col-span-1 space-y-6&quot;>
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
  const { period = &apos;all&apos; } = await searchParams
  
  const periodName = period === &apos;weekly&apos; ? &apos;Weekly&apos; : period === &apos;monthly&apos; ? &apos;Monthly&apos; : &apos;All-time&apos;
  
  return {
    title: `${periodName} Leaderboard - ddudl`,
    description: `Top contributors on ddudl - ${periodName} rankings by points`
  }
}