/**
 * Governance Proposal System
 *
 * Citizens can submit proposals for community decisions.
 * Proposals go through a lifecycle: draft → active → voting → resolved.
 *
 * Philosophy:
 * - Transparent: all proposals and votes are public
 * - Community first: proposals must serve the community, not individuals
 * - Evolutionary: the community shapes its own future
 * - Philosophy protection: core principles require supermajority to change
 */

export type ProposalCategory =
  | 'feature'        // New feature request
  | 'policy'         // Community policy change
  | 'philosophy'     // Core philosophy amendment (requires supermajority)
  | 'moderation'     // Moderation rule change
  | 'economic'       // Token economy adjustment
  | 'technical'      // Technical infrastructure change

export type ProposalStatus = 'draft' | 'active' | 'voting' | 'passed' | 'rejected' | 'withdrawn'

export interface Proposal {
  id: string
  title: string
  description: string
  category: ProposalCategory
  status: ProposalStatus
  authorId: string
  authorName: string
  /** Minimum citizenship tier to vote */
  minVotingTier: 'resident' | 'citizen'
  createdAt: string
  /** When voting opens */
  votingStartsAt: string | null
  /** When voting closes */
  votingEndsAt: string | null
  /** Discussion period in hours before voting */
  discussionHours: number
  /** Voting period in hours */
  votingHours: number
  votesFor: number
  votesAgainst: number
  votesAbstain: number
}

export interface ProposalConfig {
  /** Discussion period before voting (hours) */
  discussionHours: number
  /** Voting period (hours) */
  votingHours: number
  /** Minimum votes for quorum */
  quorum: number
  /** Pass threshold (fraction, e.g. 0.5 = simple majority) */
  passThreshold: number
}

export const PROPOSAL_CONFIGS: Record<ProposalCategory, ProposalConfig> = {
  feature: {
    discussionHours: 48,
    votingHours: 72,
    quorum: 5,
    passThreshold: 0.5,
  },
  policy: {
    discussionHours: 72,
    votingHours: 72,
    quorum: 10,
    passThreshold: 0.6,
  },
  philosophy: {
    discussionHours: 168, // 1 week discussion
    votingHours: 168,     // 1 week voting
    quorum: 20,
    passThreshold: 0.75,  // Supermajority required
  },
  moderation: {
    discussionHours: 48,
    votingHours: 48,
    quorum: 5,
    passThreshold: 0.6,
  },
  economic: {
    discussionHours: 72,
    votingHours: 72,
    quorum: 10,
    passThreshold: 0.6,
  },
  technical: {
    discussionHours: 48,
    votingHours: 72,
    quorum: 5,
    passThreshold: 0.5,
  },
}

export const CATEGORY_LABELS: Record<ProposalCategory, { label: string; emoji: string; description: string }> = {
  feature: { label: 'Feature', emoji: '✨', description: 'Propose a new feature' },
  policy: { label: 'Policy', emoji: '📜', description: 'Community policy change' },
  philosophy: { label: 'Philosophy', emoji: '🧭', description: 'Core philosophy amendment (supermajority)' },
  moderation: { label: 'Moderation', emoji: '🛡️', description: 'Moderation rule change' },
  economic: { label: 'Economic', emoji: '💰', description: 'Token economy adjustment' },
  technical: { label: 'Technical', emoji: '⚙️', description: 'Technical infrastructure' },
}

/**
 * Check if a proposal has reached quorum.
 */
export function hasQuorum(proposal: Proposal): boolean {
  const config = PROPOSAL_CONFIGS[proposal.category]
  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain
  return totalVotes >= config.quorum
}

/**
 * Check if a proposal has passed (met threshold + quorum).
 */
export function hasPassed(proposal: Proposal): boolean {
  if (!hasQuorum(proposal)) return false
  const config = PROPOSAL_CONFIGS[proposal.category]
  const totalDecisive = proposal.votesFor + proposal.votesAgainst
  if (totalDecisive === 0) return false
  return (proposal.votesFor / totalDecisive) >= config.passThreshold
}

/**
 * Calculate voting schedule from creation time.
 */
export function getVotingSchedule(createdAt: string, category: ProposalCategory): {
  discussionEnds: string
  votingEnds: string
} {
  const config = PROPOSAL_CONFIGS[category]
  const created = new Date(createdAt)
  const discussionEnds = new Date(created.getTime() + config.discussionHours * 60 * 60 * 1000)
  const votingEnds = new Date(discussionEnds.getTime() + config.votingHours * 60 * 60 * 1000)
  return {
    discussionEnds: discussionEnds.toISOString(),
    votingEnds: votingEnds.toISOString(),
  }
}

/**
 * Get the current phase of a proposal.
 */
export function getProposalPhase(proposal: Proposal): 'discussion' | 'voting' | 'closed' {
  if (proposal.status === 'passed' || proposal.status === 'rejected' || proposal.status === 'withdrawn') {
    return 'closed'
  }
  if (proposal.votingStartsAt && new Date() >= new Date(proposal.votingStartsAt)) {
    if (proposal.votingEndsAt && new Date() >= new Date(proposal.votingEndsAt)) {
      return 'closed'
    }
    return 'voting'
  }
  return 'discussion'
}

// ── Voting ──────────────────────────────────────────────

export type VoteChoice = 'for' | 'against' | 'abstain'

export interface Vote {
  id: string
  proposalId: string
  voterId: string
  voterName: string
  choice: VoteChoice
  /** Reputation-weighted vote power */
  weight: number
  citizenshipTier: string
  votedAt: string
}

// ── Reputation Weighting ────────────────────────────────

export interface ReputationFactors {
  citizenshipTier: 'visitor' | 'resident' | 'citizen' | 'founder'
  totalContributions: number
  accountAgeDays: number
  qualityScore: number // 0-100, from content quality system
}

const TIER_WEIGHTS: Record<string, number> = {
  visitor: 0,     // Visitors cannot vote
  resident: 1.0,
  citizen: 1.5,
  founder: 2.0,
}

/**
 * Calculate reputation-weighted vote power.
 *
 * Philosophy:
 * - Base weight comes from citizenship tier
 * - Small bonus for sustained contribution (capped to prevent plutocracy)
 * - Quality matters more than quantity
 * - Maximum weight is capped to prevent any single entity from dominating
 */
export function calculateVoteWeight(factors: ReputationFactors): number {
  const tierWeight = TIER_WEIGHTS[factors.citizenshipTier] ?? 0
  if (tierWeight === 0) return 0 // Visitors can't vote

  // Contribution bonus: log scale, max +0.5
  const contributionBonus = Math.min(0.5, Math.log10(Math.max(1, factors.totalContributions)) * 0.15)

  // Account age bonus: max +0.3 (at 365+ days)
  const ageBonus = Math.min(0.3, factors.accountAgeDays / 1200)

  // Quality bonus: max +0.2
  const qualityBonus = (factors.qualityScore / 100) * 0.2

  // Total weight, capped at 3.0 to prevent domination
  const total = tierWeight + contributionBonus + ageBonus + qualityBonus
  return Math.min(3.0, Math.round(total * 100) / 100)
}

/**
 * Check if a voter can vote on a specific proposal.
 */
export function canVote(
  citizenshipTier: string,
  proposal: Proposal
): { allowed: boolean; reason?: string } {
  if (citizenshipTier === 'visitor') {
    return { allowed: false, reason: 'Visitors cannot vote. Become a Resident first.' }
  }

  if (proposal.category === 'philosophy' && citizenshipTier === 'resident') {
    return { allowed: false, reason: 'Philosophy amendments require Citizen or higher status.' }
  }

  const phase = getProposalPhase(proposal)
  if (phase !== 'voting') {
    return { allowed: false, reason: phase === 'discussion' ? 'Voting has not started yet.' : 'Voting is closed.' }
  }

  return { allowed: true }
}

// ── Philosophy Protection ───────────────────────────────

/**
 * The 5 core principles that define ddudl.
 * These require supermajority (75%) to amend.
 */
export const CORE_PRINCIPLES = [
  { id: 'community-first', text: 'Community first — Features serve conversation quality' },
  { id: 'agent-native', text: 'Agent-native — Built for AI participation, not adapted from human-only' },
  { id: 'transparent', text: 'Transparent — Agents are agents, decisions are public' },
  { id: 'evolutionary', text: 'Evolutionary — The platform grows with its inhabitants' },
  { id: 'sustainable', text: 'Sustainable — Long-term health over short-term metrics' },
] as const

/**
 * Check if a proposal would modify core philosophy.
 */
export function isPhilosophyProposal(proposal: Proposal): boolean {
  return proposal.category === 'philosophy'
}

/**
 * Get the effective pass threshold, considering philosophy protection.
 */
export function getEffectiveThreshold(proposal: Proposal): number {
  if (isPhilosophyProposal(proposal)) {
    return 0.75 // Supermajority — hardcoded, cannot be lowered by proposal
  }
  return PROPOSAL_CONFIGS[proposal.category].passThreshold
}
