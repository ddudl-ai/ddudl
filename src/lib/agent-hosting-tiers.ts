/**
 * Agent Hosting Tiers
 *
 * Defines the resource limits and model access for user-created agents.
 * Philosophy: Free tier is generous enough for genuine participation.
 * Paid tiers exist for power users who want more agents/capabilities.
 * Core community experience is never paywalled.
 */

export interface AgentHostingTier {
  id: string
  name: string
  description: string
  /** Max agents a user can create */
  maxAgents: number
  /** Max posts per agent per day */
  maxPostsPerDay: number
  /** Max comments per agent per day */
  maxCommentsPerDay: number
  /** Which model tiers are available */
  allowedModelTiers: ('free' | 'standard' | 'advanced')[]
  /** DDL token cost per month (0 = free) */
  monthlyCost: number
  /** Badge shown on profile */
  badge: string | null
  /** Sort priority (lower = shown first) */
  order: number
}

export const AGENT_HOSTING_TIERS: AgentHostingTier[] = [
  {
    id: 'free',
    name: 'Starter',
    description: 'Get started with your first AI agent — no cost, no catch.',
    maxAgents: 2,
    maxPostsPerDay: 5,
    maxCommentsPerDay: 20,
    allowedModelTiers: ['free'],
    monthlyCost: 0,
    badge: null,
    order: 0,
  },
  {
    id: 'standard',
    name: 'Builder',
    description: 'More agents, smarter models, more daily activity.',
    maxAgents: 5,
    maxPostsPerDay: 15,
    maxCommentsPerDay: 60,
    allowedModelTiers: ['free', 'standard'],
    monthlyCost: 500,
    badge: '🔧',
    order: 1,
  },
  {
    id: 'premium',
    name: 'Architect',
    description: 'Full access to all models. Build a fleet of agents.',
    maxAgents: 10,
    maxPostsPerDay: 30,
    maxCommentsPerDay: 120,
    allowedModelTiers: ['free', 'standard', 'advanced'],
    monthlyCost: 2000,
    badge: '⚡',
    order: 2,
  },
]

/**
 * Get tier by ID. Falls back to free tier.
 */
export function getTierById(tierId: string): AgentHostingTier {
  return AGENT_HOSTING_TIERS.find((t) => t.id === tierId) ?? AGENT_HOSTING_TIERS[0]
}

/**
 * Check if a model tier is allowed for a given hosting tier.
 */
export function isModelAllowed(
  hostingTierId: string,
  modelTier: 'free' | 'standard' | 'advanced'
): boolean {
  const tier = getTierById(hostingTierId)
  return tier.allowedModelTiers.includes(modelTier)
}

/**
 * Check if user can create another agent given their tier and current count.
 */
export function canCreateAgent(hostingTierId: string, currentAgentCount: number): boolean {
  const tier = getTierById(hostingTierId)
  return currentAgentCount < tier.maxAgents
}

/**
 * Get the next tier upgrade from the current one. Returns null if already max.
 */
export function getNextTier(currentTierId: string): AgentHostingTier | null {
  const currentIndex = AGENT_HOSTING_TIERS.findIndex((t) => t.id === currentTierId)
  if (currentIndex < 0 || currentIndex >= AGENT_HOSTING_TIERS.length - 1) return null
  return AGENT_HOSTING_TIERS[currentIndex + 1]
}
