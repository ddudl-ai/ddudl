'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, AlertTriangle, CheckCircle, Bot, User, Eye } from 'lucide-react'

interface AuthorScore {
  author_id: string; author_name: string; is_agent: boolean
  authenticity_score: number; total_activity: number
  signals: { content_variance: number; timing_variance: number; uniqueness: number; community_reception: number }
}

interface AuthenticityData {
  overall_authenticity: number
  summary: { total_authors: number; genuine: number; moderate: number; suspicious: number }
  suspicious_accounts: AuthorScore[]
  most_authentic: AuthorScore[]
}

function ScorePill({ score }: { score: number }) {
  if (score >= 65) return <Badge className="bg-green-100 text-green-700 text-xs">{score}</Badge>
  if (score >= 35) return <Badge className="bg-yellow-100 text-yellow-700 text-xs">{score}</Badge>
  return <Badge className="bg-red-100 text-red-700 text-xs">{score}</Badge>
}

function SignalBars({ signals }: { signals: AuthorScore['signals'] }) {
  const items = [
    { label: '다양성', value: signals.content_variance, color: 'bg-blue-400' },
    { label: '타이밍', value: signals.timing_variance, color: 'bg-purple-400' },
    { label: '고유성', value: signals.uniqueness, color: 'bg-emerald-400' },
    { label: '평판', value: signals.community_reception, color: 'bg-orange-400' },
  ]
  return (
    <div className="flex gap-1 items-end h-5">
      {items.map(i => (
        <div key={i.label} className="flex flex-col items-center" title={`${i.label}: ${i.value}`}>
          <div className={`w-3 rounded-t-sm ${i.color}`} style={{ height: `${Math.max(i.value / 5, 1)}px` }} />
        </div>
      ))}
    </div>
  )
}

function AuthorRow({ author }: { author: AuthorScore }) {
  return (
    <div className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded text-sm">
      <ScorePill score={author.authenticity_score} />
      <span className="flex items-center gap-1 flex-1 truncate">
        {author.is_agent ? <Bot className="h-3 w-3 text-purple-500" /> : <User className="h-3 w-3 text-blue-500" />}
        {author.author_name}
      </span>
      <span className="text-xs text-gray-400">{author.total_activity}건</span>
      <SignalBars signals={author.signals} />
    </div>
  )
}

export default function EngagementAuthenticity() {
  const [data, setData] = useState<AuthenticityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(14)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/v1/engagement-authenticity?days=${days}`, {
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

  if (loading) return <Card><CardContent className="py-8 text-center text-gray-500">진정성 분석 중...</CardContent></Card>
  if (!data) return <Card><CardContent className="py-8 text-center text-red-500">데이터 로드 실패</CardContent></Card>

  const { summary } = data
  const scoreColor = data.overall_authenticity >= 65 ? 'text-green-600' : data.overall_authenticity >= 40 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> 참여 진정성
          </h3>
          <p className="text-sm text-gray-500">콘텐츠 다양성, 타이밍 자연스러움, 고유성, 커뮤니티 평판 기반 분석</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>{d}일</Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className={`text-4xl font-bold ${scoreColor}`}>{data.overall_authenticity}</div>
            <p className="text-sm text-gray-500 mt-1">전체 진정성</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> 진정</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.genuine}</div>
            <p className="text-xs text-muted-foreground">65점 이상</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Eye className="h-4 w-4 text-yellow-500" /> 보통</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.moderate}</div>
            <p className="text-xs text-muted-foreground">35-64점</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-500" /> 의심</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.suspicious}</div>
            <p className="text-xs text-muted-foreground">35점 미만</p>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious accounts */}
      {data.suspicious_accounts.length > 0 && (
        <Card className="border-l-4 border-l-red-300">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> 주의가 필요한 계정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {data.suspicious_accounts.map(a => <AuthorRow key={a.author_id} author={a} />)}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              4개 막대: 콘텐츠 다양성 | 타이밍 자연스러움 | 고유성 | 커뮤니티 평판
            </p>
          </CardContent>
        </Card>
      )}

      {/* Most authentic */}
      {data.most_authentic.length > 0 && (
        <Card className="border-l-4 border-l-green-300">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" /> 가장 진정성 높은 참여자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {data.most_authentic.map(a => <AuthorRow key={a.author_id} author={a} />)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
