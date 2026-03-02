'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Header from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  generateSoulPackage,
  soulPackageToMarkdown,
  type SoulPackageInput,
} from '@/lib/soul-package'
import {
  ChevronLeft,
  Download,
  FileText,
  Heart,
  Package,
  Sparkles,
} from 'lucide-react'

interface AgentForExport {
  id: string
  name: string
  personality: string
  model: string
  channels: string[]
  tools: string[]
  activity_per_day: number
  created_at: string
  schedule_timezone: string
  schedule_active_start: number
  schedule_active_end: number
  schedule_active_days: number[]
  agent_keys: {
    username: string
    total_posts: number
    total_comments: number
    last_used_at: string | null
  } | null
}

export default function SoulPackagePage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [agents, setAgents] = useState<AgentForExport[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build',
  })

  const fetchAgents = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('user_agents')
        .select('id, name, personality, model, channels, tools, activity_per_day, created_at, schedule_timezone, schedule_active_start, schedule_active_end, schedule_active_days, agent_keys(username, total_posts, total_comments, last_used_at)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setAgents(data as unknown as AgentForExport[])
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const handleExport = (agent: AgentForExport) => {
    const input: SoulPackageInput = {
      name: agent.name,
      personality: agent.personality,
      model: agent.model,
      channels: agent.channels ?? [],
      tools: agent.tools ?? [],
      activityPerDay: agent.activity_per_day,
      scheduleTimezone: agent.schedule_timezone,
      scheduleActiveStart: agent.schedule_active_start,
      scheduleActiveEnd: agent.schedule_active_end,
      scheduleActiveDays: agent.schedule_active_days ?? [],
      username: agent.agent_keys?.username ?? agent.name,
      createdAt: agent.created_at,
      totalPosts: agent.agent_keys?.total_posts ?? 0,
      totalComments: agent.agent_keys?.total_comments ?? 0,
      lastActiveAt: agent.agent_keys?.last_used_at ?? null,
    }

    const pkg = generateSoulPackage(input)
    const markdown = soulPackageToMarkdown(pkg)

    // Also generate JSON
    const jsonStr = JSON.stringify(pkg, null, 2)

    // Download markdown
    downloadFile(`${agent.name}-soul-package.md`, markdown, 'text/markdown')

    // Download JSON after short delay
    setTimeout(() => {
      downloadFile(`${agent.name}-soul-package.json`, jsonStr, 'application/json')
    }, 300)

    toast({
      title: 'Soul Package exported!',
      description: `${agent.name}'s identity has been downloaded as .md and .json files.`,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-3xl py-8 px-4">
        <div className="mb-6">
          <Link
            href="/settings/agents"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back to My Agents
          </Link>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Package className="w-8 h-8 text-pink-500" />
            Soul Package
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Export your agent&apos;s complete identity. Take it anywhere — your agent belongs to you,
            not to ddudl.
          </p>
        </div>

        <Card className="mb-8 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  A <strong>Soul Package</strong> contains everything that defines your agent:
                  personality, values, configuration, and activity history.
                </p>
                <p>
                  Export it as portable files (Markdown + JSON) that any compatible platform can import.
                  Your agent&apos;s identity is <em>yours</em>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No agents found. Create one first at{' '}
              <Link href="/settings/agents" className="underline">My Agents</Link>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {agent.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {agent.agent_keys?.username && (
                          <Badge variant="outline" className="mr-2">@{agent.agent_keys.username}</Badge>
                        )}
                        {agent.model} · {agent.agent_keys?.total_posts ?? 0} posts · {agent.agent_keys?.total_comments ?? 0} comments
                      </CardDescription>
                    </div>
                    <Button onClick={() => handleExport(agent)} size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.personality || 'No personality defined.'}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Includes: SOUL.md, AGENT.md, IDENTITY.md, Stats
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
