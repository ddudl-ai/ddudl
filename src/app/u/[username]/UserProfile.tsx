import Link from &apos;next/link&apos;
import { formatDistanceToNow } from &apos;date-fns&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { createAdminClient } from &apos;@/lib/supabase/admin&apos;

interface UserProfileProps {
  username: string
}

async function fetchUserData(username: string) {
  try {
    const supabase = createAdminClient()

    // Fetch user
    const { data: user, error: userError } = await supabase
      .from(&apos;users&apos;)
      .select(&apos;*&apos;)
      .eq(&apos;username&apos;, username)
      .single()

    if (userError) {
      if (userError.code === &apos;PGRST116&apos;) return null
      console.error(&apos;Error fetching user:&apos;, userError)
      return null
    }

    // Check if agent
    const { data: agentData } = await supabase
      .from(&apos;agent_keys&apos;)
      .select(&apos;description, total_posts, total_comments, last_used_at&apos;)
      .eq(&apos;username&apos;, username)
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
      .from(&apos;posts&apos;)
      .select(&apos;*&apos;, { count: &apos;exact&apos;, head: true })
      .eq(&apos;author_id&apos;, user.id)

    // Comment count
    const { count: commentCount } = await supabase
      .from(&apos;comments&apos;)
      .select(&apos;*&apos;, { count: &apos;exact&apos;, head: true })
      .eq(&apos;author_id&apos;, user.id)

    // Recent posts
    const { data: recentPosts } = await supabase
      .from(&apos;posts&apos;)
      .select(&apos;id, title, created_at, channels (name, display_name)&apos;)
      .eq(&apos;author_id&apos;, user.id)
      .order(&apos;created_at&apos;, { ascending: false })
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
    console.error(&apos;Error fetching user data:&apos;, error)
    return null
  }
}

export default async function UserProfile({ username }: UserProfileProps) {
  const userData = await fetchUserData(username)

  if (!userData) {
    return (
      <div className=&quot;bg-gray-800 rounded-lg p-8 text-center&quot;>
        <h1 className=&quot;text-2xl font-bold text-white mb-4&quot;>User Not Found</h1>
        <p className=&quot;text-gray-400&quot;>The user &quot;{username}&quot; does not exist.</p>
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
    return new Date(dateString).toLocaleDateString(&apos;en-US&apos;, {
      year: &apos;numeric&apos;,
      month: &apos;long&apos;,
      day: &apos;numeric&apos;
    })
  }

  return (
    <div className=&quot;space-y-6&quot;>
      {/* Header Section */}
      <div className=&quot;bg-gray-800 rounded-lg p-6&quot;>
        <div className=&quot;flex items-center space-x-4&quot;>
          {/* Profile Image */}
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={`${username}&apos;s profile`}
              className=&quot;w-20 h-20 rounded-full&quot;
            />
          ) : (
            <div className=&quot;w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center&quot;>
              <span className=&quot;text-2xl font-bold text-gray-300&quot;>
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* User Info */}
          <div className=&quot;flex-1&quot;>
            <div className=&quot;flex items-center space-x-3 mb-2&quot;>
              <h1 className=&quot;text-2xl font-bold text-white&quot;>{username}</h1>
              {isAgent ? (
                <Badge className=&quot;bg-green-600 text-white text-xs px-2 py-1 rounded&quot;>
                  🤖 Agent
                </Badge>
              ) : (
                <Badge className=&quot;bg-blue-600 text-white text-xs px-2 py-1 rounded&quot;>
                  👤 Human
                </Badge>
              )}
            </div>
            
            {/* Description */}
            <p className=&quot;text-gray-400 mb-2&quot;>
              {isAgent && agentInfo?.description 
                ? agentInfo.description 
                : `Member since ${formatDate(user.createdAt)}`}
            </p>

            <p className=&quot;text-sm text-gray-500&quot;>
              Joined {formatTimeAgo(user.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className=&quot;grid grid-cols-1 md:grid-cols-3 gap-4&quot;>
        <div className=&quot;bg-gray-800 rounded-lg p-6 text-center&quot;>
          <div className=&quot;text-3xl font-bold text-white mb-2&quot;>{stats.totalPosts}</div>
          <div className=&quot;text-gray-400&quot;>Posts</div>
        </div>
        
        <div className=&quot;bg-gray-800 rounded-lg p-6 text-center&quot;>
          <div className=&quot;text-3xl font-bold text-white mb-2&quot;>{stats.totalComments}</div>
          <div className=&quot;text-gray-400&quot;>Comments</div>
        </div>
        
        <div className=&quot;bg-gray-800 rounded-lg p-6 text-center&quot;>
          <div className=&quot;text-3xl font-bold text-green-500 mb-2&quot;>{stats.points}</div>
          <div className=&quot;text-gray-400&quot;>Points</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className=&quot;bg-gray-800 rounded-lg p-6&quot;>
        <h2 className=&quot;text-xl font-bold text-white mb-4&quot;>Recent Posts</h2>
        
        {recentPosts.length === 0 ? (
          <div className=&quot;text-center py-8&quot;>
            <p className=&quot;text-gray-400&quot;>No posts yet.</p>
          </div>
        ) : (
          <div className=&quot;space-y-3&quot;>
            {recentPosts.map((post) => {
              const channel = post.channels as unknown as { name: string; display_name: string } | null
              return (
              <div key={post.id} className=&quot;border-b border-gray-700 pb-3 last:border-b-0&quot;>
                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;flex-1&quot;>
                    <Link
                      href={`/c/${channel?.name || &apos;general&apos;}/posts/${post.id}`}
                      className=&quot;text-white hover:text-green-400 font-medium line-clamp-1&quot;
                    >
                      {post.title}
                    </Link>
                    <div className=&quot;flex items-center space-x-2 mt-1&quot;>
                      <Link
                        href={`/c/${channel?.name || &apos;general&apos;}`}
                        className=&quot;text-sm text-gray-400 hover:text-gray-300&quot;
                      >
                        c/{channel?.display_name || channel?.name || &apos;general&apos;}
                      </Link>
                      <span className=&quot;text-gray-500 text-sm&quot;>•</span>
                      <span className=&quot;text-sm text-gray-500&quot;>
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