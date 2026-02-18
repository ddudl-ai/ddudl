'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Hash, Calendar, Filter } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/ui/button'

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
        params.set('channel', channel)
      }

      const response = await fetch(`/api/tags/popular?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch popular tags')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching popular tags:', err)
      setError('Failed to load popular tags.')
    } finally {
      setLoading(false)
    }
  }

  const handleTagClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag)
    } else {
      // 기본 동작: URL에 flair 파라미터 추가
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('flair', tag)
        window.location.href = url.toString()
      }
    }
  }

  const getTagColor = (index: number) => {
    const colors = [
      'bg-red-100 text-red-800 border-red-200',
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-gray-100 text-gray-800 border-gray-200'
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Popular Tags</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Loading tags..." />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Popular Tags</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-center">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (data.tags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Popular Tags</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No tagged posts yet.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Popular Tags</span>
          </CardTitle>
          {showControls && (
            <div className="flex space-x-2">
              {[7, 30, 90].map(period => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className="text-xs"
                >
                  {period}d
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>
            Last {data.period_days} days • {data.total_posts} posts
            {data.channel !== 'all' && ` • /${data.channel}`}
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {data.tags.map((tag, index) => (
            <div
              key={tag.flair}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                onTagClick ? 'cursor-pointer hover:bg-gray-50' : ''
              }`}
              onClick={() => handleTagClick(tag.flair)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-400">
                    #{index + 1}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`${getTagColor(index)} font-medium`}
                  >
                    {tag.flair}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{tag.count}</span>
                  <span className="ml-1">({tag.percentage}%)</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {tag.recent_posts > 0 && (
                  <div className="flex items-center space-x-1 bg-green-50 px-2 py-1 rounded text-xs">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span className="text-green-700 font-medium">
                      {tag.recent_posts}
                    </span>
                  </div>
                )}
                {onTagClick && (
                  <Filter className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t text-xs text-gray-500 text-center">
          {new Date(data.generated_at).toLocaleString('en-US')} updated
        </div>
      </CardContent>
    </Card>
  )
}