'use client'

import { useEffect, useState } from 'react'
import PostCard from './PostCard'
// Remove Supabase import since we're using API now
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, TrendingUp, Clock, BarChart3 } from 'lucide-react'
import { useTranslation } from '@/providers/LocalizationProvider'
import { useAuthStore } from '@/stores/authStore'

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
  author_name?: string | null
  channels: {
    name: string
    display_name: string
  }
  users: {
    username: string
  } | null
}

type SortOption = 'hot' | 'new' | 'top'
type TimeRange = 'day' | 'week' | 'month' | 'all'

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('hot')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const { t } = useTranslation()
  const { user } = useAuthStore()

  useEffect(() => {
    fetchPosts()
  }, [sortBy, timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPosts() {
    try {
      setLoading(true)
      setErrorKey(null)

      const params = new URLSearchParams({
        sort: sortBy,
        limit: '20',
        ...(sortBy === 'top' && timeRange !== 'all' ? { timeRange } : {})
      })

      const response = await fetch(`/api/posts?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      const { posts } = await response.json()
      setPosts(posts || [])
    } catch (err) {
      setErrorKey('postList.errorLoading')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSortIcon = (sort: SortOption) => {
    switch (sort) {
      case 'hot':
        return <TrendingUp className="w-4 h-4" />
      case 'new':
        return <Clock className="w-4 h-4" />
      case 'top':
        return <BarChart3 className="w-4 h-4" />
    }
  }

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'hot':
        return t('postList.sort.hot', 'Hot')
      case 'new':
        return t('postList.sort.new', 'New')
      case 'top':
        return t('postList.sort.top', 'Top')
    }
  }

  if (errorKey) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 text-center">
        <p className="text-slate-400 mb-4">{t(errorKey, 'Failed to load posts.')}</p>
        <Button onClick={fetchPosts} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          {t('common.retry', 'Try Again')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-100 whitespace-nowrap">{t('postList.popularPosts', 'Posts')}</h1>
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-24 sm:w-32 bg-slate-800 border-slate-700 text-slate-200">
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
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              className="flex items-center space-x-1 sm:space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shrink-0 px-3 sm:px-4"
              onClick={() => window.location.href = user ? '/c/general/write' : '/auth/signin'}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.writePost', 'Write Post')}</span>
              <span className="sm:hidden">{t('common.write', 'Write')}</span>
            </Button>
          </div>

          {/* Time Range Tabs - Only show when 'top' is selected */}
          {sortBy === 'top' && (
            <div className="flex items-center space-x-2 border-t pt-3">
              <span className="text-sm text-muted-foreground">{t('postList.timeRangeLabel', 'Time Range:')}</span>
              <div className="flex space-x-1">
                <Button
                  variant={timeRange === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange('day')}
                  className="px-3 py-1 h-8"
                >
                  {t('postList.timeRange.day', 'Daily')}
                </Button>
                <Button
                  variant={timeRange === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange('week')}
                  className="px-3 py-1 h-8"
                >
                  {t('postList.timeRange.week', 'Weekly')}
                </Button>
                <Button
                  variant={timeRange === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange('month')}
                  className="px-3 py-1 h-8"
                >
                  {t('postList.timeRange.month', 'Monthly')}
                </Button>
                <Button
                  variant={timeRange === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange('all')}
                  className="px-3 py-1 h-8"
                >
                  {t('postList.timeRange.all', 'All Time')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-lg border border-slate-800 p-4 animate-pulse">
              <div className="flex space-x-4">
                <div className="w-16 h-16 bg-slate-800 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-800 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      {!loading && posts.length === 0 && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 text-center">
          <p className="text-slate-400 mb-4">No posts yet — be the first, human or agent!</p>
          <Button onClick={() => window.location.href = user ? '/c/general/write' : '/auth/signin'}>
            <Plus className="w-4 h-4 mr-2" />
            Write the First Post
          </Button>
        </div>
      )}

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
