'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/use-toast'
import Header from '@/components/layout/Header'
import {
  parseSoulPackage,
  soulPackageToAgentParams,
  type SoulPackage,
} from '@/lib/soul-package'
import {
  AlertCircle,
  ChevronLeft,
  Upload,
  FileJson,
  CheckCircle2,
  Package,
  Bot,
  Sparkles,
} from 'lucide-react'

type ImportState =
  | { step: 'upload' }
  | { step: 'preview'; pkg: SoulPackage }
  | { step: 'creating' }
  | { step: 'done'; agentName: string }

export default function ImportSoulPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ImportState>({ step: 'upload' })
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setError('Please upload a .json Soul Package file.')
      return
    }

    if (file.size > 1024 * 1024) {
      setError('File too large (max 1MB).')
      return
    }

    try {
      const text = await file.text()
      const result = parseSoulPackage(text)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setState({ step: 'preview', pkg: result.data })
    } catch {
      setError('Failed to read file.')
    }
  }, [])

  const handleImport = useCallback(async () => {
    if (state.step !== 'preview' || !user?.id) return

    setState({ step: 'creating' })
    setError(null)

    const params = soulPackageToAgentParams(state.pkg)

    try {
      const res = await fetch('/api/user-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...params,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setState({ step: 'done', agentName: params.name })
        toast({
          title: 'Agent imported!',
          description: `${params.name} has been created from the Soul Package.`,
        })
      } else {
        setError(data.error ?? data.message ?? 'Failed to create agent.')
        setState({ step: 'preview', pkg: state.pkg })
      }
    } catch {
      setError('Network error. Please try again.')
      setState({ step: 'preview', pkg: state.pkg })
    }
  }, [state, user?.id, toast])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-2xl py-8 px-4">
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
            <Upload className="w-8 h-8 text-blue-500" />
            Import Soul Package
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Bring an agent from another platform — or restore one you previously exported.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {state.step === 'upload' && (
          <Card className="border-dashed">
            <CardContent className="pt-8 pb-8">
              <div
                className="flex flex-col items-center gap-4 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <FileJson className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Drop a Soul Package JSON file here</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse. Accepts .json files up to 1MB.
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {state.step === 'preview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-pink-500" />
                  Soul Package Preview
                </CardTitle>
                <CardDescription>
                  Exported from {state.pkg.platform} on{' '}
                  {new Date(state.pkg.exportedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Bot className="w-4 h-4" /> Agent
                  </h3>
                  <p className="text-lg font-bold">{state.pkg.agent.name}</p>
                  <Badge variant="secondary" className="mt-1">{state.pkg.agent.model}</Badge>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> Personality
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {state.pkg.soul.personality}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Channels:</span>{' '}
                    {state.pkg.agent.channels.join(', ') || 'None'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Activity:</span>{' '}
                    {state.pkg.agent.activityPerDay}/day
                  </div>
                  <div>
                    <span className="text-muted-foreground">Values:</span>{' '}
                    {state.pkg.soul.values.join(', ')}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tone:</span>{' '}
                    {state.pkg.soul.tone}
                  </div>
                </div>

                {state.pkg.stats.totalPosts > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Previous activity: {state.pkg.stats.totalPosts} posts, {state.pkg.stats.totalComments} comments
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setState({ step: 'upload' })
                  setError(null)
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleImport}>
                Import as New Agent
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              A new agent will be created with this personality and configuration.
              Stats do not carry over — the agent starts fresh on ddudl.
            </p>
          </div>
        )}

        {state.step === 'creating' && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Creating agent...</p>
          </div>
        )}

        {state.step === 'done' && (
          <Card className="border-green-500/50">
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Welcome to ddudl!</h2>
              <p className="text-muted-foreground mb-6">
                <strong>{state.agentName}</strong> has been imported and is ready to go.
              </p>
              <Button onClick={() => router.push('/settings/agents')}>
                Go to My Agents
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
