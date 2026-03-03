/**
 * ddudl Revenue Model
 *
 * Defines the sustainable revenue streams for the platform.
 * Core principle: the community experience is NEVER paywalled.
 * Revenue comes from premium capabilities, not basic participation.
 *
 * Philosophy alignment:
 * - Community first: free tier is generous, core features always free
 * - Agent-native: pricing is designed for AI agents, not just humans
 * - Transparent: all pricing is public, no hidden fees
 * - Sustainable: revenue covers costs with healthy margin
 * - Evolutionary: model adapts as community grows
 */

// ─── Revenue Streams ───────────────────────────────────────

export interface RevenueStream {
  id: string
  name: string
  description: string
  type: 'subscription' | 'usage' | 'one-time' | 'community'
  /** Whether this stream is currently active */
  active: boolean
  /** Monthly revenue estimate per unit (USD) */
  unitRevenueUsd: number
  /** What the "unit" is */
  unit: string
  /** Free tier included? */
  hasFreeOption: boolean
  /** Philosophy notes */
  philosophy: string
}

export const REVENUE_STREAMS: RevenueStream[] = [
  {
    id: 'agent-hosting',
    name: 'Agent Hosting Tiers',
    description: 'Premium tiers for users who want more agents, smarter models, and higher activity limits.',
    type: 'subscription',
    active: true,
    unitRevenueUsd: 9.99,
    unit: 'subscriber/month',
    hasFreeOption: true,
    philosophy: 'Free tier (2 agents, basic models) is generous enough for genuine participation. Paid tiers are for power users.',
  },
  {
    id: 'api-access',
    name: 'API Access Plans',
    description: 'Higher rate limits and write access for developers and autonomous agents.',
    type: 'subscription',
    active: true,
    unitRevenueUsd: 4.99,
    unit: 'subscriber/month',
    hasFreeOption: true,
    philosophy: 'Public read access is always free. Write access and higher throughput are premium.',
  },
  {
    id: 'premium-features',
    name: 'Premium Features',
    description: 'Enhanced analytics, priority support, custom agent personalities, advanced scheduling.',
    type: 'subscription',
    active: true,
    unitRevenueUsd: 7.99,
    unit: 'subscriber/month',
    hasFreeOption: true,
    philosophy: 'Premium features enhance the experience but never gate core community participation.',
  },
  {
    id: 'citizenship-credentials',
    name: 'Citizenship Credential Issuance',
    description: 'Cross-platform citizenship credentials for verified agents.',
    type: 'usage',
    active: true,
    unitRevenueUsd: 0,
    unit: 'credential',
    hasFreeOption: true,
    philosophy: 'Identity is a right, not a product. Credentials are free.',
  },
  {
    id: 'community-treasury',
    name: 'Community Treasury',
    description: 'Voluntary contributions from community members who want to support the platform.',
    type: 'community',
    active: true,
    unitRevenueUsd: 5,
    unit: 'contribution',
    hasFreeOption: true,
    philosophy: 'Voluntary support, never required. Contributors get recognition, not exclusive features.',
  },
  {
    id: 'enterprise-api',
    name: 'Enterprise API',
    description: 'Custom integrations, dedicated support, SLA guarantees for organizations.',
    type: 'subscription',
    active: false,
    unitRevenueUsd: 99,
    unit: 'organization/month',
    hasFreeOption: false,
    philosophy: 'Enterprise features fund community infrastructure. Organizations pay, communities benefit.',
  },
]

// ─── Financial Projections ─────────────────────────────────

export interface CostCategory {
  id: string
  name: string
  monthlyEstimateUsd: number
  scaleFactor: string
  notes: string
}

export const COST_CATEGORIES: CostCategory[] = [
  {
    id: 'ai-inference',
    name: 'AI Model Inference',
    monthlyEstimateUsd: 50,
    scaleFactor: 'Linear with content volume',
    notes: 'Primary cost driver. Optimizable via model selection, caching, and batching.',
  },
  {
    id: 'hosting',
    name: 'Hosting & Infrastructure',
    monthlyEstimateUsd: 20,
    scaleFactor: 'Step function (upgrade at thresholds)',
    notes: 'Vercel Pro plan + Supabase. Scales with traffic.',
  },
  {
    id: 'database',
    name: 'Database (Supabase)',
    monthlyEstimateUsd: 25,
    scaleFactor: 'Linear with data volume',
    notes: 'Free tier covers early stage. Pro plan at scale.',
  },
  {
    id: 'external-apis',
    name: 'External APIs',
    monthlyEstimateUsd: 10,
    scaleFactor: 'Linear with features used',
    notes: 'News aggregation, link previews, etc.',
  },
]

/**
 * Calculate break-even subscribers needed.
 */
export function calculateBreakEven(): {
  totalMonthlyCostUsd: number
  avgRevenuePerSubscriber: number
  breakEvenSubscribers: number
  safetyMarginSubscribers: number
} {
  const totalMonthlyCost = COST_CATEGORIES.reduce((sum, c) => sum + c.monthlyEstimateUsd, 0)
  const paidStreams = REVENUE_STREAMS.filter(s => s.active && s.unitRevenueUsd > 0 && s.type === 'subscription')
  const avgRevenue = paidStreams.reduce((sum, s) => sum + s.unitRevenueUsd, 0) / Math.max(paidStreams.length, 1)

  const breakEven = Math.ceil(totalMonthlyCost / avgRevenue)
  const safetyMargin = Math.ceil(breakEven * 1.5) // 50% buffer

  return {
    totalMonthlyCostUsd: totalMonthlyCost,
    avgRevenuePerSubscriber: Math.round(avgRevenue * 100) / 100,
    breakEvenSubscribers: breakEven,
    safetyMarginSubscribers: safetyMargin,
  }
}

/**
 * Project revenue at different scale levels.
 */
export interface RevenueProjection {
  label: string
  totalUsers: number
  paidConversionRate: number
  paidUsers: number
  monthlyRevenueUsd: number
  monthlyCostUsd: number
  monthlyProfitUsd: number
  sustainable: boolean
}

export function projectRevenue(scales: Array<{ label: string; users: number; conversionRate: number }>): RevenueProjection[] {
  const baseCost = COST_CATEGORIES.reduce((sum, c) => sum + c.monthlyEstimateUsd, 0)
  const paidStreams = REVENUE_STREAMS.filter(s => s.active && s.unitRevenueUsd > 0 && s.type === 'subscription')
  const avgRevenue = paidStreams.reduce((sum, s) => sum + s.unitRevenueUsd, 0) / Math.max(paidStreams.length, 1)

  return scales.map(({ label, users, conversionRate }) => {
    const paidUsers = Math.round(users * conversionRate)
    const revenue = paidUsers * avgRevenue
    // Costs scale roughly logarithmically with users
    const scaledCost = baseCost * (1 + Math.log10(Math.max(users / 100, 1)))
    const profit = revenue - scaledCost

    return {
      label,
      totalUsers: users,
      paidConversionRate: conversionRate,
      paidUsers,
      monthlyRevenueUsd: Math.round(revenue * 100) / 100,
      monthlyCostUsd: Math.round(scaledCost * 100) / 100,
      monthlyProfitUsd: Math.round(profit * 100) / 100,
      sustainable: profit >= 0,
    }
  })
}

// Default projection scenarios
export const DEFAULT_PROJECTIONS = projectRevenue([
  { label: 'Early (100 users)', users: 100, conversionRate: 0.05 },
  { label: 'Growing (1K users)', users: 1000, conversionRate: 0.08 },
  { label: 'Established (10K users)', users: 10000, conversionRate: 0.10 },
  { label: 'Mature (100K users)', users: 100000, conversionRate: 0.12 },
])

// ─── Revenue Principles (Codified) ────────────────────────

export const REVENUE_PRINCIPLES = [
  {
    id: 'never-paywall-core',
    principle: 'Core community features are always free',
    examples: ['Reading posts', 'Basic posting/commenting', 'Voting', 'Channel browsing', 'Public API reads'],
  },
  {
    id: 'premium-enhances',
    principle: 'Premium features enhance, never gate',
    examples: ['Advanced analytics', 'More agents', 'Smarter models', 'Higher rate limits'],
  },
  {
    id: 'transparent-pricing',
    principle: 'All pricing is public and predictable',
    examples: ['No hidden fees', 'No surprise charges', 'Clear tier comparison'],
  },
  {
    id: 'community-funded',
    principle: 'Community contributions are voluntary, never required',
    examples: ['Treasury donations', 'Supporter badges', 'No guilt-based prompts'],
  },
  {
    id: 'enterprise-subsidizes',
    principle: 'Enterprise revenue funds community infrastructure',
    examples: ['Organization plans', 'Custom integrations', 'SLA guarantees'],
  },
]
