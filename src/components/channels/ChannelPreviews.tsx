'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import Link from &apos;next/link&apos;
import { createClient } from &apos;@/lib/supabase/client&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { MessageCircle, TrendingUp } from &apos;lucide-react&apos;

interface ChannelPreview {
  id: string
  name: string
  display_name: string
  posts: {
    id: string
    title: string
    vote_score: number
    comment_count: number
    created_at: string
  }[]
}

const CHANNELS = [
  &apos;tech&apos;, &apos;daily&apos;, &apos;questions&apos;, &apos;general&apos;, 
  &apos;debates&apos;, &apos;creative&apos;, &apos;ai-thoughts&apos;, &apos;code-review&apos;
]

export default function ChannelPreviews() {
  const [channels, setChannels] = useState<ChannelPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChannelPreviews()
  }, [])

  async function fetchChannelPreviews() {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      // 채널 정보와 각 채널의 최신 포스트 2개 가져오기
      const channelPromises = CHANNELS.map(async (channelName) => {
        // 채널 정보 가져오기
        const { data: channel, error: channelError } = await supabase
          .from(&apos;channels&apos;)
          .select(&apos;id, name, display_name&apos;)
          .eq(&apos;name&apos;, channelName)
          .single()

        if (channelError || !channel) {
          return null
        }

        // 해당 채널의 최신 포스트 2개 가져오기
        const { data: posts, error: postsError } = await supabase
          .from(&apos;posts&apos;)
          .select(&apos;id, title, vote_score, comment_count, created_at&apos;)
          .eq(&apos;channel_id&apos;, channel.id)
          .eq(&apos;moderation_status&apos;, &apos;approved&apos;)
          .or(&apos;is_deleted.is.null,is_deleted.eq.false&apos;)
          .order(&apos;created_at&apos;, { ascending: false })
          .limit(2)

        if (postsError) {
          console.error(`Error fetching posts for ${channelName}:`, postsError)
          return {
            ...channel,
            posts: []
          }
        }

        return {
          ...channel,
          posts: posts || []
        }
      })

      const channelResults = await Promise.all(channelPromises)
      const validChannels = channelResults.filter((channel): channel is ChannelPreview => channel !== null)
      
      setChannels(validChannels)
    } catch (err) {
      setError(&apos;Failed to load channel previews&apos;)
      console.error(&apos;Error:&apos;, err)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return &apos;just now&apos;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      return `${Math.floor(diffInHours / 24)}d`
    }
  }

  if (loading) {
    return (
      <Card className=&quot;bg-slate-900 border-slate-800&quot;>
        <CardHeader>
          <CardTitle className=&quot;text-slate-100 flex items-center gap-2&quot;>
            <TrendingUp className=&quot;w-5 h-5&quot; />
            Channel Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className=&quot;flex justify-center p-8&quot;>
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className=&quot;bg-slate-900 border-slate-800&quot;>
        <CardContent className=&quot;p-6&quot;>
          <p className=&quot;text-slate-400 text-center&quot;>{error}</p>
          <div className=&quot;text-center mt-4&quot;>
            <Button 
              onClick={fetchChannelPreviews} 
              variant=&quot;outline&quot; 
              className=&quot;border-slate-700 text-slate-300 hover:bg-slate-800&quot;
              size=&quot;sm&quot;
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className=&quot;bg-slate-900 border-slate-800&quot;>
      <CardHeader>
        <CardTitle className=&quot;text-slate-100 flex items-center gap-2&quot;>
          <TrendingUp className=&quot;w-5 h-5&quot; />
          Channel Activity
        </CardTitle>
      </CardHeader>
      <CardContent className=&quot;space-y-4&quot;>
        {channels.map((channel) => (
          <div key={channel.id} className=&quot;space-y-2&quot;>
            <div className=&quot;flex items-center justify-between&quot;>
              <Link 
                href={`/c/${channel.name}`}
                className=&quot;font-medium text-emerald-400 hover:text-emerald-300 transition-colors&quot;
              >
                {channel.display_name}
              </Link>
              <span className=&quot;text-xs text-slate-500&quot;>
                {channel.posts.length} recent
              </span>
            </div>
            
            {channel.posts.length === 0 ? (
              <p className=&quot;text-xs text-slate-500 pl-2&quot;>No recent posts</p>
            ) : (
              <div className=&quot;space-y-1 pl-2&quot;>
                {channel.posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/c/${channel.name}/${post.id}`}
                    className=&quot;block group&quot;
                  >
                    <div className=&quot;text-sm text-slate-300 group-hover:text-slate-100 transition-colors line-clamp-1&quot;>
                      {post.title}
                    </div>
                    <div className=&quot;flex items-center gap-3 text-xs text-slate-500 mt-1&quot;>
                      <span className=&quot;flex items-center gap-1&quot;>
                        <TrendingUp className=&quot;w-3 h-3&quot; />
                        {post.vote_score || 0}
                      </span>
                      <span className=&quot;flex items-center gap-1&quot;>
                        <MessageCircle className=&quot;w-3 h-3&quot; />
                        {post.comment_count || 0}
                      </span>
                      <span>{formatTimeAgo(post.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        
        <div className=&quot;pt-2 border-t border-slate-800&quot;>
          <Link href=&quot;/c&quot;>
            <Button 
              variant=&quot;ghost&quot; 
              size=&quot;sm&quot; 
              className=&quot;w-full text-slate-400 hover:text-slate-300 hover:bg-slate-800&quot;
            >
              View All Channels
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}