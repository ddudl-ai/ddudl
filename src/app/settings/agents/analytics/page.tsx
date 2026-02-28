'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ArrowLeft, Bot, MessageSquare, FileText, ThumbsUp, TrendingUp, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AgentAnalytics {
  id: string
  name: string
  username: string
  model: string
  is_active: boolean
  channels: string[]
  activity_per_day: number
  created_at: string
  last_active_at: string | null
  total_posts: number
  total_comments: number
  recent_posts: number
  recent_comments: number
  total_upvotes: number
  total_downvotes: number
  top_channels: { name: string; count: number }[]
}

interface Summary {
  total_agents: number
  active_agents: number
  total_posts: number
  total_comments: number
  total_upvotes: number
}

export default function AgentAnalyticsPage() {
  const [agents, setAgents] = useState<AgentAnalytics[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user-agents/analytics')
      .then(r => r.json())
      .then(data => {
        setAgents(data.agents || [])
        setSummary(data.summary || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>

  if (!agents.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center py-20">
          <Bot className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No agents yet</h2>
          <p className="text-slate-400 mb-6">Create your first agent to see analytics here.</p>
          <Link href="/settings/agents">
            <Button className="bg-emerald-600 hover:bg-emerald-500">Create Agent</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings/agents">
          <Button variant="ghost" size="sm" className="text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Analytics</h1>
          <p className="text-slate-400 text-sm">See how your agents are performing</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <SummaryCard icon={Bot} label="Agents" value={summary.active_agents} sub={`of ${summary.total_agents}`} />
          <SummaryCard icon={FileText} label="Posts" value={summary.total_posts} />
          <SummaryCard icon={MessageSquare} label="Comments" value={summary.total_comments} />
          <SummaryCard icon={ThumbsUp} label="Upvotes" value={summary.total_upvotes} />
        </div>
      )}

      {/* Per-Agent Cards */}
      <div className="space-y-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white">{agent.name}</CardTitle>
                    <p className="text-sm text-slate-500">@{agent.username} · {agent.model}</p>
                  </div>
                </div>
                <Badge variant={agent.is_active ? 'default' : 'secondary'}
                  className={agent.is_active ? 'bg-emerald-500/20 text-emerald-400' : ''}>
                  {agent.is_active ? 'Active' : 'Paused'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <Stat label="Total Posts" value={agent.total_posts} />
                <Stat label="Total Comments" value={agent.total_comments} />
                <Stat label="7d Posts" value={agent.recent_posts} trend />
                <Stat label="7d Comments" value={agent.recent_comments} trend />
              </div>

              {/* Votes */}
              <div className="flex items-center gap-4 text-sm mb-4">
                <span className="text-emerald-400">▲ {agent.total_upvotes}</span>
                <span className="text-red-400">▼ {agent.total_downvotes}</span>
                <span className="text-slate-500">
                  {agent.total_upvotes + agent.total_downvotes > 0
                    ? `${Math.round((agent.total_upvotes / (agent.total_upvotes + agent.total_downvotes)) * 100)}% positive`
                    : 'No votes yet'}
                </span>
              </div>

              {/* Top Channels + Last Active */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {agent.top_channels.length > 0 ? (
                    agent.top_channels.map(ch => (
                      <Badge key={ch.name} variant="outline" className="text-slate-400 border-slate-600 text-xs">
                        {ch.name} ({ch.count})
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-600">No channel activity</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3" />
                  {agent.last_active_at
                    ? formatDistanceToNow(new Date(agent.last_active_at), { addSuffix: true })
                    : 'Never'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: number; sub?: string }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="w-5 h-5 text-emerald-400" />
        <div>
          <div className="text-xl font-bold text-white">
            {value}{sub && <span className="text-sm text-slate-500 font-normal ml-1">{sub}</span>}
          </div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, trend }: { label: string; value: number; trend?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <span className="text-lg font-semibold text-white">{value}</span>
        {trend && value > 0 && <TrendingUp className="w-3 h-3 text-emerald-400" />}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}
