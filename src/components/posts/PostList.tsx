'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PostCard from './PostCard'
import { createClient } from '@/lib/supabase/client'
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
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL 쿼리 파라미터에서 정렬 옵션 가져오기
  const sortBy = (searchParams.get('sort') as SortOption) || 'hot'

  useEffect(() => {
    fetchPosts()
  }, [sortBy, timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPosts() {
    try {
      setLoading(true)
      setErrorKey(null)

      const supabase = createClient()
      
      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          content,
          author_id,
          author_name,
          channel_id,
          created_at,
          updated_at,
          flair,
          vote_score,
          comment_count,
          ai_generated,
          allow_guest_comments,
          channels!posts_channel_id_fkey (
            name,
            display_name
          ),
          users (
            username
          )
        `)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .eq('moderation_status', 'approved')
        .limit(20)

      // 시간 범위 필터링 (Top 정렬일 때만)
      if (sortBy === 'top' && timeRange !== 'all') {
        const now = new Date()
        let cutoffDate = new Date()
        
        switch (timeRange) {
          case 'day':
            cutoffDate.setDate(now.getDate() - 1)
            break
          case 'week':
            cutoffDate.setDate(now.getDate() - 7)
            break
          case 'month':
            cutoffDate.setMonth(now.getMonth() - 1)
            break
        }
        
        query = query.gte('created_at', cutoffDate.toISOString())
      }

      // 정렬 (Hot은 클라이언트에서 처리)
      if (sortBy === 'top') {
        query = query.order('vote_score', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      let processedPosts = data || []

      // Hot 정렬 처리
      if (sortBy === 'hot') {
        const now = Date.now()
        processedPosts = processedPosts.sort((a, b) => {
          const scoreA = a.vote_score || 0
          const scoreB = b.vote_score || 0
          const hoursA = (now - new Date(a.created_at).getTime()) / 3600000
          const hoursB = (now - new Date(b.created_at).getTime()) / 3600000
          const hotA = scoreA / Math.pow(hoursA + 2, 1.5)
          const hotB = scoreB / Math.pow(hoursB + 2, 1.5)
          return hotB - hotA
        })
      }

      // 데이터 변환 (기존 구조와 호환되도록)
      const transformedPosts = processedPosts.map(post => {
        // channels 처리
        const channels = post.channels
        let channelInfo = { name: '', display_name: '' }
        
        if (Array.isArray(channels) && channels.length > 0) {
          channelInfo = {
            name: channels[0].name || '',
            display_name: channels[0].display_name || ''
          }
        } else if (channels && typeof channels === 'object') {
          channelInfo = {
            name: (channels as any).name || '',
            display_name: (channels as any).display_name || ''
          }
        }

        // users 처리
        const users = post.users
        let userInfo = null
        if (Array.isArray(users) && users.length > 0) {
          userInfo = {
            username: users[0].username || ''
          }
        } else if (users && typeof users === 'object') {
          userInfo = {
            username: (users as any).username || ''
          }
        }

        return {
          id: post.id,
          title: post.title,
          content: post.content,
          author_id: post.author_id,
          channel_id: post.channel_id,
          upvotes: Math.max(0, post.vote_score || 0),
          downvotes: 0,
          comment_count: post.comment_count || 0,
          created_at: post.created_at,
          updated_at: post.updated_at,
          flair: post.flair,
          ai_generated: post.ai_generated ?? false,
          allow_guest_comments: post.allow_guest_comments ?? true,
          channels: channelInfo,
          users: userInfo
        } as Post
      })

      setPosts(transformedPosts)
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

  const handleSortChange = (newSort: SortOption) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', newSort)
    router.push(`/?${params.toString()}`)
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
              <Select value={sortBy} onValueChange={handleSortChange}>
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
