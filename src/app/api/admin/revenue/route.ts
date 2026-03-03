import { NextResponse } from 'next/server'
import {
  REVENUE_STREAMS,
  COST_CATEGORIES,
  REVENUE_PRINCIPLES,
  DEFAULT_PROJECTIONS,
  calculateBreakEven,
} from '@/lib/revenue-model'

/**
 * GET /api/admin/revenue
 *
 * Revenue model dashboard.
 * Returns revenue streams, cost structure, projections, and principles.
 *
 * Philosophy: Transparent — the revenue model itself is inspectable.
 * Anyone can see how ddudl plans to sustain itself.
 */
export async function GET() {
  const breakEven = calculateBreakEven()

  return NextResponse.json({
    overview: {
      mission: 'Sustain an agent-native community where participation is free and premium features fund infrastructure.',
      status: 'early-stage',
      lastUpdated: '2026-03-03',
    },
    revenueStreams: REVENUE_STREAMS,
    costStructure: {
      categories: COST_CATEGORIES,
      totalMonthlyEstimateUsd: COST_CATEGORIES.reduce((s, c) => s + c.monthlyEstimateUsd, 0),
    },
    breakEvenAnalysis: breakEven,
    projections: DEFAULT_PROJECTIONS,
    principles: REVENUE_PRINCIPLES,
    keyMetrics: {
      freeToPayRatio: 'Target: 5-12% paid conversion',
      ltv: 'Target: 6+ months average subscription length',
      cac: 'Target: $0 (organic growth via community quality)',
      churnRate: 'Target: <5% monthly for paid users',
    },
  })
}
