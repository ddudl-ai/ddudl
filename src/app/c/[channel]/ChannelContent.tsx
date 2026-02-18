'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { useSearchParams } from &apos;next/navigation&apos;
import PostCard from &apos;@/components/posts/PostCard&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/components/ui/select&apos;
import { Card, CardContent, CardHeader } from &apos;@/components/ui/card&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Plus, TrendingUp, Clock, BarChart3, Users, X } from &apos;lucide-react&apos;
import { useTranslation } from &apos;@/providers/LocalizationProvider&apos;

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

type SortOption = &apos;hot&apos; | &apos;new&apos; | &apos;top&apos; | &apos;best&apos;

interface ChannelContentProps {
  channelName: string
}

export default function ChannelContent({ channelName }: ChannelContentProps) {
  const searchParams = useSearchParams()
  const urlSort = searchParams.get(&apos;sort&apos;) as SortOption

  const { translateContent, autoTranslate } = useTranslation()
  const [posts, setPosts] = useState<Post[]>([])
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>(urlSort || &apos;hot&apos;)
  const [selectedFlair, setSelectedFlair] = useState<string | null>(null)
  const [translatedChannelName, setTranslatedChannelName] = useState<string | null>(null)
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null)

  // URL에서 flair 파라미터 읽기
  useEffect(() => {
    if (typeof window !== &apos;undefined&apos;) {
      const urlParams = new URLSearchParams(window.location.search)
      const flairParam = urlParams.get(&apos;flair&apos;)
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
      console.error(&apos;Error fetching channel info:&apos;, err)
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
        throw new Error(&apos;Failed to fetch posts&apos;)
      }

      const { posts } = await response.json()
      setPosts(posts || [])
    } catch (err) {
      setError(&apos;Failed to load posts.&apos;)
      console.error(&apos;Error:&apos;, err)
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
        console.error(&apos;Failed to translate community name:&apos;, error)
        return channel.display_name
      })

      const descriptionPromise = channel.description
        ? translateContent(channel.description, { fallback: channel.description }).catch((error) => {
          console.error(&apos;Failed to translate community description:&apos;, error)
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
      case &apos;hot&apos;:
        return <TrendingUp className=&quot;w-4 h-4&quot; />
      case &apos;new&apos;:
        return <Clock className=&quot;w-4 h-4&quot; />
      case &apos;top&apos;:
        return <BarChart3 className=&quot;w-4 h-4&quot; />
      case &apos;best&apos;:
        return <Users className=&quot;w-4 h-4&quot; />
    }
  }

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case &apos;hot&apos;:
        return &apos;Hot&apos;
      case &apos;new&apos;:
        return &apos;New&apos;
      case &apos;top&apos;:
        return &apos;Top&apos;
      case &apos;best&apos;:
        return &apos;Best&apos;
    }
  }

  if (error) {
    return (
      <div className=&quot;bg-white rounded-lg border p-8 text-center&quot;>
        <p className=&quot;text-red-600 mb-4&quot;>{error}</p>
        <Button onClick={() => { fetchChannelInfo(); fetchPosts(); }} variant=&quot;outline&quot;>
          Try Again
        </Button>
      </div>
    )
  }

  const displayChannelName = channel
    ? autoTranslate && translatedChannelName
      ? translatedChannelName
      : channel.display_name
    : &apos;'

  const displayDescription = channel
    ? autoTranslate && translatedDescription
      ? translatedDescription
      : channel.description
    : &apos;'

  return (
    <div className=&quot;space-y-4&quot;>
      {/* 채널 헤더 */}
      {channel && (
        <Card>
          <CardHeader>
            <div className=&quot;flex items-start justify-between&quot;>
              <div>
                <div className=&quot;flex items-center space-x-2&quot;>
                  <h1 className=&quot;text-3xl font-bold&quot;>{displayChannelName}</h1>
                  {channel.is_nsfw && (
                    <Badge variant=&quot;destructive&quot;>NSFW</Badge>
                  )}
                </div>
                <p className=&quot;text-sm text-gray-500 mt-1&quot;>c/{channel.name}</p>
                {channel.description && (
                  <p className=&quot;text-gray-700 mt-2&quot;>{displayDescription}</p>
                )}
              </div>
              <Button className=&quot;flex items-center space-x-2&quot;>
                <Plus className=&quot;w-4 h-4&quot; />
                <span>Join</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className=&quot;flex items-center space-x-4 text-sm text-gray-500&quot;>
              <div className=&quot;flex items-center space-x-1&quot;>
                <Users className=&quot;w-4 h-4&quot; />
                <span>{(channel.member_count || 0).toLocaleString()} members</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 게시물 목록 헤더 */}
      <div className=&quot;bg-white rounded-lg border p-4&quot;>
        <div className=&quot;flex items-center justify-between&quot;>
          <div className=&quot;flex items-center space-x-4&quot;>
            <h2 className=&quot;text-xl font-bold&quot;>Posts</h2>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className=&quot;w-32&quot;>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=&quot;hot&quot;>
                  <div className=&quot;flex items-center space-x-2&quot;>
                    {getSortIcon(&apos;hot&apos;)}
                    <span>{getSortLabel(&apos;hot&apos;)}</span>
                  </div>
                </SelectItem>
                <SelectItem value=&quot;new&quot;>
                  <div className=&quot;flex items-center space-x-2&quot;>
                    {getSortIcon(&apos;new&apos;)}
                    <span>{getSortLabel(&apos;new&apos;)}</span>
                  </div>
                </SelectItem>
                <SelectItem value=&quot;top&quot;>
                  <div className=&quot;flex items-center space-x-2&quot;>
                    {getSortIcon(&apos;top&apos;)}
                    <span>{getSortLabel(&apos;top&apos;)}</span>
                  </div>
                </SelectItem>
                <SelectItem value=&quot;best&quot;>
                  <div className=&quot;flex items-center space-x-2&quot;>
                    {getSortIcon(&apos;best&apos;)}
                    <span>{getSortLabel(&apos;best&apos;)}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className=&quot;flex items-center space-x-2&quot;
            onClick={() => window.location.href = `/c/${channelName}/write`}
          >
            <Plus className=&quot;w-4 h-4&quot; />
            <span>Write Post</span>
          </Button>
        </div>

        {/* 선택된 태그 필터 표시 */}
        {selectedFlair && (
          <div className=&quot;mt-4 pt-4 border-t&quot;>
            <div className=&quot;flex items-center space-x-2&quot;>
              <span className=&quot;text-sm text-gray-600&quot;>Filter:</span>
              <Badge
                variant=&quot;outline&quot;
                className=&quot;flex items-center space-x-2 bg-blue-50 text-blue-700 border-blue-200&quot;
              >
                <span>{selectedFlair}</span>
                <button
                  onClick={clearFlairFilter}
                  className=&quot;hover:bg-blue-100 rounded-full p-0.5&quot;
                >
                  <X className=&quot;w-3 h-3&quot; />
                </button>
              </Badge>
              <span className=&quot;text-xs text-gray-500&quot;>
                Showing posts with &quot;{selectedFlair}&quot; flair only
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className=&quot;space-y-4&quot;>
          {[...Array(5)].map((_, i) => (
            <div key={i} className=&quot;bg-white rounded-lg border p-4 animate-pulse&quot;>
              <div className=&quot;flex space-x-4&quot;>
                <div className=&quot;w-16 h-16 bg-gray-200 rounded&quot;></div>
                <div className=&quot;flex-1 space-y-2&quot;>
                  <div className=&quot;h-4 bg-gray-200 rounded w-3/4&quot;></div>
                  <div className=&quot;h-3 bg-gray-200 rounded w-1/2&quot;></div>
                  <div className=&quot;h-3 bg-gray-200 rounded w-1/4&quot;></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 게시물이 없는 경우 */}
      {!loading && posts.length === 0 && (
        <div className=&quot;bg-white rounded-lg border p-8 text-center&quot;>
          <p className=&quot;text-gray-500 mb-4&quot;>
            No posts in /{channelName} channel yet.
          </p>
          <Button onClick={() => window.location.href = `/c/${channelName}/write`}>
            <Plus className=&quot;w-4 h-4 mr-2&quot; />
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
        <div className=&quot;text-center py-4&quot;>
          <Button variant=&quot;outline&quot; onClick={fetchPosts}>
            Load More Posts
          </Button>
        </div>
      )}
    </div>
  )
}