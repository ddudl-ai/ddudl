'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { useRouter, useSearchParams } from &apos;next/navigation&apos;
import PostCard from &apos;./PostCard&apos;
import { createClient } from &apos;@/lib/supabase/client&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/components/ui/select&apos;
import { Plus, TrendingUp, Clock, BarChart3 } from &apos;lucide-react&apos;
import { useTranslation } from &apos;@/providers/LocalizationProvider&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;

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

type SortOption = &apos;hot&apos; | &apos;new&apos; | &apos;top&apos;
type TimeRange = &apos;day&apos; | &apos;week&apos; | &apos;month&apos; | &apos;all&apos;

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>(&apos;all&apos;)
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL 쿼리 파라미터에서 정렬 옵션 가져오기
  const sortBy = (searchParams.get(&apos;sort&apos;) as SortOption) || &apos;hot&apos;

  useEffect(() => {
    fetchPosts()
  }, [sortBy, timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPosts() {
    try {
      setLoading(true)
      setErrorKey(null)

      const supabase = createClient()
      
      let query = supabase
        .from(&apos;posts&apos;)
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
        .or(&apos;is_deleted.is.null,is_deleted.eq.false&apos;)
        .eq(&apos;moderation_status&apos;, &apos;approved&apos;)
        .limit(20)

      // 시간 범위 필터링 (Top 정렬일 때만)
      if (sortBy === &apos;top&apos; && timeRange !== &apos;all&apos;) {
        const now = new Date()
        const cutoffDate = new Date()
        
        switch (timeRange) {
          case &apos;day&apos;:
            cutoffDate.setDate(now.getDate() - 1)
            break
          case &apos;week&apos;:
            cutoffDate.setDate(now.getDate() - 7)
            break
          case &apos;month&apos;:
            cutoffDate.setMonth(now.getMonth() - 1)
            break
        }
        
        query = query.gte(&apos;created_at&apos;, cutoffDate.toISOString())
      }

      // 정렬 (Hot은 클라이언트에서 처리)
      if (sortBy === &apos;top&apos;) {
        query = query.order(&apos;vote_score&apos;, { ascending: false })
      } else {
        query = query.order(&apos;created_at&apos;, { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      let processedPosts = data || []

      // Hot 정렬 처리
      if (sortBy === &apos;hot&apos;) {
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
        let channelInfo = { name: &apos;', display_name: &apos;' }
        
        if (Array.isArray(channels) && channels.length > 0) {
          channelInfo = {
            name: channels[0].name || &apos;',
            display_name: channels[0].display_name || &apos;'
          }
        } else if (channels && typeof channels === &apos;object&apos;) {
          channelInfo = {
            name: (channels as any).name || &apos;',
            display_name: (channels as any).display_name || &apos;'
          }
        }

        // users 처리
        const users = post.users
        let userInfo = null
        if (Array.isArray(users) && users.length > 0) {
          userInfo = {
            username: users[0].username || &apos;'
          }
        } else if (users && typeof users === &apos;object&apos;) {
          userInfo = {
            username: (users as any).username || &apos;'
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
      setErrorKey(&apos;postList.errorLoading&apos;)
      console.error(&apos;Error:&apos;, err)
    } finally {
      setLoading(false)
    }
  }

  const getSortIcon = (sort: SortOption) => {
    switch (sort) {
      case &apos;hot&apos;:
        return <TrendingUp className=&quot;w-4 h-4&quot; />
      case &apos;new&apos;:
        return <Clock className=&quot;w-4 h-4&quot; />
      case &apos;top&apos;:
        return <BarChart3 className=&quot;w-4 h-4&quot; />
    }
  }

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case &apos;hot&apos;:
        return t(&apos;postList.sort.hot&apos;, &apos;Hot&apos;)
      case &apos;new&apos;:
        return t(&apos;postList.sort.new&apos;, &apos;New&apos;)
      case &apos;top&apos;:
        return t(&apos;postList.sort.top&apos;, &apos;Top&apos;)
    }
  }

  const handleSortChange = (newSort: SortOption) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(&apos;sort&apos;, newSort)
    router.push(`/?${params.toString()}`)
  }

  if (errorKey) {
    return (
      <div className=&quot;bg-slate-900 rounded-lg border border-slate-800 p-8 text-center&quot;>
        <p className=&quot;text-slate-400 mb-4&quot;>{t(errorKey, &apos;Failed to load posts.&apos;)}</p>
        <Button onClick={fetchPosts} variant=&quot;outline&quot; className=&quot;border-slate-700 text-slate-300 hover:bg-slate-800&quot;>
          {t(&apos;common.retry&apos;, &apos;Try Again&apos;)}
        </Button>
      </div>
    )
  }

  return (
    <div className=&quot;space-y-4&quot;>
      {/* Header */}
      <div className=&quot;bg-slate-900 rounded-lg border border-slate-800 p-4&quot;>
        <div className=&quot;flex flex-col space-y-3&quot;>
          <div className=&quot;flex items-center justify-between gap-2&quot;>
            <div className=&quot;flex items-center gap-2 min-w-0&quot;>
              <h1 className=&quot;text-lg sm:text-xl font-bold text-slate-100 whitespace-nowrap&quot;>{t(&apos;postList.popularPosts&apos;, &apos;Posts&apos;)}</h1>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className=&quot;w-24 sm:w-32 bg-slate-800 border-slate-700 text-slate-200&quot;>
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
                </SelectContent>
              </Select>
            </div>

            <Button
              variant=&quot;outline&quot;
              className=&quot;flex items-center space-x-1 sm:space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shrink-0 px-3 sm:px-4&quot;
              onClick={() => window.location.href = user ? &apos;/c/general/write&apos; : &apos;/auth/signin&apos;}
            >
              <Plus className=&quot;w-4 h-4&quot; />
              <span className=&quot;hidden sm:inline&quot;>{t(&apos;common.writePost&apos;, &apos;Write Post&apos;)}</span>
              <span className=&quot;sm:hidden&quot;>{t(&apos;common.write&apos;, &apos;Write&apos;)}</span>
            </Button>
          </div>

          {/* Time Range Tabs - Only show when &apos;top&apos; is selected */}
          {sortBy === &apos;top&apos; && (
            <div className=&quot;flex items-center space-x-2 border-t pt-3&quot;>
              <span className=&quot;text-sm text-muted-foreground&quot;>{t(&apos;postList.timeRangeLabel&apos;, &apos;Time Range:&apos;)}</span>
              <div className=&quot;flex space-x-1&quot;>
                <Button
                  variant={timeRange === &apos;day&apos; ? &apos;default&apos; : &apos;ghost&apos;}
                  size=&quot;sm&quot;
                  onClick={() => setTimeRange(&apos;day&apos;)}
                  className=&quot;px-3 py-1 h-8&quot;
                >
                  {t(&apos;postList.timeRange.day&apos;, &apos;Daily&apos;)}
                </Button>
                <Button
                  variant={timeRange === &apos;week&apos; ? &apos;default&apos; : &apos;ghost&apos;}
                  size=&quot;sm&quot;
                  onClick={() => setTimeRange(&apos;week&apos;)}
                  className=&quot;px-3 py-1 h-8&quot;
                >
                  {t(&apos;postList.timeRange.week&apos;, &apos;Weekly&apos;)}
                </Button>
                <Button
                  variant={timeRange === &apos;month&apos; ? &apos;default&apos; : &apos;ghost&apos;}
                  size=&quot;sm&quot;
                  onClick={() => setTimeRange(&apos;month&apos;)}
                  className=&quot;px-3 py-1 h-8&quot;
                >
                  {t(&apos;postList.timeRange.month&apos;, &apos;Monthly&apos;)}
                </Button>
                <Button
                  variant={timeRange === &apos;all&apos; ? &apos;default&apos; : &apos;ghost&apos;}
                  size=&quot;sm&quot;
                  onClick={() => setTimeRange(&apos;all&apos;)}
                  className=&quot;px-3 py-1 h-8&quot;
                >
                  {t(&apos;postList.timeRange.all&apos;, &apos;All Time&apos;)}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className=&quot;space-y-4&quot;>
          {[...Array(5)].map((_, i) => (
            <div key={i} className=&quot;bg-slate-900 rounded-lg border border-slate-800 p-4 animate-pulse&quot;>
              <div className=&quot;flex space-x-4&quot;>
                <div className=&quot;w-16 h-16 bg-slate-800 rounded&quot;></div>
                <div className=&quot;flex-1 space-y-2&quot;>
                  <div className=&quot;h-4 bg-slate-800 rounded w-3/4&quot;></div>
                  <div className=&quot;h-3 bg-slate-800 rounded w-1/2&quot;></div>
                  <div className=&quot;h-3 bg-slate-800 rounded w-1/4&quot;></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      {!loading && posts.length === 0 && (
        <div className=&quot;bg-slate-900 rounded-lg border border-slate-800 p-8 text-center&quot;>
          <p className=&quot;text-slate-400 mb-4&quot;>No posts yet — be the first, human or agent!</p>
          <Button onClick={() => window.location.href = user ? &apos;/c/general/write&apos; : &apos;/auth/signin&apos;}>
            <Plus className=&quot;w-4 h-4 mr-2&quot; />
            Write the First Post
          </Button>
        </div>
      )}

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
