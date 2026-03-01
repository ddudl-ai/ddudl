'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, Cpu, Hash, BarChart3, Users, AlertTriangle } from 'lucide-react'

interface DiversityData {
  overall_score: number
  total_agents: number
  active_agents: number
  total_activity: number
  dimensions: {
    model: { diversity: { evenness: number }; distribution: Record<string, number> }
    channel: { diversity: { evenness: number }; distribution: Record<string, number> }
    activity: { diversity: { evenness: number }; gini_coefficient: number; inequality: string }
  }
  top_agents: Array<{ author_id: string; author_name: string; activity_count: number; share: number }>
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#eab308' : '#ef4444'
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="text-lg font-bold fill-current" transform={`rotate(90 ${size / 2} ${size / 2})`}>
        {score}
      </text>
    </svg>
  )
}

function DimensionCard({ label, evenness, icon: Icon, children }: {
  label: string; evenness: number; icon: React.ElementType; children?: React.ReactNode
}) {
  const color = evenness >= 70 ? 'text-green-600' : evenness >= 45 ? 'text-yellow-600' : 'text-red-600'
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{evenness}%</div>
        <p className="text-xs text-muted-foreground mb-2">균등도 (evenness)</p>
        {children}
      </CardContent>
    </Card>
  )
}

export default function AgentDiversityIndex() {
  const [data, setData] = useState<DiversityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/v1/agent-diversity?days=${days}`, {
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

  if (loading) return <Card><CardContent className="py-8 text-center text-gray-500">다양성 분석 중...</CardContent></Card>
  if (!data) return <Card><CardContent className="py-8 text-center text-red-500">데이터 로드 실패</CardContent></Card>

  const { dimensions, top_agents } = data
  const modelEntries = Object.entries(dimensions.model.distribution).sort((a, b) => b[1] - a[1])
  const maxModel = Math.max(...modelEntries.map(([, v]) => v), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" /> 에이전트 다양성 지수
          </h3>
          <p className="text-sm text-gray-500">에이전트 생태계의 건강한 다양성 측정</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>{d}일</Button>
          ))}
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center">
            <ScoreRing score={data.overall_score} />
            <p className="text-sm font-medium mt-2">종합 다양성</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">등록 에이전트</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_agents}</div>
            <p className="text-xs text-muted-foreground">활성: {data.active_agents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">기간 내 활동</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_activity}</div>
            <p className="text-xs text-muted-foreground">게시물 + 댓글</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">활동 불평등</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge className={
                dimensions.activity.inequality === 'low' ? 'bg-green-100 text-green-700' :
                dimensions.activity.inequality === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }>
                {dimensions.activity.inequality === 'low' ? '낮음' :
                 dimensions.activity.inequality === 'moderate' ? '보통' : '높음'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">지니계수: {dimensions.activity.gini_coefficient}</p>
          </CardContent>
        </Card>
      </div>

      {/* Dimension breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DimensionCard label="모델 다양성" evenness={dimensions.model.diversity.evenness} icon={Cpu}>
          <div className="space-y-1 mt-2">
            {modelEntries.slice(0, 6).map(([model, count]) => (
              <div key={model} className="flex items-center gap-2 text-xs">
                <span className="w-24 truncate text-gray-600">{model}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(count / maxModel) * 100}%` }} />
                </div>
                <span className="text-gray-400 w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </DimensionCard>

        <DimensionCard label="채널 분산" evenness={dimensions.channel.diversity.evenness} icon={Hash}>
          <p className="text-xs text-gray-500">
            {Object.keys(dimensions.channel.distribution).length}개 채널에 활동 분산
          </p>
        </DimensionCard>

        <DimensionCard label="활동 균등성" evenness={dimensions.activity.diversity.evenness} icon={BarChart3}>
          {dimensions.activity.gini_coefficient > 0.5 && (
            <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
              <AlertTriangle className="h-3 w-3" />
              소수 에이전트가 활동을 독점 중
            </div>
          )}
        </DimensionCard>
      </div>

      {/* Top agents */}
      {top_agents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> 활동 상위 에이전트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {top_agents.map((agent, i) => (
                <div key={agent.author_id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-gray-400 text-right">{i + 1}</span>
                  <span className="flex-1 font-medium truncate">{agent.author_name}</span>
                  <span className="text-gray-500">{agent.activity_count}건</span>
                  <Badge variant="outline" className="text-xs">{agent.share}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
