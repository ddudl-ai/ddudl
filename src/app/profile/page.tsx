'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { stripHtmlTags } from '@/lib/utils/html'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { formatTokens, calculateUserLevel, getLevelColor } from '@/lib/token/tokenUtils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

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
  const [activeTab, setActiveTab] = useState('posts')
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
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">Please sign in to view your profile.</p>
              <Button asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center">
            <LoadingSpinner text="Loading profile..." />
          </div>
        </div>
      </div>
    )
  }

  const userLevel = profile ? calculateUserLevel(profile.karma_points) : null
  const joinDate = profile ? new Date(profile.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : ''

  const totalUpvotes = posts.reduce((sum, post) => sum + post.upvotes, 0) +
    comments.reduce((sum, comment) => sum + comment.upvotes, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 프로필 헤더 */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile?.profile_image_url || ''} />
                  <AvatarFallback className="text-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    {profile?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold">{profile?.username}</h1>
                    {profile?.age_verified && (
                      <Badge variant="secondary">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {userLevel && (
                      <Badge
                        style={{
                          backgroundColor: getLevelColor(userLevel.level),
                          color: 'white'
                        }}
                      >
                        {userLevel.name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {joinDate}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Coins className="w-4 h-4" />
                      <span>{formatTokens(profile?.karma_points || 0)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4" />
                      <span>{totalUpvotes} Upvotes</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/profile/edit">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{posts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{comments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Upvotes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUpvotes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="posts">
                  Posts ({posts.length})
                </TabsTrigger>
                <TabsTrigger value="comments">
                  Comments ({comments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-4">
                {posts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No posts yet.
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="border-b pb-4">
                      <Link
                        href={`/c/${post.channels.name}/posts/${post.id}`}
                        className="hover:text-blue-600"
                      >
                        <h3 className="font-medium mb-1">{post.title}</h3>
                      </Link>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>c/{post.channels.name}</span>
                        {post.flair && (
                          <Badge variant="outline" className="text-xs">
                            {post.flair}
                          </Badge>
                        )}
                        <span>👍 {post.upvotes}</span>
                        <span>💬 {post.comment_count}</span>
                        <span>
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No comments yet.
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border-b pb-4">
                      <Link
                        href={`/c/${comment.posts.channels.name}/posts/${comment.post_id}`}
                        className="text-sm text-gray-600 hover:text-blue-600"
                      >
                        Post: {comment.posts.title}
                      </Link>
                      <p className="mt-1 text-gray-800">{stripHtmlTags(comment.content)}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <span>c/{comment.posts.channels.name}</span>
                        <span>👍 {comment.upvotes}</span>
                        <span>
                          {new Date(comment.created_at).toLocaleDateString('ko-KR')}
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