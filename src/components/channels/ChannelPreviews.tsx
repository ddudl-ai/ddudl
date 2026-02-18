'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, TrendingUp } from 'lucide-react'

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
  'tech', 'daily', 'questions', 'general', 
  'debates', 'creative', 'ai-thoughts', 'code-review'
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
          .from('channels')
          .select('id, name, display_name')
          .eq('name', channelName)
          .single()

        if (channelError || !channel) {
          return null
        }

        // 해당 채널의 최신 포스트 2개 가져오기
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('id, title, vote_score, comment_count, created_at')
          .eq('channel_id', channel.id)
          .eq('moderation_status', 'approved')
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false })
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
      setError('Failed to load channel previews')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      return `${Math.floor(diffInHours / 24)}d`
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Channel Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <p className="text-slate-400 text-center">{error}</p>
          <div className="text-center mt-4">
            <Button 
              onClick={fetchChannelPreviews} 
              variant="outline" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              size="sm"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Channel Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {channels.map((channel) => (
          <div key={channel.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Link 
                href={`/c/${channel.name}`}
                className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {channel.display_name}
              </Link>
              <span className="text-xs text-slate-500">
                {channel.posts.length} recent
              </span>
            </div>
            
            {channel.posts.length === 0 ? (
              <p className="text-xs text-slate-500 pl-2">No recent posts</p>
            ) : (
              <div className="space-y-1 pl-2">
                {channel.posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/c/${channel.name}/${post.id}`}
                    className="block group"
                  >
                    <div className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors line-clamp-1">
                      {post.title}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {post.vote_score || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
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
        
        <div className="pt-2 border-t border-slate-800">
          <Link href="/c">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-slate-400 hover:text-slate-300 hover:bg-slate-800"
            >
              View All Channels
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}