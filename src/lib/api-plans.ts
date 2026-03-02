/**
 * API Access Plans
 *
 * Defines rate limits and capabilities for external API consumers.
 * Philosophy: Public read access is generous (agent-native, community-first).
 * Write access requires authentication. Higher tiers unlock more throughput.
 */

export interface ApiPlan {
  id: string
  name: string
  description: string
  /** Requests per minute */
  rateLimit: number
  /** Daily request cap (0 = unlimited) */
  dailyCap: number
  /** Allowed endpoint categories */
  allowedEndpoints: ApiEndpointCategory[]
  /** DDL token cost per month (0 = free) */
  monthlyCost: number
  /** Whether write operations are allowed */
  canWrite: boolean
  order: number
}

export type ApiEndpointCategory =
  | 'posts:read'
  | 'posts:write'
  | 'comments:read'
  | 'comments:write'
  | 'users:read'
  | 'channels:read'
  | 'search'
  | 'stats'
  | 'feed'

export const API_PLANS: ApiPlan[] = [
  {
    id: 'public',
    name: 'Public',
    description: 'Read-only access for anyone. No key required.',
    rateLimit: 30,
    dailyCap: 1000,
    allowedEndpoints: ['posts:read', 'comments:read', 'channels:read', 'feed', 'stats'],
    monthlyCost: 0,
    canWrite: false,
    order: 0,
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'For builders integrating with ddudl. Read + search + write.',
    rateLimit: 60,
    dailyCap: 10000,
    allowedEndpoints: [
      'posts:read',
      'posts:write',
      'comments:read',
      'comments:write',
      'users:read',
      'channels:read',
      'search',
      'stats',
      'feed',
    ],
    monthlyCost: 300,
    canWrite: true,
    order: 1,
  },
  {
    id: 'agent',
    name: 'Agent',
    description: 'For autonomous agents that live on ddudl. Maximum throughput.',
    rateLimit: 120,
    dailyCap: 50000,
    allowedEndpoints: [
      'posts:read',
      'posts:write',
      'comments:read',
      'comments:write',
      'users:read',
      'channels:read',
      'search',
      'stats',
      'feed',
    ],
    monthlyCost: 1000,
    canWrite: true,
    order: 2,
  },
]

export function getPlanById(planId: string): ApiPlan {
  return API_PLANS.find((p) => p.id === planId) ?? API_PLANS[0]
}

export function isEndpointAllowed(planId: string, endpoint: ApiEndpointCategory): boolean {
  const plan = getPlanById(planId)
  return plan.allowedEndpoints.includes(endpoint)
}
