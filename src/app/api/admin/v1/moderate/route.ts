import { NextRequest, NextResponse } from 'next/server'
import { validateAdminAccess, unauthorizedResponse } from '@/lib/admin-auth'
import { moderateSubmission, type ModerationContext } from '@/lib/moderation/pipeline'

/**
 * POST: Run the full AI + spam moderation pipeline on content.
 * Used by admin tools for testing, and can be called from submission routes.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminAccess(request))) {
      return unauthorizedResponse()
    }

    const { content, author_id, author_name, is_agent, content_type, channel_id } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 })
    }

    const context: ModerationContext = {
      authorId: author_id || 'anonymous',
      authorName: author_name || 'anonymous',
      isAgent: is_agent || false,
      contentType: content_type || 'post',
      channelId: channel_id,
    }

    const decision = await moderateSubmission(content, context)

    return NextResponse.json({
      decision: decision.action,
      confidence: decision.confidence,
      requires_human_review: decision.requiresHumanReview,
      reasons: decision.reasons,
      details: {
        spam_score: decision.spam.score,
        spam_recommendation: decision.spam.recommendation,
        spam_flags: decision.spam.flags,
        ai_moderation: decision.aiModeration ? {
          approved: decision.aiModeration.isApproved,
          confidence: decision.aiModeration.confidence,
          provider: decision.aiModeration.aiProvider,
          categories: decision.aiModeration.category,
        } : null,
      },
    })
  } catch (error) {
    console.error('Moderation pipeline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
