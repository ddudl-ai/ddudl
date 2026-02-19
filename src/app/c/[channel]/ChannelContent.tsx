'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PostCard from '@/components/posts/PostCard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, TrendingUp, Clock, BarChart3, Users, X } from 'lucide-react'
import { useTranslation } from '@/providers/LocalizationProvider'

interface Post {
  id: string
  title: string
  content: string | null
  author_id: string
  channel_id: string
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  updated_at: string
  flair: string | null
  ai_generated: boolean
  allow_guest_comments: boolean
  channels: {
    name: string
    display_name: string
  }
  users: {
    username: string
  } | null
}

interface Channel {
  id: string
  name: string
  display_name: string
  description: string
  member_count: number
  is_nsfw: boolean
}

type SortOption = 'hot' | 'new' | 'top' | 'best'

interface ChannelContentProps {
  channelName: string
}

export default function ChannelContent({ channelName }: ChannelContentProps) {
  const searchParams = useSearchParams()
  const urlSort = searchParams.get('sort') as SortOption

  const { translateContent, autoTranslate } = useTranslation()
  const [posts, setPosts] = useState<Post[]>([])
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>(urlSort || 'hot')
  const [selectedFlair, setSelectedFlair] = useState<string | null>(null)
  const [translatedChannelName, setTranslatedChannelName] = useState<string | null>(null)
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null)

  // URL에서 flair 파라미터 읽기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const flairParam = urlParams.get('flair')
      if (flairParam) {
        setSelectedFlair(flairParam)
      }
    }
  }, [])

  useEffect(() => {
    fetchChannelInfo()
    fetchPosts()
  }, [channelName, sortBy, selectedFlair]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchChannelInfo() {
    try {
      const response = await fetch(`/api/channels`)
      const { channels } = await response.json()

      const foundChannel = channels.find((s: Channel) => s.name === channelName)
      setChannel(foundChannel || null)
    } catch (err) {
      console.error('Error fetching channel info:', err)
    }
  }

  async function fetchPosts() {
    try {
      setLoading(true)

      let url = `/api/posts?sort=${sortBy}&limit=20&channel=${channelName}`
      if (selectedFlair) {
        url += `&flair=${encodeURIComponent(selectedFlair)}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      const { posts } = await response.json()
      setPosts(posts || [])
    } catch (err) {
      setError('Failed to load posts.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!channel) {
      setTranslatedChannelName(null)
      setTranslatedDescription(null)
      return
    }

    if (!autoTranslate) {
      setTranslatedChannelName(null)
      setTranslatedDescription(null)
      return
    }

    let isCancelled = false

    const translateChannelInfo = async () => {
      const namePromise = translateContent(channel.display_name, {
        fallback: channel.display_name
      }).catch((error) => {
        console.error('Failed to translate community name:', error)
        return channel.display_name
      })

      const descriptionPromise = channel.description
        ? translateContent(channel.description, { fallback: channel.description }).catch((error) => {
          console.error('Failed to translate community description:', error)
          return channel.description
        })
        : Promise.resolve<string | null>(null)

      const [nameResult, descriptionResult] = await Promise.all([namePromise, descriptionPromise])

      if (isCancelled) {
        return
      }

      setTranslatedChannelName(nameResult)
      setTranslatedDescription(
        channel.description ? (descriptionResult ?? channel.description) : null
      )
    }

    translateChannelInfo()

    return () => {
      isCancelled = true
    }
  }, [channel, autoTranslate, translateContent])


  const clearFlairFilter = () => {
    setSelectedFlair(null)
  }

  const getSortIcon = (sort: SortOption) => {
    switch (sort) {
      case 'hot':
        return <TrendingUp className="w-4 h-4" />
      case 'new':
        return <Clock className="w-4 h-4" />
      case 'top':
        return <BarChart3 className="w-4 h-4" />
      case 'best':
        return <Users className="w-4 h-4" />
    }
  }

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'hot':
        return 'Hot'
      case 'new':
        return 'New'
      case 'top':
        return 'Top'
      case 'best':
        return 'Best'
    }
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => { fetchChannelInfo(); fetchPosts(); }} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  const displayChannelName = channel
    ? autoTranslate && translatedChannelName
      ? translatedChannelName
      : channel.display_name
    : ''

  const displayDescription = channel
    ? autoTranslate && translatedDescription
      ? translatedDescription
      : channel.description
    : ''

  return (
    <div className="space-y-4">
      {/* 채널 헤더 */}
      {channel && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-3xl font-bold">{displayChannelName}</h1>
                  {channel.is_nsfw && (
                    <Badge variant="destructive">NSFW</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">c/{channel.name}</p>
                {channel.description && (
                  <p className="text-gray-700 mt-2">{displayDescription}</p>
                )}
              </div>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Join</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{(channel.member_count || 0).toLocaleString()} members</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 게시물 목록 헤더 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold">Posts</h2>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">
                  <div className="flex items-center space-x-2">
                    {getSortIcon('hot')}
                    <span>{getSortLabel('hot')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="new">
                  <div className="flex items-center space-x-2">
                    {getSortIcon('new')}
                    <span>{getSortLabel('new')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="top">
                  <div className="flex items-center space-x-2">
                    {getSortIcon('top')}
                    <span>{getSortLabel('top')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="best">
                  <div className="flex items-center space-x-2">
                    {getSortIcon('best')}
                    <span>{getSortLabel('best')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="flex items-center space-x-2"
            onClick={() => window.location.href = `/c/${channelName}/write`}
          >
            <Plus className="w-4 h-4" />
            <span>Write Post</span>
          </Button>
        </div>

        {/* 선택된 태그 필터 표시 */}
        {selectedFlair && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filter:</span>
              <Badge
                variant="outline"
                className="flex items-center space-x-2 bg-blue-50 text-blue-700 border-blue-200"
              >
                <span>{selectedFlair}</span>
                <button
                  onClick={clearFlairFilter}
                  className="hover:bg-blue-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
              <span className="text-xs text-gray-500">
                Showing posts with "{selectedFlair}" flair only
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="flex space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 게시물이 없는 경우 */}
      {!loading && posts.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <p className="text-gray-500 mb-4">
            No posts in /{channelName} channel yet.
          </p>
          <Button onClick={() => window.location.href = `/c/${channelName}/write`}>
            <Plus className="w-4 h-4 mr-2" />
            Write the First Post
          </Button>
        </div>
      )}

      {/* 게시물 목록 */}
      {!loading && posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Load More */}
      {!loading && posts.length > 0 && (
        <div className="text-center py-4">
          <Button variant="outline" onClick={fetchPosts}>
            Load More Posts
          </Button>
        </div>
      )}
    </div>
  )
}