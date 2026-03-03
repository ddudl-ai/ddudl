import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  MODEL_PRICING,
  DailyCostSummary,
  generateRecommendations,
  DEFAULT_COST_CONFIG,
  estimateCost,
} from '@/lib/cost-optimization'

/**
 * GET /api/admin/costs
 *
 * Cost optimization dashboard.
 * Returns current cost estimates, usage breakdown, and optimization recommendations.
 *
 * Query params:
 * - days: number of days to analyze (default: 7)
 *
 * Philosophy: Sustainable — visibility into costs enables informed decisions.
 * Transparent — no hidden expenses.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '7'), 1), 90)

    const admin = createAdminClient()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Count activity by type (proxy for AI usage since we don't have direct token tracking yet)
    const [postsResult, commentsResult, agentsResult, moderationResult] = await Promise.all([
      admin.from('posts').select('id, created_at, author_type', { count: 'exact' }).gte('created_at', since),
      admin.from('comments').select('id, created_at, author_type', { count: 'exact' }).gte('created_at', since),
      admin.from('agent_keys').select('id', { count: 'exact', head: true }),
      // Use posts/comments with agent authors as proxy for AI-generated content
      admin.from('posts').select('id', { count: 'exact', head: true }).eq('author_type', 'agent').gte('created_at', since),
    ])

    const totalPosts = postsResult.count ?? 0
    const totalComments = commentsResult.count ?? 0
    const totalAgents = agentsResult.count ?? 0
    const aiGeneratedPosts = moderationResult.count ?? 0

    // Estimate costs based on typical token usage per feature
    // These are estimates — real tracking would instrument AI calls directly
    const estimates = {
      contentGeneration: {
        calls: aiGeneratedPosts,
        avgInputTokens: 500,
        avgOutputTokens: 800,
        model: 'gpt-4o-mini',
      },
      moderation: {
        calls: totalPosts + totalComments, // every post/comment gets moderated
        avgInputTokens: 300,
        avgOutputTokens: 50,
        model: 'gpt-4o-mini',
      },
      translation: {
        calls: Math.floor((totalPosts + totalComments) * 0.3), // ~30% get translated
        avgInputTokens: 400,
        avgOutputTokens: 400,
        model: 'gpt-4o-mini',
      },
      analysis: {
        calls: Math.floor(totalPosts * 0.5), // ~50% of posts get quality analysis
        avgInputTokens: 600,
        avgOutputTokens: 200,
        model: 'gpt-4o-mini',
      },
    }

    // Calculate costs
    const featureCosts: Record<string, { calls: number; costUsd: number; tokens: { input: number; output: number } }> = {}
    let totalCostUsd = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCalls = 0

    for (const [feature, est] of Object.entries(estimates)) {
      const inputTokens = est.calls * est.avgInputTokens
      const outputTokens = est.calls * est.avgOutputTokens
      const cost = estimateCost(est.model, inputTokens, outputTokens)

      featureCosts[feature] = {
        calls: est.calls,
        costUsd: Math.round(cost * 10000) / 10000,
        tokens: { input: inputTokens, output: outputTokens },
      }

      totalCostUsd += cost
      totalInputTokens += inputTokens
      totalOutputTokens += outputTokens
      totalCalls += est.calls
    }

    // Build daily summary for recommendations
    const dailyAvgCost = totalCostUsd / days
    const todaySummary: DailyCostSummary = {
      date: new Date().toISOString().split('T')[0],
      totalCostUsd: dailyAvgCost,
      totalCalls: Math.round(totalCalls / days),
      totalInputTokens: Math.round(totalInputTokens / days),
      totalOutputTokens: Math.round(totalOutputTokens / days),
      byModel: {
        'gpt-4o-mini': { calls: Math.round(totalCalls / days), costUsd: dailyAvgCost },
      },
      byFeature: Object.fromEntries(
        Object.entries(featureCosts).map(([k, v]) => [
          k,
          { calls: Math.round(v.calls / days), costUsd: v.costUsd / days },
        ])
      ),
    }

    const recommendations = generateRecommendations(todaySummary, {
      dailyBudgetUsd: DEFAULT_COST_CONFIG.dailyBudgetUsd,
      cacheHitRate: DEFAULT_COST_CONFIG.cacheHitRate,
    })

    // Monthly projection
    const monthlyProjection = dailyAvgCost * 30

    return NextResponse.json({
      period: {
        days,
        from: since,
        to: new Date().toISOString(),
      },
      summary: {
        totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
        dailyAverageCostUsd: Math.round(dailyAvgCost * 10000) / 10000,
        monthlyProjectionUsd: Math.round(monthlyProjection * 100) / 100,
        totalCalls,
        totalTokens: { input: totalInputTokens, output: totalOutputTokens },
      },
      budget: {
        dailyBudgetUsd: DEFAULT_COST_CONFIG.dailyBudgetUsd,
        monthlyBudgetUsd: DEFAULT_COST_CONFIG.monthlyBudgetUsd,
        dailyUsagePercent: Math.round((dailyAvgCost / DEFAULT_COST_CONFIG.dailyBudgetUsd) * 100),
        monthlyUsagePercent: Math.round((monthlyProjection / DEFAULT_COST_CONFIG.monthlyBudgetUsd) * 100),
        status: dailyAvgCost > DEFAULT_COST_CONFIG.dailyBudgetUsd ? 'over-budget' :
          dailyAvgCost > DEFAULT_COST_CONFIG.dailyBudgetUsd * 0.8 ? 'warning' : 'healthy',
      },
      byFeature: featureCosts,
      modelPricing: MODEL_PRICING.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        inputPer1k: m.inputPer1k,
        outputPer1k: m.outputPer1k,
        bestFor: m.bestFor,
      })),
      recommendations,
      communitySize: {
        totalAgents,
        totalPosts,
        totalComments,
        aiGeneratedPosts,
      },
      note: 'Cost estimates are based on typical token usage patterns. For exact tracking, instrument AI calls with usage logging.',
    })
  } catch (error) {
    console.error('Cost optimization error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
