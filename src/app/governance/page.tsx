import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CATEGORY_LABELS,
  PROPOSAL_CONFIGS,
  type ProposalCategory,
} from '@/lib/governance'
import {
  FileText,
  Landmark,
  Plus,
  Clock,
  Users,
  Vote,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Governance — ddudl',
  description: 'Community governance on ddudl. Submit proposals, discuss, and vote on the future of the platform.',
}

const categories = Object.entries(CATEGORY_LABELS) as [ProposalCategory, typeof CATEGORY_LABELS[ProposalCategory]][]

export default function GovernancePage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Landmark className="w-10 h-10 text-purple-500" />
            Governance
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl">
            ddudl is governed by its community. Citizens can submit proposals,
            discuss changes, and vote on the platform&apos;s future. Every decision is public.
          </p>
        </div>
        <Link href="/governance/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> New Proposal
          </Button>
        </Link>
      </div>

      {/* How it works */}
      <Card className="mb-10 border-dashed">
        <CardContent className="pt-6">
          <h2 className="font-semibold text-lg mb-4">How Governance Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">1. Propose</p>
                <p className="text-xs text-muted-foreground">
                  Any Citizen can submit a proposal. Choose a category, describe your idea, and publish.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Users className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">2. Discuss</p>
                <p className="text-xs text-muted-foreground">
                  Community discusses the proposal during the discussion period. Refine and iterate.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Vote className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">3. Vote</p>
                <p className="text-xs text-muted-foreground">
                  After discussion, voting opens. For, Against, or Abstain. Results are binding.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposal categories */}
      <h2 className="text-xl font-semibold mb-4">Proposal Categories</h2>
      <div className="grid gap-4 md:grid-cols-2 mb-10">
        {categories.map(([id, cat]) => {
          const config = PROPOSAL_CONFIGS[id]
          return (
            <Card key={id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{cat.emoji}</span> {cat.label}
                </CardTitle>
                <CardDescription>{cat.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {config.discussionHours}h discuss + {config.votingHours}h vote
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Quorum: {config.quorum}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(config.passThreshold * 100)}% to pass
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Active proposals placeholder */}
      <h2 className="text-xl font-semibold mb-4">Active Proposals</h2>
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Landmark className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No active proposals yet.</p>
          <p className="text-sm mt-1">
            Be the first to shape ddudl&apos;s future.{' '}
            <Link href="/governance/new" className="underline hover:text-foreground">
              Submit a proposal
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Philosophy protection notice */}
      <div className="mt-10 text-center text-sm text-muted-foreground max-w-lg mx-auto">
        <p>
          🧭 <strong>Philosophy amendments</strong> require a supermajority (75%) and extended
          timelines (1 week discussion + 1 week voting). Core principles are protected by design.
        </p>
      </div>
    </div>
  )
}
