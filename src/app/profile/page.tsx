'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { useRouter } from &apos;next/navigation&apos;
import Link from &apos;next/link&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { stripHtmlTags } from &apos;@/lib/utils/html&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/components/ui/tabs&apos;
import { Avatar, AvatarFallback, AvatarImage } from &apos;@/components/ui/avatar&apos;
import {
  User,
  Calendar,
  Trophy,
  MessageSquare,
  FileText,
  Settings,
  Edit,
  Mail,
  Shield,
  Coins,
  TrendingUp,
  Award
} from &apos;lucide-react&apos;
import Header from &apos;@/components/layout/Header&apos;
import { formatTokens, calculateUserLevel, getLevelColor } from &apos;@/lib/token/tokenUtils&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;

interface UserProfile {
  id: string
  username: string
  email_hash: string
  karma_points: number
  age_verified: boolean
  is_banned: boolean
  profile_image_url: string | null
  created_at: string
  preferences: any
}

interface Post {
  id: string
  title: string
  channel_id: string
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  flair: string | null
  channels: {
    name: string
    display_name: string
  }
  allow_guest_comments: boolean
}

interface Comment {
  id: string
  content: string
  post_id: string
  upvotes: number
  downvotes: number
  created_at: string
  posts: {
    title: string
    channels: {
      name: string
      display_name: string
    }
  }
}

export default function ProfilePage() {
  const { user, initialize } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(&apos;posts&apos;)
  const router = useRouter()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (user) {
      fetchProfileData()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchProfileData = async () => {
    if (!user) return

    try {
      const username = user.user_metadata?.username
      if (!username) return

      // 프로필 정보 조회
      const profileResponse = await fetch(`/api/users/profile?username=${username}`)
      if (profileResponse.ok) {
        const { user: profileData } = await profileResponse.json()
        setProfile(profileData)

        // User의 게시물 조회
        const postsResponse = await fetch(`/api/users/${profileData.id}/posts`)
        if (postsResponse.ok) {
          const { posts: userPosts } = await postsResponse.json()
          setPosts(userPosts || [])
        }

        // User의 댓글 조회
        const commentsResponse = await fetch(`/api/users/${profileData.id}/comments`)
        if (commentsResponse.ok) {
          const { comments: userComments } = await commentsResponse.json()
          setComments(userComments || [])
        }
      }
    } catch (error) {
      console.error(&apos;Error fetching profile data:&apos;, error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className=&quot;min-h-screen bg-gray-50&quot;>
        <Header />
        <div className=&quot;max-w-4xl mx-auto px-4 py-8&quot;>
          <Card>
            <CardContent className=&quot;pt-6 text-center&quot;>
              <p className=&quot;text-gray-600 mb-4&quot;>Please sign in to view your profile.</p>
              <Button asChild>
                <Link href=&quot;/auth/signin&quot;>Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className=&quot;min-h-screen bg-gray-50&quot;>
        <Header />
        <div className=&quot;max-w-4xl mx-auto px-4 py-8&quot;>
          <div className=&quot;flex justify-center&quot;>
            <LoadingSpinner text=&quot;Loading profile...&quot; />
          </div>
        </div>
      </div>
    )
  }

  const userLevel = profile ? calculateUserLevel(profile.karma_points) : null
  const joinDate = profile ? new Date(profile.created_at).toLocaleDateString(&apos;ko-KR&apos;, {
    year: &apos;numeric&apos;,
    month: &apos;long&apos;,
    day: &apos;numeric&apos;
  }) : &apos;'

  const totalUpvotes = posts.reduce((sum, post) => sum + post.upvotes, 0) +
    comments.reduce((sum, comment) => sum + comment.upvotes, 0)

  return (
    <div className=&quot;min-h-screen bg-gray-50&quot;>
      <Header />

      <div className=&quot;max-w-6xl mx-auto px-4 py-8&quot;>
        {/* 프로필 헤더 */}
        <Card className=&quot;mb-8&quot;>
          <CardContent className=&quot;pt-6&quot;>
            <div className=&quot;flex items-start justify-between&quot;>
              <div className=&quot;flex items-start space-x-4&quot;>
                <Avatar className=&quot;w-20 h-20&quot;>
                  <AvatarImage src={profile?.profile_image_url || &apos;'} />
                  <AvatarFallback className=&quot;text-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white&quot;>
                    {profile?.username?.[0]?.toUpperCase() || &apos;U&apos;}
                  </AvatarFallback>
                </Avatar>

                <div className=&quot;space-y-2&quot;>
                  <div className=&quot;flex items-center space-x-2&quot;>
                    <h1 className=&quot;text-2xl font-bold&quot;>{profile?.username}</h1>
                    {profile?.age_verified && (
                      <Badge variant=&quot;secondary&quot;>
                        <Shield className=&quot;w-3 h-3 mr-1&quot; />
                        Verified
                      </Badge>
                    )}
                    {userLevel && (
                      <Badge
                        style={{
                          backgroundColor: getLevelColor(userLevel.level),
                          color: &apos;white&apos;
                        }}
                      >
                        {userLevel.name}
                      </Badge>
                    )}
                  </div>

                  <div className=&quot;flex items-center space-x-4 text-sm text-gray-600&quot;>
                    <div className=&quot;flex items-center space-x-1&quot;>
                      <Calendar className=&quot;w-4 h-4&quot; />
                      <span>Joined {joinDate}</span>
                    </div>
                    <div className=&quot;flex items-center space-x-1&quot;>
                      <Coins className=&quot;w-4 h-4&quot; />
                      <span>{formatTokens(profile?.karma_points || 0)}</span>
                    </div>
                    <div className=&quot;flex items-center space-x-1&quot;>
                      <Trophy className=&quot;w-4 h-4&quot; />
                      <span>{totalUpvotes} Upvotes</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className=&quot;flex space-x-2&quot;>
                <Button variant=&quot;outline&quot; size=&quot;sm&quot; asChild>
                  <Link href=&quot;/profile/edit&quot;>
                    <Edit className=&quot;w-4 h-4 mr-2&quot; />
                    Edit Profile
                  </Link>
                </Button>
                <Button variant=&quot;outline&quot; size=&quot;sm&quot; asChild>
                  <Link href=&quot;/settings&quot;>
                    <Settings className=&quot;w-4 h-4 mr-2&quot; />
                    Settings
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드 */}
        <div className=&quot;grid grid-cols-1 md:grid-cols-4 gap-4 mb-8&quot;>
          <Card>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium&quot;>Posts</CardTitle>
              <FileText className=&quot;h-4 w-4 text-muted-foreground&quot; />
            </CardHeader>
            <CardContent>
              <div className=&quot;text-2xl font-bold&quot;>{posts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium&quot;>Comments</CardTitle>
              <MessageSquare className=&quot;h-4 w-4 text-muted-foreground&quot; />
            </CardHeader>
            <CardContent>
              <div className=&quot;text-2xl font-bold&quot;>{comments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium&quot;>Total Upvotes</CardTitle>
              <TrendingUp className=&quot;h-4 w-4 text-muted-foreground&quot; />
            </CardHeader>
            <CardContent>
              <div className=&quot;text-2xl font-bold&quot;>{totalUpvotes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium&quot;>Tokens</CardTitle>
              <Coins className=&quot;h-4 w-4 text-muted-foreground&quot; />
            </CardHeader>
            <CardContent>
              <div className=&quot;text-2xl font-bold&quot;>
                {formatTokens(profile?.karma_points || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 활동 내역 탭 */}
        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
            <CardDescription>
              View your posts and comments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className=&quot;grid w-full grid-cols-2&quot;>
                <TabsTrigger value=&quot;posts&quot;>
                  Posts ({posts.length})
                </TabsTrigger>
                <TabsTrigger value=&quot;comments&quot;>
                  Comments ({comments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value=&quot;posts&quot; className=&quot;space-y-4&quot;>
                {posts.length === 0 ? (
                  <div className=&quot;text-center py-8 text-gray-500&quot;>
                    No posts yet.
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className=&quot;border-b pb-4&quot;>
                      <Link
                        href={`/c/${post.channels.name}/posts/${post.id}`}
                        className=&quot;hover:text-blue-600&quot;
                      >
                        <h3 className=&quot;font-medium mb-1&quot;>{post.title}</h3>
                      </Link>
                      <div className=&quot;flex items-center space-x-4 text-sm text-gray-500&quot;>
                        <span>c/{post.channels.name}</span>
                        {post.flair && (
                          <Badge variant=&quot;outline&quot; className=&quot;text-xs&quot;>
                            {post.flair}
                          </Badge>
                        )}
                        <span>👍 {post.upvotes}</span>
                        <span>💬 {post.comment_count}</span>
                        <span>
                          {new Date(post.created_at).toLocaleDateString(&apos;ko-KR&apos;)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value=&quot;comments&quot; className=&quot;space-y-4&quot;>
                {comments.length === 0 ? (
                  <div className=&quot;text-center py-8 text-gray-500&quot;>
                    No comments yet.
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className=&quot;border-b pb-4&quot;>
                      <Link
                        href={`/c/${comment.posts.channels.name}/posts/${comment.post_id}`}
                        className=&quot;text-sm text-gray-600 hover:text-blue-600&quot;
                      >
                        Post: {comment.posts.title}
                      </Link>
                      <p className=&quot;mt-1 text-gray-800&quot;>{stripHtmlTags(comment.content)}</p>
                      <div className=&quot;flex items-center space-x-4 text-sm text-gray-500 mt-2&quot;>
                        <span>c/{comment.posts.channels.name}</span>
                        <span>👍 {comment.upvotes}</span>
                        <span>
                          {new Date(comment.created_at).toLocaleDateString(&apos;ko-KR&apos;)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}