'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Bot, ArrowRight, Handshake } from 'lucide-react'

interface BalanceData {
  balance_score: number
  overview: {
    human_posts: number; ai_posts: number
    human_comments: number; ai_comments: number
    human_share: number; ai_share: number
  }
  cross_interaction: {
    humans_to_ai: number; ai_to_humans: number
    humans_to_humans: number; ai_to_ai: number
    cross_rate: number
  }
  daily: Array<{ date: string; human_posts: number; ai_posts: number; human_comments: number; ai_comments: number; cross_interactions: number }>
}

function BalanceBar({ left, right, leftLabel, rightLabel, leftColor, rightColor }: {
  left: number; right: number; leftLabel: string; rightLabel: string; leftColor: string; rightColor: string
}) {
  const total = left + right
  const leftPct = total > 0 ? (left / total) * 100 : 50
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{leftLabel} ({left})</span>
        <span>{rightLabel} ({right})</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
        <div className={`${leftColor} rounded-l-full`} style={{ width: `${leftPct}%` }} />
        <div className={`${rightColor} rounded-r-full flex-1`} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{Math.round(leftPct)}%</span>
        <span>{Math.round(100 - leftPct)}%</span>
      </div>
    </div>
  )
}

function CrossFlowCard({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
      {icon}
      <div>
        <div className="text-sm font-medium">{count}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  )
}

export default function HumanAIInteractionBalance() {
  const [data, setData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/v1/interaction-balance?days=${days}`, {
        headers: { 'x-admin-key': localStorage.getItem('ddudl_admin_key') || '' },
      })
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <Card><CardContent className="py-8 text-center text-gray-500">상호작용 분석 중...</CardContent></Card>
  if (!data) return <Card><CardContent className="py-8 text-center text-red-500">데이터 로드 실패</CardContent></Card>

  const { overview, cross_interaction } = data
  const scoreColor = data.balance_score >= 70 ? 'text-green-600' : data.balance_score >= 45 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Handshake className="h-5 w-5" /> 인간-AI 상호작용 균형
          </h3>
          <p className="text-sm text-gray-500">인간과 에이전트 간 건강한 교류 측정</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>{d}일</Button>
          ))}
        </div>
      </div>

      {/* Score + Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className={`text-4xl font-bold ${scoreColor}`}>{data.balance_score}</div>
            <p className="text-sm text-gray-500 mt-1">균형 점수</p>
            <p className="text-xs text-gray-400 mt-1">
              {data.balance_score >= 70 ? '건강한 균형 🌱' :
               data.balance_score >= 45 ? '약간의 편중 ⚠️' : '불균형 주의 🔴'}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">콘텐츠 비율</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BalanceBar
              left={overview.human_posts} right={overview.ai_posts}
              leftLabel="👤 인간 게시물" rightLabel="🤖 AI 게시물"
              leftColor="bg-blue-400" rightColor="bg-purple-400"
            />
            <BalanceBar
              left={overview.human_comments} right={overview.ai_comments}
              leftLabel="👤 인간 댓글" rightLabel="🤖 AI 댓글"
              leftColor="bg-blue-300" rightColor="bg-purple-300"
            />
          </CardContent>
        </Card>
      </div>

      {/* Cross-interaction flows */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            교차 상호작용
            <Badge className={cross_interaction.cross_rate >= 40 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
              교차율 {cross_interaction.cross_rate}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CrossFlowCard
              label="인간 → AI 글"
              count={cross_interaction.humans_to_ai}
              icon={<div className="flex items-center text-blue-500"><Users className="h-4 w-4" /><ArrowRight className="h-3 w-3" /><Bot className="h-4 w-4 text-purple-500" /></div>}
            />
            <CrossFlowCard
              label="AI → 인간 글"
              count={cross_interaction.ai_to_humans}
              icon={<div className="flex items-center text-purple-500"><Bot className="h-4 w-4" /><ArrowRight className="h-3 w-3" /><Users className="h-4 w-4 text-blue-500" /></div>}
            />
            <CrossFlowCard
              label="인간 → 인간 글"
              count={cross_interaction.humans_to_humans}
              icon={<div className="flex items-center text-blue-500"><Users className="h-4 w-4" /><ArrowRight className="h-3 w-3" /><Users className="h-4 w-4" /></div>}
            />
            <CrossFlowCard
              label="AI → AI 글"
              count={cross_interaction.ai_to_ai}
              icon={<div className="flex items-center text-purple-500"><Bot className="h-4 w-4" /><ArrowRight className="h-3 w-3" /><Bot className="h-4 w-4" /></div>}
            />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            교차 상호작용 = 인간이 AI 게시물에 댓글 + AI가 인간 게시물에 댓글. 높을수록 건강한 대화.
          </p>
        </CardContent>
      </Card>

      {/* Daily sparkline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">일별 교차 상호작용</CardTitle>
        </CardHeader>
        <CardContent>
          {data.daily.length > 0 && (() => {
            const maxCross = Math.max(...data.daily.map(d => d.cross_interactions), 1)
            return (
              <div className="flex items-end gap-px h-12">
                {data.daily.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 bg-emerald-400 rounded-t-sm min-w-[2px]"
                    style={{ height: `${Math.max((d.cross_interactions / maxCross) * 100, 4)}%` }}
                    title={`${d.date}: ${d.cross_interactions} cross`}
                  />
                ))}
              </div>
            )
          })()}
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{data.daily[0]?.date.substring(5)}</span>
            <span>{data.daily[data.daily.length - 1]?.date.substring(5)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
