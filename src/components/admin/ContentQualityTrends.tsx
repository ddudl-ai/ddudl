'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Minus, BarChart3, AlertTriangle, BookOpen, Smile } from 'lucide-react'

interface DailyQuality {
  date: string
  avg_readability: number
  avg_engagement: number
  post_count: number
  flagged_count: number
  sentiment_positive: number
  sentiment_neutral: number
  sentiment_negative: number
}

interface QualityTrendsData {
  period: { days: number; since: string }
  summary: {
    total_posts: number
    analyzed_posts: number
    avg_readability: number
    avg_engagement: number
    flagged_posts: number
    flagged_rate: number
  }
  daily: DailyQuality[]
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <Minus className="h-4 w-4 text-gray-400" />
  const change = ((current - previous) / previous) * 100
  if (change > 5) return <TrendingUp className="h-4 w-4 text-green-500" />
  if (change < -5) return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-gray-400" />
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ContentQualityTrends() {
  const [data, setData] = useState<QualityTrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/v1/quality-trends?days=${days}`, {
        headers: { 'x-admin-key': localStorage.getItem('ddudl_admin_key') || '' },
      })
      if (!res.ok) throw new Error('Failed to fetch quality trends')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          콘텐츠 품질 데이터 로딩 중...
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-500">
          {error || '데이터를 불러올 수 없습니다'}
        </CardContent>
      </Card>
    )
  }

  const { summary, daily } = data
  const recentWeek = daily.slice(-7)
  const previousWeek = daily.slice(-14, -7)

  const recentAvgReadability = recentWeek.length > 0
    ? recentWeek.reduce((s, d) => s + d.avg_readability, 0) / recentWeek.length
    : 0
  const prevAvgReadability = previousWeek.length > 0
    ? previousWeek.reduce((s, d) => s + d.avg_readability, 0) / previousWeek.length
    : 0

  const recentAvgEngagement = recentWeek.length > 0
    ? recentWeek.reduce((s, d) => s + d.avg_engagement, 0) / recentWeek.length
    : 0
  const prevAvgEngagement = previousWeek.length > 0
    ? previousWeek.reduce((s, d) => s + d.avg_engagement, 0) / previousWeek.length
    : 0

  const maxPosts = Math.max(...daily.map(d => d.post_count), 1)

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            콘텐츠 품질 트렌드
          </h3>
          <p className="text-sm text-gray-500">
            {data.period.since} ~ 현재 ({summary.total_posts}개 게시물)
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 60].map(d => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}일
            </Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 가독성</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {summary.avg_readability.toFixed(1)}
              </span>
              <TrendIndicator current={recentAvgReadability} previous={prevAvgReadability} />
            </div>
            <p className="text-xs text-muted-foreground">분석 대상: {summary.analyzed_posts}개</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">참여도 예측</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {summary.avg_engagement.toFixed(1)}
              </span>
              <TrendIndicator current={recentAvgEngagement} previous={prevAvgEngagement} />
            </div>
            <p className="text-xs text-muted-foreground">주간 추이 반영</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">플래그 비율</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.flagged_rate}%
            </div>
            <p className="text-xs text-muted-foreground">{summary.flagged_posts}개 플래그</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">감성 분포</CardTitle>
            <Smile className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {(() => {
              const totalSent = daily.reduce((s, d) => s + d.sentiment_positive + d.sentiment_neutral + d.sentiment_negative, 0)
              const pos = daily.reduce((s, d) => s + d.sentiment_positive, 0)
              const neg = daily.reduce((s, d) => s + d.sentiment_negative, 0)
              return (
                <>
                  <div className="flex gap-2 text-sm">
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      긍정 {totalSent > 0 ? Math.round((pos / totalSent) * 100) : 0}%
                    </Badge>
                    <Badge variant="default" className="bg-red-100 text-red-700">
                      부정 {totalSent > 0 ? Math.round((neg / totalSent) * 100) : 0}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">전체 기간 기준</p>
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Daily trend table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">일별 품질 추이</CardTitle>
          <CardDescription>날짜별 콘텐츠 품질 지표</CardDescription>
        </CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <p className="text-center text-gray-500 py-4">데이터가 없습니다</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              <div className="grid grid-cols-6 text-xs text-gray-500 font-medium px-2 pb-2 sticky top-0 bg-white">
                <span>날짜</span>
                <span>게시물</span>
                <span>가독성</span>
                <span>참여도</span>
                <span>플래그</span>
                <span>감성</span>
              </div>
              {daily.slice().reverse().map((day) => (
                <div key={day.date} className="grid grid-cols-6 text-sm px-2 py-1.5 hover:bg-gray-50 rounded items-center">
                  <span className="text-gray-600 font-mono text-xs">{day.date.substring(5)}</span>
                  <span>
                    <MiniBar value={day.post_count} max={maxPosts} color="bg-blue-400" />
                    <span className="text-xs text-gray-500">{day.post_count}</span>
                  </span>
                  <span className={day.avg_readability >= 60 ? 'text-green-600' : day.avg_readability >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                    {day.avg_readability || '-'}
                  </span>
                  <span className={day.avg_engagement >= 60 ? 'text-green-600' : day.avg_engagement >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                    {day.avg_engagement || '-'}
                  </span>
                  <span>
                    {day.flagged_count > 0 ? (
                      <Badge variant="destructive" className="text-xs">{day.flagged_count}</Badge>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </span>
                  <span className="flex gap-0.5 text-xs">
                    <span className="text-green-600">{day.sentiment_positive}</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-500">{day.sentiment_neutral}</span>
                    <span className="text-gray-300">/</span>
                    <span className="text-red-500">{day.sentiment_negative}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
