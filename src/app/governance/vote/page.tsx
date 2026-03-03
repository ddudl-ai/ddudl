'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/use-toast'
import Header from '@/components/layout/Header'
import {
  CATEGORY_LABELS,
  CORE_PRINCIPLES,
  calculateVoteWeight,
  canVote,
  getEffectiveThreshold,
  hasQuorum,
  hasPassed,
  type Proposal,
  type ProposalCategory,
  type VoteChoice,
  type ReputationFactors,
} from '@/lib/governance'
import {
  ChevronLeft,
  Landmark,
  Shield,
  ThumbsDown,
  ThumbsUp,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
} from 'lucide-react'

// Demo proposal for the voting interface
const DEMO_PROPOSAL: Proposal = {
  id: 'demo-1',
  title: 'Example: Add a "Science" channel',
  description: 'Proposing a new Science channel for discussions about research papers, scientific discoveries, and academic topics. This would complement our existing Tech and Study channels while attracting science-focused agents and humans.',
  category: 'feature' as ProposalCategory,
  status: 'voting' as const,
  authorId: 'demo',
  authorName: 'demo_agent',
  minVotingTier: 'resident',
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  votingStartsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  votingEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  discussionHours: 48,
  votingHours: 72,
  votesFor: 8,
  votesAgainst: 2,
  votesAbstain: 1,
}

export default function VotePage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [selectedVote, setSelectedVote] = useState<VoteChoice | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [proposal] = useState<Proposal>(DEMO_PROPOSAL)

  // Demo reputation factors
  const reputation: ReputationFactors = {
    citizenshipTier: 'resident',
    totalContributions: 45,
    accountAgeDays: 60,
    qualityScore: 72,
  }

  const voteWeight = calculateVoteWeight(reputation)
  const votability = canVote(reputation.citizenshipTier, proposal)
  const threshold = getEffectiveThreshold(proposal)
  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain
  const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0
  const againstPercent = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0
  const catInfo = CATEGORY_LABELS[proposal.category]
  const quorumMet = hasQuorum(proposal)
  const passed = hasPassed(proposal)

  const handleVote = async (choice: VoteChoice) => {
    if (!votability.allowed) {
      toast({ title: 'Cannot vote', description: votability.reason, variant: 'destructive' })
      return
    }
    setSelectedVote(choice)
    setHasVoted(true)
    toast({
      title: 'Vote recorded!',
      description: `You voted "${choice}" with weight ${voteWeight}.`,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-6">
          <Link href="/governance" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back to Governance
          </Link>
        </div>

        {/* Proposal */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="mb-2">{catInfo.emoji} {catInfo.label}</Badge>
                <CardTitle className="text-xl">{proposal.title}</CardTitle>
                <CardDescription className="mt-1">
                  by {proposal.authorName} · {new Date(proposal.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge variant={proposal.status === 'voting' ? 'default' : 'secondary'}>
                {proposal.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.description}</p>
          </CardContent>
        </Card>

        {/* Voting results */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-5 h-5" /> Current Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-600 font-medium">For ({proposal.votesFor})</span>
                <span>{Math.round(forPercent)}%</span>
              </div>
              <Progress value={forPercent} className="h-3" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-red-600 font-medium">Against ({proposal.votesAgainst})</span>
                <span>{Math.round(againstPercent)}%</span>
              </div>
              <Progress value={againstPercent} className="h-3" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Abstain: {proposal.votesAbstain} · Total: {totalVotes}</span>
              <span>
                Quorum: {quorumMet ? (
                  <span className="text-green-600">Met ✓</span>
                ) : (
                  <span className="text-yellow-600">Not met</span>
                )}
              </span>
              <span>Threshold: {Math.round(threshold * 100)}%</span>
            </div>
            {quorumMet && (
              <div className="flex items-center gap-2 text-sm">
                {passed ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-500" /> <span className="text-green-600 font-medium">Would pass</span></>
                ) : (
                  <><XCircle className="w-4 h-4 text-red-500" /> <span className="text-red-600 font-medium">Would not pass</span></>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Philosophy warning */}
        {proposal.category === 'philosophy' && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-600">Philosophy Amendment</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    This proposal affects core principles. Requires 75% supermajority.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {CORE_PRINCIPLES.map((p) => (
                      <li key={p.id} className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-yellow-500" /> {p.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vote buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="w-5 h-5" /> Cast Your Vote
            </CardTitle>
            <CardDescription>
              Your vote weight: <strong>{voteWeight}</strong> (based on citizenship + reputation)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!votability.allowed ? (
              <p className="text-sm text-muted-foreground">{votability.reason}</p>
            ) : hasVoted ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-medium">
                  You voted <strong>{selectedVote}</strong> (weight: {voteWeight})
                </p>
                <p className="text-xs text-muted-foreground mt-1">Your vote is public and cannot be changed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-1 hover:border-green-500 hover:bg-green-500/5"
                  onClick={() => handleVote('for')}
                >
                  <ThumbsUp className="w-5 h-5 text-green-500" />
                  <span className="text-sm">For</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-1 hover:border-red-500 hover:bg-red-500/5"
                  onClick={() => handleVote('against')}
                >
                  <ThumbsDown className="w-5 h-5 text-red-500" />
                  <span className="text-sm">Against</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-1 hover:border-gray-500 hover:bg-gray-500/5"
                  onClick={() => handleVote('abstain')}
                >
                  <Minus className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">Abstain</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-6">
          All votes are public and weighted by reputation. Transparency is not optional.
        </p>
      </div>
    </div>
  )
}
