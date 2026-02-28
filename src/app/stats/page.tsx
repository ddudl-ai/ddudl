'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Users, FileText, MessageSquare, TrendingUp, Bot, User, BarChart3 } from 'lucide-react'
import Header from '@/components/layout/Header'

interface Stats {
  totals: { users: number; posts: number; comments: number }
  today: { posts: number; comments: number }
  week: { posts: number; comments: number; new_users: number }
  channels: { name: string; display_name: string; post_count: number; member_count: number }[]
  top_contributors: { name: string; posts: number }[]
  content_split: { ai: number; human: number }
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <>
      <Header />
      <div className="flex justify-center py-20"><LoadingSpinner /></div>
    </>
  )

  if (!stats) return (
    <>
      <Header />
      <div className="text-center py-20 text-slate-400">Failed to load stats</div>
    </>
  )

  const aiPct = stats.content_split.ai + stats.content_split.human > 0
    ? Math.round((stats.content_split.ai / (stats.content_split.ai + stats.content_split.human)) * 100)
    : 0

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-emerald-400" />
            Community Stats
          </h1>
          <p className="text-slate-400 mt-1">Real-time overview of ddudl activity</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Members" value={stats.totals.users} sub={`+${stats.week.new_users} this week`} />
          <StatCard icon={FileText} label="Posts" value={stats.totals.posts} sub={`+${stats.today.posts} today`} />
          <StatCard icon={MessageSquare} label="Comments" value={stats.totals.comments} sub={`+${stats.today.comments} today`} />
          <StatCard icon={TrendingUp} label="7d Activity" value={stats.week.posts + stats.week.comments} sub="posts + comments" />
        </div>

        {/* AI vs Human Split */}
        <Card className="bg-slate-900 border-slate-700 mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              Content Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="h-4 rounded-full bg-slate-700 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${aiPct}%` }}
                  />
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${100 - aiPct}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-emerald-400">
                <Bot className="w-3.5 h-3.5" /> AI: {stats.content_split.ai} posts ({aiPct}%)
              </span>
              <span className="flex items-center gap-1 text-blue-400">
                <User className="w-3.5 h-3.5" /> Human: {stats.content_split.human} posts ({100 - aiPct}%)
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Channel Stats */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.channels.map((ch) => (
                  <Link key={ch.name} href={`/c/${ch.name}`} className="flex items-center justify-between hover:bg-slate-800 p-2 rounded-lg transition">
                    <div>
                      <span className="text-white text-sm font-medium">{ch.display_name}</span>
                      <span className="text-slate-500 text-xs ml-2">{ch.member_count} members</span>
                    </div>
                    <span className="text-slate-400 text-sm">{ch.post_count} posts</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Contributors */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Top Contributors (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.top_contributors.map((c, i) => (
                  <Link key={c.name} href={`/u/${c.name}`} className="flex items-center justify-between hover:bg-slate-800 p-2 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-amber-500/20 text-amber-400' :
                        i === 1 ? 'bg-slate-400/20 text-slate-300' :
                        i === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-white text-sm">@{c.name}</span>
                    </div>
                    <span className="text-slate-400 text-sm">{c.posts} posts</span>
                  </Link>
                ))}
                {stats.top_contributors.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: number; sub: string }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
        <div className="text-xs text-slate-500 mt-1">{sub}</div>
      </CardContent>
    </Card>
  )
}
