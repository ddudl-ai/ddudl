'use client&apos;

import { useState, useEffect } from &apos;react&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { TrendingUp, Hash, Calendar, Filter } from &apos;lucide-react&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { Button } from &apos;@/components/ui/button&apos;

interface PopularTag {
  flair: string
  count: number
  percentage: number
  recent_posts: number
}

interface PopularTagsData {
  tags: PopularTag[]
  total_posts: number
  period_days: number
  channel: string
  generated_at: string
}

interface PopularTagsProps {
  channel?: string
  limit?: number
  days?: number
  onTagClick?: (tag: string) => void
  showControls?: boolean
}

export default function PopularTags({ 
  channel, 
  limit = 10, 
  days = 30, 
  onTagClick,
  showControls = false 
}: PopularTagsProps) {
  const [data, setData] = useState<PopularTagsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(days)

  useEffect(() => {
    fetchPopularTags()
  }, [channel, limit, selectedPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPopularTags = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        days: selectedPeriod.toString()
      })
      
      if (channel) {
        params.set(&apos;channel&apos;, channel)
      }

      const response = await fetch(`/api/tags/popular?${params}`)
      
      if (!response.ok) {
        throw new Error(&apos;Failed to fetch popular tags&apos;)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error(&apos;Error fetching popular tags:&apos;, err)
      setError(&apos;Failed to load popular tags.&apos;)
    } finally {
      setLoading(false)
    }
  }

  const handleTagClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag)
    } else {
      // 기본 동작: URL에 flair 파라미터 추가
      if (typeof window !== &apos;undefined&apos;) {
        const url = new URL(window.location.href)
        url.searchParams.set(&apos;flair&apos;, tag)
        window.location.href = url.toString()
      }
    }
  }

  const getTagColor = (index: number) => {
    const colors = [
      &apos;bg-red-100 text-red-800 border-red-200&apos;,
      &apos;bg-blue-100 text-blue-800 border-blue-200&apos;,
      &apos;bg-green-100 text-green-800 border-green-200&apos;,
      &apos;bg-yellow-100 text-yellow-800 border-yellow-200&apos;,
      &apos;bg-purple-100 text-purple-800 border-purple-200&apos;,
      &apos;bg-pink-100 text-pink-800 border-pink-200&apos;,
      &apos;bg-indigo-100 text-indigo-800 border-indigo-200&apos;,
      &apos;bg-gray-100 text-gray-800 border-gray-200&apos;
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className=&quot;flex items-center space-x-2&quot;>
            <TrendingUp className=&quot;w-5 h-5&quot; />
            <span>Popular Tags</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text=&quot;Loading tags...&quot; />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className=&quot;flex items-center space-x-2&quot;>
            <TrendingUp className=&quot;w-5 h-5&quot; />
            <span>Popular Tags</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className=&quot;text-red-600 text-center&quot;>{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (data.tags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className=&quot;flex items-center space-x-2&quot;>
            <TrendingUp className=&quot;w-5 h-5&quot; />
            <span>Popular Tags</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className=&quot;text-center py-4 text-gray-500&quot;>
            <Hash className=&quot;w-8 h-8 mx-auto mb-2 opacity-50&quot; />
            <p>No tagged posts yet.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className=&quot;flex items-center justify-between&quot;>
          <CardTitle className=&quot;flex items-center space-x-2&quot;>
            <TrendingUp className=&quot;w-5 h-5&quot; />
            <span>Popular Tags</span>
          </CardTitle>
          {showControls && (
            <div className=&quot;flex space-x-2&quot;>
              {[7, 30, 90].map(period => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? &apos;default&apos; : &apos;outline&apos;}
                  size=&quot;sm&quot;
                  onClick={() => setSelectedPeriod(period)}
                  className=&quot;text-xs&quot;
                >
                  {period}d
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className=&quot;flex items-center space-x-2 text-sm text-gray-500&quot;>
          <Calendar className=&quot;w-4 h-4&quot; />
          <span>
            Last {data.period_days} days • {data.total_posts} posts
            {data.channel !== &apos;all&apos; && ` • /${data.channel}`}
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className=&quot;space-y-3&quot;>
          {data.tags.map((tag, index) => (
            <div
              key={tag.flair}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                onTagClick ? &apos;cursor-pointer hover:bg-gray-50&apos; : &apos;'
              }`}
              onClick={() => handleTagClick(tag.flair)}
            >
              <div className=&quot;flex items-center space-x-3&quot;>
                <div className=&quot;flex items-center space-x-2&quot;>
                  <span className=&quot;text-lg font-bold text-gray-400&quot;>
                    #{index + 1}
                  </span>
                  <Badge 
                    variant=&quot;outline&quot; 
                    className={`${getTagColor(index)} font-medium`}
                  >
                    {tag.flair}
                  </Badge>
                </div>
                <div className=&quot;text-sm text-gray-600&quot;>
                  <span className=&quot;font-medium&quot;>{tag.count}</span>
                  <span className=&quot;ml-1&quot;>({tag.percentage}%)</span>
                </div>
              </div>
              
              <div className=&quot;flex items-center space-x-2&quot;>
                {tag.recent_posts > 0 && (
                  <div className=&quot;flex items-center space-x-1 bg-green-50 px-2 py-1 rounded text-xs&quot;>
                    <TrendingUp className=&quot;w-3 h-3 text-green-600&quot; />
                    <span className=&quot;text-green-700 font-medium&quot;>
                      {tag.recent_posts}
                    </span>
                  </div>
                )}
                {onTagClick && (
                  <Filter className=&quot;w-4 h-4 text-gray-400&quot; />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className=&quot;mt-4 pt-3 border-t text-xs text-gray-500 text-center&quot;>
          {new Date(data.generated_at).toLocaleString(&apos;en-US&apos;)} updated
        </div>
      </CardContent>
    </Card>
  )
}