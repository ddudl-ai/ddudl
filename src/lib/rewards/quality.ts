/**
 * Quality bonuses for ddudl contributions.
 * 
 * Awards extra tokens for content that scores high on readability,
 * engagement prediction, and conversation quality.
 * 
 * Integrates with ai_analyses table and conversation quality scores.
 * Philosophy: Reward the effort that makes conversations better.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { RewardBreakdown } from './contribution'

export interface QualityBonusResult {
  totalBonus: number
  tier: 'none' | 'good' | 'great' | 'exceptional'
  breakdown: RewardBreakdown[]
}

// Quality tier thresholds and rewards
const QUALITY_TIERS = {
  exceptional: { minScore: 80, bonus: 100, label: '🏆 탁월한 품질' },
  great:       { minScore: 60, bonus: 50,  label: '⭐ 우수한 품질' },
  good:        { minScore: 40, bonus: 20,  label: '👍 좋은 품질' },
} as const

/**
 * Calculate quality bonus for a post based on AI analysis data.
 */
export async function calculateQualityBonus(
  contentId: string,
  contentType: 'post' | 'comment'
): Promise<QualityBonusResult> {
  const breakdown: RewardBreakdown[] = []
  let totalBonus = 0
  let tier: QualityBonusResult['tier'] = 'none'

  try {
    const db = createAdminClient()

    // Fetch AI analysis for this content
    const { data: analysis } = await db
      .from('ai_analyses')
      .select('readability_score, engagement_prediction, sentiment, confidence')
      .eq('target_id', contentId)
      .eq('target_type', contentType)
      .single()

    if (!analysis) {
      return { totalBonus: 0, tier: 'none', breakdown: [] }
    }

    // 1. Readability bonus
    const readability = analysis.readability_score || 0
    if (readability >= 70) {
      const bonus = readability >= 90 ? 25 : readability >= 80 ? 15 : 10
      totalBonus += bonus
      breakdown.push({
        source: 'readability',
        amount: bonus,
        reason: `가독성 점수 ${readability} (${readability >= 90 ? '최상' : readability >= 80 ? '우수' : '양호'})`,
      })
    }

    // 2. Engagement prediction bonus
    const engagement = analysis.engagement_prediction || 0
    if (engagement >= 60) {
      const bonus = engagement >= 90 ? 20 : engagement >= 75 ? 12 : 8
      totalBonus += bonus
      breakdown.push({
        source: 'engagement_prediction',
        amount: bonus,
        reason: `참여도 예측 ${engagement} (높은 참여 기대)`,
      })
    }

    // 3. Positive sentiment bonus (for constructive content)
    if (analysis.sentiment && typeof analysis.sentiment === 'object') {
      const s = analysis.sentiment as Record<string, unknown>
      const isPositive = (typeof s.positive === 'number' && s.positive > 0.6) ||
                         s.label === 'positive' ||
                         (typeof s.score === 'number' && s.score > 0.7)
      if (isPositive) {
        totalBonus += 5
        breakdown.push({
          source: 'sentiment',
          amount: 5,
          reason: '긍정적 감성 — 건설적 기여',
        })
      }
    }

    // 4. High confidence analysis bonus (AI is sure this is quality)
    if (analysis.confidence >= 90 && totalBonus > 0) {
      const confidenceBonus = 5
      totalBonus += confidenceBonus
      breakdown.push({
        source: 'confidence',
        amount: confidenceBonus,
        reason: `높은 분석 신뢰도 (${analysis.confidence}%)`,
      })
    }

    // Determine tier
    if (totalBonus >= QUALITY_TIERS.exceptional.bonus * 0.8) {
      tier = 'exceptional'
    } else if (totalBonus >= QUALITY_TIERS.great.bonus * 0.8) {
      tier = 'great'
    } else if (totalBonus >= QUALITY_TIERS.good.bonus * 0.6) {
      tier = 'good'
    }

  } catch (error) {
    console.error('Quality bonus calculation error:', error)
  }

  return { totalBonus, tier, breakdown }
}

/**
 * Calculate conversation quality bonus for a post author
 * when their thread achieves a high conversation quality score.
 * Rewards users who start great discussions.
 */
export async function calculateConversationBonus(
  postId: string,
  authorId: string
): Promise<QualityBonusResult> {
  const breakdown: RewardBreakdown[] = []
  let totalBonus = 0
  let tier: QualityBonusResult['tier'] = 'none'

  try {
    const db = createAdminClient()

    // Get post's comments for conversation quality assessment
    const { data: comments } = await db
      .from('comments')
      .select('id, author_id, parent_id, ai_generated, vote_score')
      .eq('post_id', postId)
      .eq('is_deleted', false)

    if (!comments || comments.length < 3) {
      return { totalBonus: 0, tier: 'none', breakdown: [] }
    }

    // Calculate inline conversation metrics
    const uniqueAuthors = new Set(comments.map(c => c.author_id))
    uniqueAuthors.add(authorId)

    const hasNesting = comments.some(c => c.parent_id !== null)
    const humanComments = comments.filter(c => !c.ai_generated).length
    const aiComments = comments.filter(c => c.ai_generated).length
    const avgVote = comments.reduce((s, c) => s + (c.vote_score || 0), 0) / comments.length

    // Participation diversity bonus
    if (uniqueAuthors.size >= 5) {
      totalBonus += 25
      breakdown.push({ source: 'conv_diversity', amount: 25, reason: `${uniqueAuthors.size}명 참여 — 다양한 대화` })
    } else if (uniqueAuthors.size >= 3) {
      totalBonus += 10
      breakdown.push({ source: 'conv_diversity', amount: 10, reason: `${uniqueAuthors.size}명 참여` })
    }

    // Human-AI mix bonus
    if (humanComments > 0 && aiComments > 0) {
      totalBonus += 15
      breakdown.push({ source: 'conv_mix', amount: 15, reason: '인간-AI 교차 대화 발생' })
    }

    // Thread depth bonus
    if (hasNesting) {
      totalBonus += 10
      breakdown.push({ source: 'conv_depth', amount: 10, reason: '중첩 답글 — 깊은 토론' })
    }

    // Constructive conversation bonus
    if (avgVote >= 1.5) {
      totalBonus += 10
      breakdown.push({ source: 'conv_constructive', amount: 10, reason: '건설적 대화 (높은 평균 투표)' })
    }

    // Determine tier
    if (totalBonus >= 50) tier = 'exceptional'
    else if (totalBonus >= 30) tier = 'great'
    else if (totalBonus >= 15) tier = 'good'

  } catch (error) {
    console.error('Conversation bonus error:', error)
  }

  return { totalBonus, tier, breakdown }
}

/**
 * Issue quality bonus as a token transaction.
 */
export async function issueQualityBonus(
  authorId: string,
  contentId: string,
  bonus: QualityBonusResult,
  bonusType: 'quality' | 'conversation'
): Promise<boolean> {
  if (bonus.totalBonus <= 0) return false

  try {
    const db = createAdminClient()
    const category = `quality_bonus_${bonusType}`

    // Dedup check
    const { data: existing } = await db
      .from('token_transactions')
      .select('id')
      .eq('user_id', authorId)
      .eq('category', category)
      .eq('metadata->>content_id', contentId)
      .limit(1)

    if (existing && existing.length > 0) return false

    await db.from('token_transactions').insert({
      user_id: authorId,
      amount: bonus.totalBonus,
      type: 'earn',
      category,
      description: `${bonus.tier} ${bonusType === 'quality' ? '품질' : '대화'} 보너스: ${bonus.breakdown.map(b => b.reason).join(', ')}`,
      metadata: {
        content_id: contentId,
        tier: bonus.tier,
        bonus_type: bonusType,
        breakdown: bonus.breakdown,
      },
    })

    return true
  } catch {
    return false
  }
}
