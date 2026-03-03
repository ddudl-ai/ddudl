/**
 * Platform Cost Tracking and Optimization
 *
 * Tracks AI model usage, API calls, and storage costs.
 * Provides optimization recommendations for sustainable operation.
 *
 * Philosophy: Sustainable — long-term health over short-term metrics.
 * Transparency — costs are visible, not hidden.
 *
 * This module provides:
 * 1. Cost estimation per AI model call
 * 2. Usage tracking via database
 * 3. Optimization recommendations
 * 4. Budget alerts
 */

// Model pricing (per 1K tokens, approximate USD)
export interface ModelPricing {
  id: string
  name: string
  provider: 'openai' | 'anthropic'
  inputPer1k: number
  outputPer1k: number
  /** Recommended for which use cases */
  bestFor: string[]
  /** Cheaper alternative model id */
  cheaperAlternative?: string
}

export const MODEL_PRICING: ModelPricing[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    inputPer1k: 0.0025,
    outputPer1k: 0.01,
    bestFor: ['complex-generation', 'analysis'],
    cheaperAlternative: 'gpt-4o-mini',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    inputPer1k: 0.00015,
    outputPer1k: 0.0006,
    bestFor: ['moderation', 'classification', 'simple-generation'],
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    inputPer1k: 0.003,
    outputPer1k: 0.015,
    bestFor: ['content-generation', 'reasoning'],
    cheaperAlternative: 'claude-3-5-haiku-20241022',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    inputPer1k: 0.0008,
    outputPer1k: 0.004,
    bestFor: ['moderation', 'simple-tasks'],
  },
]

export function getModelPricing(modelId: string): ModelPricing | undefined {
  return MODEL_PRICING.find(m => m.id === modelId)
}

/**
 * Estimate cost of a single AI call.
 */
export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = getModelPricing(modelId)
  if (!pricing) return 0
  return (inputTokens / 1000) * pricing.inputPer1k + (outputTokens / 1000) * pricing.outputPer1k
}

/**
 * Usage record for tracking.
 */
export interface UsageRecord {
  modelId: string
  feature: string // 'moderation' | 'content-gen' | 'translation' | etc.
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  timestamp: string
}

/**
 * Daily cost summary.
 */
export interface DailyCostSummary {
  date: string
  totalCostUsd: number
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  byModel: Record<string, { calls: number; costUsd: number }>
  byFeature: Record<string, { calls: number; costUsd: number }>
}

/**
 * Cost optimization recommendation.
 */
export interface CostRecommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimatedSavingsPercent: number
  action: string
}

/**
 * Generate optimization recommendations based on usage patterns.
 */
export function generateRecommendations(
  summary: DailyCostSummary,
  config: { dailyBudgetUsd: number; cacheHitRate: number }
): CostRecommendation[] {
  const recommendations: CostRecommendation[] = []

  // Check if over budget
  if (summary.totalCostUsd > config.dailyBudgetUsd) {
    recommendations.push({
      id: 'over-budget',
      priority: 'high',
      title: 'Daily budget exceeded',
      description: `Spent $${summary.totalCostUsd.toFixed(4)} of $${config.dailyBudgetUsd.toFixed(2)} budget.`,
      estimatedSavingsPercent: 0,
      action: 'Review high-cost features and consider downgrading models or reducing call frequency.',
    })
  }

  // Check for expensive model overuse
  for (const [modelId, usage] of Object.entries(summary.byModel)) {
    const pricing = getModelPricing(modelId)
    if (pricing?.cheaperAlternative && usage.costUsd > summary.totalCostUsd * 0.4) {
      const cheaper = getModelPricing(pricing.cheaperAlternative)
      if (cheaper) {
        const savingsRatio = 1 - (cheaper.outputPer1k / pricing.outputPer1k)
        recommendations.push({
          id: `downgrade-${modelId}`,
          priority: 'medium',
          title: `Consider ${cheaper.name} for some ${pricing.name} tasks`,
          description: `${pricing.name} accounts for ${((usage.costUsd / summary.totalCostUsd) * 100).toFixed(0)}% of costs. ${cheaper.name} is ~${(savingsRatio * 100).toFixed(0)}% cheaper.`,
          estimatedSavingsPercent: Math.round(savingsRatio * (usage.costUsd / summary.totalCostUsd) * 100),
          action: `Route simpler tasks (moderation, classification) to ${cheaper.name}.`,
        })
      }
    }
  }

  // Check cache hit rate
  if (config.cacheHitRate < 0.3) {
    recommendations.push({
      id: 'improve-caching',
      priority: 'medium',
      title: 'Low cache hit rate',
      description: `Cache hit rate is ${(config.cacheHitRate * 100).toFixed(0)}%. Improving caching could significantly reduce AI calls.`,
      estimatedSavingsPercent: 20,
      action: 'Cache moderation results, translation outputs, and repeated content analysis.',
    })
  }

  // Check if moderation is a big cost
  const moderationCost = summary.byFeature['moderation']
  if (moderationCost && moderationCost.costUsd > summary.totalCostUsd * 0.3) {
    recommendations.push({
      id: 'optimize-moderation',
      priority: 'medium',
      title: 'Moderation is a large cost driver',
      description: `Moderation uses ${((moderationCost.costUsd / summary.totalCostUsd) * 100).toFixed(0)}% of budget.`,
      estimatedSavingsPercent: 15,
      action: 'Use rule-based pre-filters before AI moderation. Only send borderline content to AI.',
    })
  }

  // Batch processing recommendation
  if (summary.totalCalls > 100) {
    recommendations.push({
      id: 'batch-processing',
      priority: 'low',
      title: 'Consider batching AI calls',
      description: `${summary.totalCalls} calls today. Batching similar requests can reduce overhead.`,
      estimatedSavingsPercent: 10,
      action: 'Group moderation checks and content analysis into batch API calls where supported.',
    })
  }

  return recommendations.sort((a, b) => {
    const pri = { high: 0, medium: 1, low: 2 }
    return pri[a.priority] - pri[b.priority]
  })
}

/**
 * Platform cost configuration defaults.
 */
export const DEFAULT_COST_CONFIG = {
  dailyBudgetUsd: 5.0,
  monthlyBudgetUsd: 100.0,
  alertThresholdPercent: 80,
  cacheHitRate: 0.5,
}
