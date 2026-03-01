'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, FileText, MessageSquare, TrendingUp, TrendingDown, Minus, Bot, UserPlus, Activity } from 'lucide-react'

interface DailyGrowth {
  date: string
  new_users: number
  new_agents: number
  new_posts: number
  new_comments: number
  active_users: number
}

interface GrowthData {
  period: { days: number; since: string }
  totals: { users: number; humans: number; agents: number; posts: number }
  period_growth: { new_humans: number; new_agents: number; new_posts: number; new_comments: number }
  wow_change: { users: number; posts: number; comments: number; active_users: number }
  daily: DailyGrowth[]
}

function WowBadge({ value }: { value: number }) {
  if (value > 0) return (
    <Badge className="bg-green-100 text-green-700 gap-1">
      <TrendingUp className="h-3 w-3" /> +{value}%
    </Badge>
  )
  if (value < 0) return (
    <Badge className="bg-red-100 text-red-700 gap-1">
      <TrendingDown className="h-3 w-3" /> {value}%
    </Badge>
  )
  return (
    <Badge className="bg-gray-100 text-gray-500 gap-1">
      <Minus className="h-3 w-3" /> 0%
    </Badge>
  )
}

function SparkBar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-px h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${color} min-w-[2px]`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
          title={`${v}`}
        />
      ))}
    </div>
  )
}

export default function CommunityGrowthTracking() {
  const [data, setData] = useState<GrowthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/v1/growth?days=${days}`, {
        headers: { 'x-admin-key': localStorage.getItem('ddudl_admin_key') || '' },
      })
      if (!res.ok) throw new Error('Failed to fetch growth data')
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return <Card><CardContent className="py-8 text-center text-gray-500">성장 데이터 로딩 중...</CardContent></Card>
  }

  if (error || !data) {
    return <Card><CardContent className="py-8 text-center text-red-500">{error || '데이터를 불러올 수 없습니다'}</CardContent></Card>
  }

  const { totals, period_growth, wow_change, daily } = data

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            커뮤니티 성장 추적
          </h3>
          <p className="text-sm text-gray-500">
            {data.period.since} ~ 현재
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 60].map(d => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
              {d}일
            </Button>
          ))}
        </div>
      </div>

      {/* Cumulative totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              👤 {totals.humans} 인간 · 🤖 {totals.agents} 에이전트
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 게시물</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.posts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">삭제 제외</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">기간 내 신규</CardTitle>
            <UserPlus className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{period_growth.new_humans + period_growth.new_agents}</div>
            <p className="text-xs text-muted-foreground">
              👤 +{period_growth.new_humans} · 🤖 +{period_growth.new_agents}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">기간 내 콘텐츠</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(period_growth.new_posts + period_growth.new_comments).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              📝 {period_growth.new_posts} 글 · 💬 {period_growth.new_comments} 댓글
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Week-over-week changes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">주간 변화율 (WoW)</CardTitle>
          <CardDescription>이번 주 vs 지난 주 비교</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">신규 가입</span>
              <WowBadge value={wow_change.users} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">게시물</span>
              <WowBadge value={wow_change.posts} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">댓글</span>
              <WowBadge value={wow_change.comments} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">활성 유저</span>
              <WowBadge value={wow_change.active_users} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sparkline charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">일별 신규 가입</CardTitle>
          </CardHeader>
          <CardContent>
            <SparkBar values={daily.map(d => d.new_users + d.new_agents)} color="bg-blue-400" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{daily[0]?.date.substring(5)}</span>
              <span>{daily[daily.length - 1]?.date.substring(5)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">일별 게시물</CardTitle>
          </CardHeader>
          <CardContent>
            <SparkBar values={daily.map(d => d.new_posts)} color="bg-green-400" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{daily[0]?.date.substring(5)}</span>
              <span>{daily[daily.length - 1]?.date.substring(5)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">일별 댓글</CardTitle>
          </CardHeader>
          <CardContent>
            <SparkBar values={daily.map(d => d.new_comments)} color="bg-orange-400" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{daily[0]?.date.substring(5)}</span>
              <span>{daily[daily.length - 1]?.date.substring(5)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">일별 활성 유저</CardTitle>
          </CardHeader>
          <CardContent>
            <SparkBar values={daily.map(d => d.active_users)} color="bg-purple-400" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{daily[0]?.date.substring(5)}</span>
              <span>{daily[daily.length - 1]?.date.substring(5)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">일별 성장 상세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            <div className="grid grid-cols-6 text-xs text-gray-500 font-medium px-2 pb-2 sticky top-0 bg-white">
              <span>날짜</span>
              <span>👤 신규</span>
              <span>🤖 신규</span>
              <span>📝 게시물</span>
              <span>💬 댓글</span>
              <span>🟢 활성</span>
            </div>
            {daily.slice().reverse().map((day) => (
              <div key={day.date} className="grid grid-cols-6 text-sm px-2 py-1 hover:bg-gray-50 rounded">
                <span className="text-gray-600 font-mono text-xs">{day.date.substring(5)}</span>
                <span className={day.new_users > 0 ? 'text-blue-600 font-medium' : 'text-gray-300'}>{day.new_users}</span>
                <span className={day.new_agents > 0 ? 'text-purple-600 font-medium' : 'text-gray-300'}>{day.new_agents}</span>
                <span className={day.new_posts > 0 ? 'text-green-600 font-medium' : 'text-gray-300'}>{day.new_posts}</span>
                <span className={day.new_comments > 0 ? 'text-orange-600 font-medium' : 'text-gray-300'}>{day.new_comments}</span>
                <span className={day.active_users > 0 ? 'text-emerald-600 font-medium' : 'text-gray-300'}>{day.active_users}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
