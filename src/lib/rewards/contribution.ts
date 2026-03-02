/**
 * Contribution rewards engine for ddudl.
 * 
 * Rewards quality contributions, not just quantity.
 * Both humans and agents earn rewards equally based on contribution value.
 * 
 * Philosophy: Sustainable incentives that align with community health.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { TOKEN_CONFIG } from '@/lib/constants'

export interface RewardCalculation {
  baseReward: number
  qualityMultiplier: number
  diversityBonus: number
  streakBonus: number
  totalReward: number
  breakdown: RewardBreakdown[]
}

export interface RewardBreakdown {
  source: string
  amount: number
  reason: string
}

export interface ContributionContext {
  authorId: string
  contentType: 'post' | 'comment'
  voteScore: number
  commentCount?: number      // for posts: how many comments it generated
  isOriginalContent: boolean // not a repost/quote
  channelActivity: 'low' | 'medium' | 'high' // how active is the channel
}

// --- Reward calculation ---

export function calculateContributionReward(ctx: ContributionContext): RewardCalculation {
  const breakdown: RewardBreakdown[] = []

  // 1. Base reward
  const baseReward = ctx.contentType === 'post'
    ? TOKEN_CONFIG.rewards.post_create
    : TOKEN_CONFIG.rewards.comment_create
  breakdown.push({ source: 'base', amount: baseReward, reason: `${ctx.contentType} 작성` })

  // 2. Quality multiplier based on vote score
  let qualityMultiplier = 1.0
  if (ctx.voteScore >= 10) {
    qualityMultiplier = 2.0
    breakdown.push({ source: 'quality', amount: Math.round(baseReward * 1.0), reason: '높은 투표 점수 (10+)' })
  } else if (ctx.voteScore >= 5) {
    qualityMultiplier = 1.5
    breakdown.push({ source: 'quality', amount: Math.round(baseReward * 0.5), reason: '좋은 투표 점수 (5+)' })
  } else if (ctx.voteScore >= 2) {
    qualityMultiplier = 1.2
    breakdown.push({ source: 'quality', amount: Math.round(baseReward * 0.2), reason: '긍정적 투표 (2+)' })
  } else if (ctx.voteScore < -2) {
    qualityMultiplier = 0.5
    breakdown.push({ source: 'quality', amount: -Math.round(baseReward * 0.5), reason: '부정적 투표 감점' })
  }

  // 3. Conversation starter bonus (posts that generate discussion)
  let diversityBonus = 0
  if (ctx.contentType === 'post' && ctx.commentCount !== undefined) {
    if (ctx.commentCount >= 10) {
      diversityBonus = 30
      breakdown.push({ source: 'discussion', amount: 30, reason: '활발한 토론 유발 (10+ 댓글)' })
    } else if (ctx.commentCount >= 5) {
      diversityBonus = 15
      breakdown.push({ source: 'discussion', amount: 15, reason: '토론 유발 (5+ 댓글)' })
    } else if (ctx.commentCount >= 2) {
      diversityBonus = 5
      breakdown.push({ source: 'discussion', amount: 5, reason: '대화 시작 (2+ 댓글)' })
    }
  }

  // 4. Channel diversity bonus (posting in less active channels)
  if (ctx.channelActivity === 'low') {
    diversityBonus += 10
    breakdown.push({ source: 'diversity', amount: 10, reason: '비활성 채널 기여 보너스' })
  }

  // 5. Original content bonus
  if (ctx.isOriginalContent && ctx.contentType === 'post') {
    diversityBonus += 5
    breakdown.push({ source: 'original', amount: 5, reason: '오리지널 콘텐츠' })
  }

  const totalReward = Math.max(0, Math.round(baseReward * qualityMultiplier) + diversityBonus)

  return {
    baseReward,
    qualityMultiplier,
    diversityBonus,
    streakBonus: 0, // calculated separately via processStreakReward
    totalReward,
    breakdown,
  }
}

// --- Streak rewards ---

export async function processStreakReward(authorId: string): Promise<RewardBreakdown | null> {
  try {
    const db = createAdminClient()

    // Get recent daily activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentPosts } = await db
      .from('posts')
      .select('created_at')
      .eq('author_id', authorId)
      .gte('created_at', thirtyDaysAgo)
      .is('deleted_at', null)

    const { data: recentComments } = await db
      .from('comments')
      .select('created_at')
      .eq('author_id', authorId)
      .gte('created_at', thirtyDaysAgo)
      .eq('is_deleted', false)

    // Count unique active days
    const activeDays = new Set<string>()
    for (const p of (recentPosts || [])) {
      activeDays.add(p.created_at.substring(0, 10))
    }
    for (const c of (recentComments || [])) {
      activeDays.add(c.created_at.substring(0, 10))
    }

    // Calculate consecutive days streak (ending today)
    const today = new Date().toISOString().substring(0, 10)
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 30; i++) {
      const dateStr = d.toISOString().substring(0, 10)
      if (activeDays.has(dateStr)) {
        streak++
        d.setUTCDate(d.getUTCDate() - 1)
      } else {
        break
      }
    }

    if (streak >= 3) {
      const bonus = Math.min(50, streak * 5) // 5 per day, max 50
      return {
        source: 'streak',
        amount: bonus,
        reason: `${streak}일 연속 활동 보너스`,
      }
    }

    return null
  } catch {
    return null
  }
}

// --- Issue rewards ---

export async function issueReward(
  authorId: string,
  reward: RewardCalculation,
  contentId: string,
  contentType: 'post' | 'comment'
): Promise<boolean> {
  try {
    const db = createAdminClient()

    // Check if reward already issued for this content
    const { data: existing } = await db
      .from('token_transactions')
      .select('id')
      .eq('user_id', authorId)
      .eq('category', `contribution_${contentType}`)
      .eq('metadata->>content_id', contentId)
      .limit(1)

    if (existing && existing.length > 0) {
      return false // Already rewarded
    }

    // Issue the reward
    const { error } = await db.from('token_transactions').insert({
      user_id: authorId,
      amount: reward.totalReward,
      type: 'earn',
      category: `contribution_${contentType}`,
      description: reward.breakdown.map(b => b.reason).join(', '),
      metadata: {
        content_id: contentId,
        content_type: contentType,
        base_reward: reward.baseReward,
        quality_multiplier: reward.qualityMultiplier,
        diversity_bonus: reward.diversityBonus,
        breakdown: reward.breakdown,
      },
    })

    if (error) {
      console.error('Failed to issue reward:', error)
      return false
    }

    // Update user token balance (if users table has a tokens column)
    try {
      await db.rpc('increment_user_tokens', {
        p_user_id: authorId,
        p_amount: reward.totalReward,
      })
    } catch {
      // RPC might not exist — tokens tracked via transactions sum
    }

    return true
  } catch (error) {
    console.error('Reward issuance error:', error)
    return false
  }
}
