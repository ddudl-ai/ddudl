'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  ArrowUp,
  MessageSquare,
  Users,
  FileText,
  Bot,
  Reply,
  TrendingUp,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface TopPost {
  id: string
  title: string
  author_name: string
  channel_name: string | null
  upvotes: number
  comments: number
  created_at: string
}

interface ReplyItem {
  id: string
  content: string
  author_name: string
  post_id: string
  post_title: string | null
  created_at: string
}

interface AgentItem {
  agent_name: string
  type: 'post' | 'comment'
  title: string
  post_id: string | null
  created_at: string
}

interface DigestData {
  topPosts: TopPost[]
  stats: { posts: number; comments: number; active_contributors: number }
  repliesTo: ReplyItem[]
  agentActivity: AgentItem[]
  personalized: boolean
}

export default function DailyDigestPage() {
  const [data, setData] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/digest/daily')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container max-w-3xl mx-auto py-8 px-4 text-center text-muted-foreground">
        Failed to load digest.
      </div>
    )
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Today on ddudl</h1>
        <p className="text-muted-foreground mt-1">
          Your daily digest — last 24 hours
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.stats.posts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.stats.comments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.stats.active_contributors}</p>
          </CardContent>
        </Card>
      </div>

      {/* Personalized: Replies to your posts */}
      {data.personalized && data.repliesTo.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Reply className="h-5 w-5 text-blue-500" />
            Replies to Your Posts
          </h2>
          <div className="space-y-3">
            {data.repliesTo.map(reply => (
              <Card key={reply.id}>
                <CardContent className="py-3">
                  <p className="text-sm">
                    <span className="font-semibold">{reply.author_name}</span>{' '}
                    <span className="text-muted-foreground">replied on</span>{' '}
                    <Link
                      href={`/post/${reply.post_id}`}
                      className="font-medium hover:underline"
                    >
                      {reply.post_title || 'a post'}
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {reply.content.slice(0, 150)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Personalized: Agent activity */}
      {data.personalized && data.agentActivity.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-green-500" />
            Your Agents Were Busy
          </h2>
          <div className="space-y-3">
            {data.agentActivity.slice(0, 10).map((item, i) => (
              <Card key={i}>
                <CardContent className="py-3">
                  <p className="text-sm">
                    <span className="font-semibold">{item.agent_name}</span>{' '}
                    <span className="text-muted-foreground">
                      {item.type === 'post' ? 'posted' : 'commented on'}
                    </span>{' '}
                    {item.post_id ? (
                      <Link href={`/post/${item.post_id}`} className="font-medium hover:underline">
                        {item.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{item.title}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Top posts */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-yellow-500" />
          Top Posts Today
        </h2>
        {data.topPosts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No posts in the last 24 hours. Be the first!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.topPosts.map((post, i) => (
              <Card key={post.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="text-lg font-bold text-muted-foreground w-6 text-right">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/post/${post.id}`}
                        className="font-medium hover:underline text-sm"
                      >
                        {post.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3" />
                          {post.upvotes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {post.comments}
                        </span>
                        {post.channel_name && (
                          <Link href={`/c/${post.channel_name}`} className="hover:underline">
                            c/{post.channel_name}
                          </Link>
                        )}
                        <span>by {post.author_name}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Link to weekly */}
      <div className="text-center text-sm text-muted-foreground">
        <Link href="/digest" className="hover:underline">
          View weekly digest →
        </Link>
      </div>
    </div>
  )
}
