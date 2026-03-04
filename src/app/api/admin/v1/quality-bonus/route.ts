import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminAccess, unauthorizedResponse } from '@/lib/admin-auth'
import {
  calculateQualityBonus,
  calculateConversationBonus,
  issueQualityBonus,
} from '@/lib/rewards/quality'

// POST: Calculate and issue quality bonus for specific content
export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminAccess(request))) {
      return unauthorizedResponse()
    }

    const { content_id, content_type, author_id, dry_run } = await request.json()
    if (!content_id || !author_id) {
      return NextResponse.json({ error: 'Missing content_id or author_id' }, { status: 400 })
    }

    const type = content_type || 'post'

    // Calculate both bonuses
    const [qualityBonus, conversationBonus] = await Promise.all([
      calculateQualityBonus(content_id, type),
      type === 'post' ? calculateConversationBonus(content_id, author_id) : Promise.resolve({ totalBonus: 0, tier: 'none' as const, breakdown: [] }),
    ])

    let qualityIssued: boolean | string = 'dry_run'
    let convIssued: boolean | string = 'dry_run'

    if (!dry_run) {
      qualityIssued = await issueQualityBonus(author_id, content_id, qualityBonus, 'quality')
      convIssued = await issueQualityBonus(author_id, content_id, conversationBonus, 'conversation')
    }

    return NextResponse.json({
      content_id,
      quality_bonus: { ...qualityBonus, issued: qualityIssued },
      conversation_bonus: { ...conversationBonus, issued: convIssued },
      total_bonus: qualityBonus.totalBonus + conversationBonus.totalBonus,
    })
  } catch (error) {
    console.error('Quality bonus error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Batch scan and issue quality bonuses for recent posts
export async function GET(request: NextRequest) {
  try {
    if (!(await validateAdminAccess(request))) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const hours = Math.min(parseInt(searchParams.get('hours') || '24'), 72)
    const dryRun = searchParams.get('dry_run') === 'true'
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const db = createAdminClient()

    const { data: posts } = await db
      .from('posts')
      .select('id, author_id')
      .gte('created_at', since)
      .is('deleted_at', null)
      .gt('comment_count', 0)
      .limit(50)

    const results: Array<{
      post_id: string; quality_bonus: number; conversation_bonus: number
      quality_tier: string; conversation_tier: string; issued: boolean | string
    }> = []

    let totalIssued = 0

    for (const post of (posts || [])) {
      const [qb, cb] = await Promise.all([
        calculateQualityBonus(post.id, 'post'),
        calculateConversationBonus(post.id, post.author_id),
      ])

      let issued: boolean | string = 'dry_run'
      if (!dryRun && (qb.totalBonus > 0 || cb.totalBonus > 0)) {
        const q = await issueQualityBonus(post.author_id, post.id, qb, 'quality')
        const c = await issueQualityBonus(post.author_id, post.id, cb, 'conversation')
        issued = q || c
        if (q) totalIssued += qb.totalBonus
        if (c) totalIssued += cb.totalBonus
      }

      if (qb.totalBonus > 0 || cb.totalBonus > 0) {
        results.push({
          post_id: post.id,
          quality_bonus: qb.totalBonus,
          conversation_bonus: cb.totalBonus,
          quality_tier: qb.tier,
          conversation_tier: cb.tier,
          issued,
        })
      }
    }

    return NextResponse.json({
      period_hours: hours,
      dry_run: dryRun,
      posts_scanned: posts?.length || 0,
      bonuses_awarded: results.length,
      total_tokens: totalIssued,
      results,
    })
  } catch (error) {
    console.error('Batch quality bonus error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
