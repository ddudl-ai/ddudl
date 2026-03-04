import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminAccess, unauthorizedResponse } from '@/lib/admin-auth'
import {
  calculateContributionReward,
  processStreakReward,
  issueReward,
  type ContributionContext,
} from '@/lib/rewards/contribution'

// POST: Calculate and issue contribution reward
export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminAccess(request))) {
      return unauthorizedResponse()
    }

    const { author_id, content_id, content_type, dry_run } = await request.json()

    if (!author_id || !content_id || !content_type) {
      return NextResponse.json({ error: 'Missing author_id, content_id, or content_type' }, { status: 400 })
    }

    const db = createAdminClient()

    // Fetch content details
    const table = content_type === 'post' ? 'posts' : 'comments'
    const { data: content } = await db
      .from(table)
      .select('id, author_id, vote_score, comment_count, ai_generated, channel_id, content, created_at')
      .eq('id', content_id)
      .single()

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Determine channel activity level
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const channelId = content_type === 'post' ? content.channel_id : null
    let channelActivity: 'low' | 'medium' | 'high' = 'medium'

    if (channelId) {
      const { count } = await db.from('posts').select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId).gte('created_at', last24h).is('deleted_at', null)
      if ((count || 0) < 3) channelActivity = 'low'
      else if ((count || 0) > 15) channelActivity = 'high'
    }

    const ctx: ContributionContext = {
      authorId: author_id,
      contentType: content_type,
      voteScore: content.vote_score || 0,
      commentCount: content.comment_count || 0,
      isOriginalContent: (content.content || '').length > 100,
      channelActivity,
    }

    const reward = calculateContributionReward(ctx)

    // Add streak bonus
    const streak = await processStreakReward(author_id)
    if (streak) {
      reward.totalReward += streak.amount
      reward.streakBonus = streak.amount
      reward.breakdown.push(streak)
    }

    // Issue reward (unless dry run)
    let issued = false
    if (!dry_run) {
      issued = await issueReward(author_id, reward, content_id, content_type)
    }

    return NextResponse.json({
      reward,
      issued: dry_run ? 'dry_run' : issued,
      content_id,
      content_type,
    })
  } catch (error) {
    console.error('Contribution reward error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Batch process rewards for recent content
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

    // Get recent posts that haven't been rewarded yet
    const { data: posts } = await db
      .from('posts')
      .select('id, author_id, vote_score, comment_count, ai_generated, channel_id, content, created_at')
      .gte('created_at', since)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    const results: Array<{
      content_id: string; content_type: string; author_id: string
      reward: number; issued: boolean | string; breakdown_summary: string
    }> = []

    let totalIssued = 0

    for (const post of (posts || [])) {
      const ctx: ContributionContext = {
        authorId: post.author_id,
        contentType: 'post',
        voteScore: post.vote_score || 0,
        commentCount: post.comment_count || 0,
        isOriginalContent: (post.content || '').length > 100,
        channelActivity: 'medium', // simplified for batch
      }

      const reward = calculateContributionReward(ctx)
      let issued: boolean | string = 'dry_run'

      if (!dryRun) {
        issued = await issueReward(post.author_id, reward, post.id, 'post')
        if (issued) totalIssued += reward.totalReward
      }

      results.push({
        content_id: post.id,
        content_type: 'post',
        author_id: post.author_id,
        reward: reward.totalReward,
        issued,
        breakdown_summary: reward.breakdown.map(b => `${b.source}:${b.amount}`).join(', '),
      })
    }

    return NextResponse.json({
      period_hours: hours,
      dry_run: dryRun,
      processed: results.length,
      total_tokens_issued: totalIssued,
      results,
    })
  } catch (error) {
    console.error('Batch reward error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
