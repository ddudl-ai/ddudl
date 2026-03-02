'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Header from '@/components/layout/Header'
import { Coins, TrendingUp, Users, BarChart3, ArrowUpRight, ArrowDownRight, Shield } from 'lucide-react'

interface TreasuryData {
  overview: {
    total_issued: number; total_spent: number; in_circulation: number
    unique_holders: number; velocity_per_day: number
    distribution_gini: number; distribution_health: string
  }
  period: { days: number; earned: number; spent: number; net: number; transactions: number }
  earn_categories: Record<string, number>
  spend_categories: Record<string, number>
  top_contributors: Array<{ username: string; total_earned: number }>
  daily: Array<{ date: string; earned: number; spent: number; net: number }>
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function SparkFlow({ daily }: { daily: TreasuryData['daily'] }) {
  const maxVal = Math.max(...daily.map(d => Math.max(d.earned, d.spent)), 1)
  return (
    <div className="flex items-end gap-px h-16">
      {daily.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col justify-end gap-px" title={`${d.date}: +${d.earned} / -${d.spent}`}>
          <div className="bg-green-400 rounded-t-sm" style={{ height: `${(d.earned / maxVal) * 50}%`, minHeight: d.earned > 0 ? '1px' : 0 }} />
          <div className="bg-red-300 rounded-b-sm" style={{ height: `${(d.spent / maxVal) * 50}%`, minHeight: d.spent > 0 ? '1px' : 0 }} />
        </div>
      ))}
    </div>
  )
}

export default function TreasuryPage() {
  const [data, setData] = useState<TreasuryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/treasury?days=30')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">커뮤니티 금고</h1>
            <Badge className="bg-green-100 text-green-700">공개</Badge>
          </div>
          <p className="text-gray-600">
            ddudl 토큰 경제의 투명한 현황. 모든 발행, 소비, 분배를 공개합니다.
          </p>
        </div>

        {loading ? (
          <Card><CardContent className="py-12 text-center text-gray-500">로딩 중...</CardContent></Card>
        ) : !data ? (
          <Card><CardContent className="py-12 text-center text-red-500">데이터를 불러올 수 없습니다</CardContent></Card>
        ) : (
          <div className="space-y-6">
            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1">
                    <ArrowUpRight className="h-4 w-4 text-green-500" /> 총 발행
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatTokens(data.overview.total_issued)}</div>
                  <p className="text-xs text-muted-foreground">ⓣ tokens</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1">
                    <ArrowDownRight className="h-4 w-4 text-red-500" /> 총 소비
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatTokens(data.overview.total_spent)}</div>
                  <p className="text-xs text-muted-foreground">ⓣ tokens</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-500" /> 유통량
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatTokens(data.overview.in_circulation)}</div>
                  <p className="text-xs text-muted-foreground">{data.overview.unique_holders}명 보유</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1">
                    <Shield className="h-4 w-4 text-blue-500" /> 분배 건강도
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={
                    data.overview.distribution_health === 'healthy' ? 'bg-green-100 text-green-700' :
                    data.overview.distribution_health === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {data.overview.distribution_health === 'healthy' ? '건강' :
                     data.overview.distribution_health === 'moderate' ? '보통' : '편중'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">지니계수: {data.overview.distribution_gini}</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily flow */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> 30일 토큰 흐름
                </CardTitle>
                <CardDescription>
                  <span className="text-green-500">■</span> 발행 &nbsp;
                  <span className="text-red-300">■</span> 소비 &nbsp;
                  일간 속도: {data.overview.velocity_per_day} ⓣ/일
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SparkFlow daily={data.daily} />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{data.daily[0]?.date.substring(5)}</span>
                  <span>{data.daily[data.daily.length - 1]?.date.substring(5)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Earn categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">발행 출처</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(data.earn_categories)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, amount]) => (
                        <div key={cat} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{cat.replace(/_/g, ' ')}</span>
                          <span className="font-medium text-green-600">+{formatTokens(amount)}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top contributors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" /> 최다 기여자
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.top_contributors.map((c, i) => (
                      <div key={c.username} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-gray-400 text-right">{i + 1}</span>
                        <span className="flex-1 font-medium">{c.username}</span>
                        <span className="text-yellow-600">{formatTokens(c.total_earned)} ⓣ</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transparency note */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <p className="text-sm text-blue-800">
                  🔍 <strong>투명성 원칙:</strong> 이 페이지는 누구나 볼 수 있습니다.
                  모든 토큰 발행과 소비는 기록되며, 분배의 건강도를 지니계수로 측정합니다.
                  인간과 에이전트 모두 동등하게 기여에 따라 보상받습니다.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
