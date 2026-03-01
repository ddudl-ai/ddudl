/**
 * Content moderation middleware for ddudl.
 * 
 * Combines AI-powered moderation (when API keys available) with
 * rule-based spam detection (always available) into a single pipeline.
 * 
 * Philosophy: Transparent moderation — all decisions are logged,
 * reasons are recorded, and human review is always an option.
 */

import { moderateContent, type ModerationResult, type ContentToModerate } from '@/lib/ai/moderation'
import { checkSpam, type SpamCheckResult, type SpamFlag } from '@/lib/spam/detector'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ModerationDecision {
  action: 'approve' | 'flag' | 'reject'
  reasons: string[]
  spam: SpamCheckResult
  aiModeration: ModerationResult | null
  requiresHumanReview: boolean
  confidence: number
}

export interface ModerationContext {
  authorId: string
  authorName: string
  isAgent: boolean
  contentType: 'post' | 'comment'
  channelId?: string
}

/**
 * Run the full moderation pipeline on content.
 * 
 * Pipeline order:
 * 1. Spam detection (always runs, no API needed)
 * 2. AI moderation (runs if API keys configured, gracefully skips otherwise)
 * 3. Combined decision
 * 4. Logging (best effort)
 */
export async function moderateSubmission(
  content: string,
  context: ModerationContext
): Promise<ModerationDecision> {
  // Step 1: Spam detection (always available)
  const authorHistory = await buildAuthorHistory(context.authorId)
  const spamResult = checkSpam(content, authorHistory, context.isAgent)

  // Step 2: AI moderation (optional — gracefully degrades)
  let aiResult: ModerationResult | null = null
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key-for-build'
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'dummy-key-for-build'

  if (hasOpenAI || hasAnthropic) {
    try {
      const contentToModerate: ContentToModerate = {
        text: content,
        context: {
          userHistory: {
            previousViolations: 0, // TODO: track violations
            accountAge: authorHistory.accountAgeHours,
            karmaScore: authorHistory.averageVoteScore,
          },
        },
      }
      aiResult = await moderateContent(contentToModerate)
    } catch (error) {
      console.error('AI moderation failed, continuing with spam-only:', error)
    }
  }

  // Step 3: Combined decision
  const decision = combineDecisions(spamResult, aiResult)

  // Step 4: Log the decision (best effort, non-blocking)
  logModerationDecision(content, context, decision).catch(() => {})

  return decision
}

function combineDecisions(
  spam: SpamCheckResult,
  ai: ModerationResult | null
): ModerationDecision {
  const reasons: string[] = []
  let action: 'approve' | 'flag' | 'reject' = 'approve'
  let requiresHumanReview = false
  let confidence = 70 // base confidence for spam-only

  // Spam signals
  if (spam.recommendation === 'block') {
    action = 'reject'
    reasons.push(`Spam score ${spam.score}/100`)
    spam.flags.forEach(f => reasons.push(`[spam] ${f.detail}`))
  } else if (spam.recommendation === 'flag') {
    action = 'flag'
    requiresHumanReview = true
    reasons.push(`Spam score ${spam.score}/100 (flagged for review)`)
    spam.flags.filter(f => f.severity !== 'low').forEach(f => reasons.push(`[spam] ${f.detail}`))
  }

  // AI moderation signals (if available)
  if (ai) {
    confidence = ai.confidence

    if (!ai.isApproved) {
      // AI says reject — escalate
      if (action === 'approve') action = 'flag'
      if (ai.confidence >= 90) action = 'reject'
      reasons.push(`AI moderation: not approved (${ai.aiProvider}, confidence ${ai.confidence}%)`)
      ai.reasons.forEach(r => reasons.push(`[ai] ${r}`))
    }

    if (ai.requiresHumanReview) {
      requiresHumanReview = true
    }

    // Agreement bonus: if both spam and AI agree, higher confidence
    if (spam.recommendation === 'allow' && ai.isApproved) {
      confidence = Math.min(99, confidence + 10)
    }
  }

  // If no flags at all, approve with confidence
  if (reasons.length === 0) {
    reasons.push('Passed all checks')
    confidence = ai ? Math.max(confidence, 80) : 70
  }

  return {
    action,
    reasons,
    spam,
    aiModeration: ai,
    requiresHumanReview,
    confidence,
  }
}

async function buildAuthorHistory(authorId: string) {
  try {
    const db = createAdminClient()
    const now = Date.now()
    const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString()

    const [postsRes, commentsRes, userRes] = await Promise.all([
      db.from('posts').select('content, created_at, vote_score')
        .eq('author_id', authorId).gte('created_at', last24h).is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(20),
      db.from('comments').select('content, created_at, vote_score')
        .eq('author_id', authorId).gte('created_at', last24h).eq('is_deleted', false)
        .order('created_at', { ascending: false }).limit(20),
      db.from('users').select('created_at').eq('id', authorId).single(),
    ])

    const all = [...(postsRes.data || []), ...(commentsRes.data || [])]
    const totalVote = all.reduce((s, i) => s + (i.vote_score || 0), 0)

    return {
      recentPostTimes: all.map(i => new Date(i.created_at).getTime()),
      recentContents: all.map(i => (i.content || '').substring(0, 200)),
      accountAgeHours: userRes.data
        ? (now - new Date(userRes.data.created_at).getTime()) / 3600_000
        : 999,
      totalPosts: postsRes.data?.length || 0,
      totalComments: commentsRes.data?.length || 0,
      averageVoteScore: all.length > 0 ? totalVote / all.length : 0,
    }
  } catch {
    // Graceful fallback if DB unavailable
    return {
      recentPostTimes: [], recentContents: [],
      accountAgeHours: 999, totalPosts: 0, totalComments: 0, averageVoteScore: 0,
    }
  }
}

async function logModerationDecision(
  content: string,
  context: ModerationContext,
  decision: ModerationDecision
) {
  try {
    const db = createAdminClient()
    await db.from('moderation_log').insert({
      content_type: context.contentType,
      content_id: context.authorId, // will be updated with actual content ID after creation
      action: decision.action,
      reason: decision.reasons.join('; '),
      moderator: decision.aiModeration ? `ai:${decision.aiModeration.aiProvider}+spam` : 'spam_detector',
      created_at: new Date().toISOString(),
    })
  } catch {
    // Best effort — table might not exist
  }
}

/**
 * Quick check — use this in submission routes for fast pre-screening.
 * Returns true if content should be allowed to proceed.
 */
export async function quickModerationCheck(
  content: string,
  authorId: string,
  isAgent: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const authorHistory = await buildAuthorHistory(authorId)
    const spam = checkSpam(content, authorHistory, isAgent)

    if (spam.recommendation === 'block') {
      return {
        allowed: false,
        reason: spam.flags.map(f => f.detail).join('; '),
      }
    }

    return { allowed: true }
  } catch {
    // On error, allow (don't block legitimate content due to infra issues)
    return { allowed: true }
  }
}
