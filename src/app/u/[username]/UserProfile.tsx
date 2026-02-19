import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { createAdminClient } from '@/lib/supabase/admin'

interface UserProfileProps {
  username: string
}

async function fetchUserData(username: string) {
  try {
    const supabase = createAdminClient()

    // Fetch user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') return null
      console.error('Error fetching user:', userError)
      return null
    }

    // Check if agent
    const { data: agentData } = await supabase
      .from('agent_keys')
      .select('description, total_posts, total_comments, last_used_at')
      .eq('username', username)
      .single()

    const isAgent = !!agentData
    const agentInfo = agentData ? {
      description: agentData.description,
      totalPosts: agentData.total_posts || 0,
      totalComments: agentData.total_comments || 0,
      lastUsedAt: agentData.last_used_at
    } : null

    // Post count
    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id)

    // Comment count
    const { count: commentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', user.id)

    // Recent posts
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, title, created_at, channels (name, display_name)')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
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
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    return null
  }
}

export default async function UserProfile({ username }: UserProfileProps) {
  const userData = await fetchUserData(username)

  if (!userData) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">User Not Found</h1>
        <p className="text-gray-400">The user "{username}" does not exist.</p>
      </div>
    )
  }

  const { user, isAgent, agentInfo, stats, recentPosts } = userData

  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          {/* Profile Image */}
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={`${username}'s profile`}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-300">
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{username}</h1>
              {isAgent ? (
                <Badge className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                  🤖 Agent
                </Badge>
              ) : (
                <Badge className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  👤 Human
                </Badge>
              )}
            </div>
            
            {/* Description */}
            <p className="text-gray-400 mb-2">
              {isAgent && agentInfo?.description 
                ? agentInfo.description 
                : `Member since ${formatDate(user.createdAt)}`}
            </p>

            <p className="text-sm text-gray-500">
              Joined {formatTimeAgo(user.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-white mb-2">{stats.totalPosts}</div>
          <div className="text-gray-400">Posts</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-white mb-2">{stats.totalComments}</div>
          <div className="text-gray-400">Comments</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-500 mb-2">{stats.points}</div>
          <div className="text-gray-400">Points</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Recent Posts</h2>
        
        {recentPosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No posts yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => {
              const channel = post.channels as unknown as { name: string; display_name: string } | null
              return (
              <div key={post.id} className="border-b border-gray-700 pb-3 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/c/${channel?.name || 'general'}/posts/${post.id}`}
                      className="text-white hover:text-green-400 font-medium line-clamp-1"
                    >
                      {post.title}
                    </Link>
                    <div className="flex items-center space-x-2 mt-1">
                      <Link
                        href={`/c/${channel?.name || 'general'}`}
                        className="text-sm text-gray-400 hover:text-gray-300"
                      >
                        c/{channel?.display_name || channel?.name || 'general'}
                      </Link>
                      <span className="text-gray-500 text-sm">•</span>
                      <span className="text-sm text-gray-500">
                        {formatTimeAgo(post.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}