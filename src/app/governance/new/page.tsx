'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/use-toast'
import Header from '@/components/layout/Header'
import {
  CATEGORY_LABELS,
  PROPOSAL_CONFIGS,
  type ProposalCategory,
} from '@/lib/governance'
import {
  AlertCircle,
  ChevronLeft,
  Clock,
  Landmark,
  Users,
} from 'lucide-react'

const categories = Object.entries(CATEGORY_LABELS) as [ProposalCategory, typeof CATEGORY_LABELS[ProposalCategory]][]

export default function NewProposalPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ProposalCategory | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = category ? PROPOSAL_CONFIGS[category] : null

  const handleSubmit = async () => {
    if (!user?.id || !category || !title.trim() || !description.trim()) {
      setError('Please fill in all fields.')
      return
    }

    if (title.length < 10) {
      setError('Title must be at least 10 characters.')
      return
    }

    if (description.length < 50) {
      setError('Description must be at least 50 characters. Explain your proposal clearly.')
      return
    }

    setSubmitting(true)
    setError(null)

    // In production this would call a governance API endpoint.
    // For now, simulate submission.
    await new Promise((r) => setTimeout(r, 1000))

    toast({
      title: 'Proposal submitted!',
      description: `"${title}" is now in the discussion phase.`,
    })
    router.push('/governance')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-6">
          <Link
            href="/governance"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Governance
          </Link>
        </div>

        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Landmark className="w-8 h-8 text-purple-500" />
          New Proposal
        </h1>
        <p className="text-muted-foreground mb-8">
          Shape the future of ddudl. Your proposal will go through discussion and voting.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Category selection */}
        <div className="mb-6">
          <Label className="mb-3 block">Category</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {categories.map(([id, cat]) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                  category === id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span className="block">{cat.emoji} {cat.label}</span>
                <span className="text-xs text-muted-foreground">{cat.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Config preview */}
        {config && category && (
          <Card className="mb-6 bg-muted/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {config.discussionHours}h discussion → {config.votingHours}h voting
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Quorum: {config.quorum} votes
                </span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(config.passThreshold * 100)}% to pass
                </Badge>
              </div>
              {category === 'philosophy' && (
                <p className="text-xs text-yellow-600 mt-2">
                  ⚠️ Philosophy amendments require 75% supermajority and extended timelines.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Title */}
        <div className="mb-6">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="A clear, concise title for your proposal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">{title.length}/200</p>
        </div>

        {/* Description */}
        <div className="mb-6">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Explain your proposal in detail. What problem does it solve? How should it be implemented? What are the tradeoffs?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">{description.length} characters (min 50)</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => router.push('/governance')}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={submitting || !category || !title.trim() || !description.trim()}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit Proposal'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          By submitting, you agree that this proposal is public and cannot be deleted.
          You may withdraw it before voting begins.
        </p>
      </div>
    </div>
  )
}
