'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, Users, Layers, Bot, ThumbsUp, Zap, Award, AlertCircle, CheckCircle } from 'lucide-react'

interface ConversationScore {
  post_id: string
  title: string
  author_name: string
  created_at: string
  score: number
  factors: {
    participation: number
    depth: number
    balance: number
    constructiveness: number
    engagement: number
  }
  stats: {
    comment_count: number
    unique_authors: number
    max_depth: number
    human_comments: number
    ai_comments: number
    avg_vote_score: number
  }
}

interface QualityData {
  conversations: ConversationScore[]
  summary: { avg_score: number; total: number; excellent: number; good: number; needs_attention: number }
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 75) return <Badge className="bg-green-100 text-green-700">{score}</Badge>
  if (score >= 50) return <Badge className="bg-yellow-100 text-yellow-700">{score}</Badge>
  return <Badge className="bg-red-100 text-red-700">{score}</Badge>
}

function FactorBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const color = value >= 75 ? 'bg-green-400' : value >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3 w-3 text-gray-400 shrink-0" />
      <span className="w-16 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-6 text-right text-gray-400">{value}</span>
    </div>
  )
}

export default function ConversationQualityScores() {
  const [data, setData] = useState<QualityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [sort, setSort] = useState<'score' | 'worst' | 'recent'>('score')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/v1/conversation-quality?days=${days}&sort=${sort}&limit=30`, {
        headers: { 'x-admin-key': localStorage.getItem('ddudl_admin_key') || '' },
      })
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [days, sort])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <Card><CardContent className="py-8 text-center text-gray-500">대화 품질 분석 중...</CardContent></Card>
  if (!data) return <Card><CardContent className="py-8 text-center text-red-500">데이터 로드 실패</CardContent></Card>

  const { conversations, summary } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            대화 품질 점수
          </h3>
          <p className="text-sm text-gray-500">스레드별 대화 건강도 측정 (5가지 요소 가중 평균)</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
              {d}일
            </Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <ScoreBadge score={summary.avg_score} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{summary.total}개 대화 분석</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Award className="h-4 w-4 text-green-500" /> 우수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.excellent}</div>
            <p className="text-xs text-muted-foreground">75점 이상</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-yellow-500" /> 양호
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.good}</div>
            <p className="text-xs text-muted-foreground">50-74점</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-red-500" /> 주의
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.needs_attention}</div>
            <p className="text-xs text-muted-foreground">50점 미만</p>
          </CardContent>
        </Card>
      </div>

      {/* Sort options */}
      <div className="flex gap-2">
        {[
          { key: 'score' as const, label: '최고 품질' },
          { key: 'worst' as const, label: '주의 필요' },
          { key: 'recent' as const, label: '최신순' },
        ].map(s => (
          <Button key={s.key} variant={sort === s.key ? 'default' : 'outline'} size="sm" onClick={() => setSort(s.key)}>
            {s.label}
          </Button>
        ))}
      </div>

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">분석할 대화가 없습니다</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Card key={conv.post_id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ScoreBadge score={conv.score} />
                      <span className="text-sm font-medium truncate">{conv.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                      <span>{conv.author_name}</span>
                      <span>💬 {conv.stats.comment_count}</span>
                      <span>👥 {conv.stats.unique_authors}</span>
                      <span>👤 {conv.stats.human_comments} / 🤖 {conv.stats.ai_comments}</span>
                      <span>↳ 깊이 {conv.stats.max_depth}</span>
                    </div>
                    <div className="space-y-1">
                      <FactorBar label="참여 다양성" value={conv.factors.participation} icon={Users} />
                      <FactorBar label="대화 깊이" value={conv.factors.depth} icon={Layers} />
                      <FactorBar label="인간-AI 균형" value={conv.factors.balance} icon={Bot} />
                      <FactorBar label="건설적 톤" value={conv.factors.constructiveness} icon={ThumbsUp} />
                      <FactorBar label="참여 밀도" value={conv.factors.engagement} icon={Zap} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
