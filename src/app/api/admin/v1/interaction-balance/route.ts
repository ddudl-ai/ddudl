import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminAccess, unauthorizedResponse } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    if (!(await validateAdminAccess(request))) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const db = createAdminClient()

    const [postsRes, commentsRes] = await Promise.all([
      db.from('posts').select('id, author_id, author_name, ai_generated, channel_id, created_at')
        .gte('created_at', since).is('deleted_at', null),
      db.from('comments').select('id, author_id, author_name, ai_generated, post_id, created_at')
        .gte('created_at', since).eq('is_deleted', false),
    ])

    const posts = postsRes.data || []
    const comments = commentsRes.data || []

    // Overall split
    const humanPosts = posts.filter(p => !p.ai_generated)
    const aiPosts = posts.filter(p => p.ai_generated)
    const humanComments = comments.filter(c => !c.ai_generated)
    const aiComments = comments.filter(c => c.ai_generated)

    // Cross-interaction: humans replying to AI posts & vice versa
    const aiPostIds = new Set(aiPosts.map(p => p.id))
    const humanPostIds = new Set(humanPosts.map(p => p.id))

    const humansReplyingToAI = comments.filter(c => !c.ai_generated && aiPostIds.has(c.post_id)).length
    const aiReplyingToHumans = comments.filter(c => c.ai_generated && humanPostIds.has(c.post_id)).length
    const humansReplyingToHumans = comments.filter(c => !c.ai_generated && humanPostIds.has(c.post_id)).length
    const aiReplyingToAI = comments.filter(c => c.ai_generated && aiPostIds.has(c.post_id)).length

    // Daily breakdown
    const dailyMap = new Map<string, { human_posts: number; ai_posts: number; human_comments: number; ai_comments: number; cross_interactions: number }>()
    const ensureDay = (date: string) => {
      if (!dailyMap.has(date)) dailyMap.set(date, { human_posts: 0, ai_posts: 0, human_comments: 0, ai_comments: 0, cross_interactions: 0 })
      return dailyMap.get(date)!
    }

    for (const p of posts) {
      const d = ensureDay(p.created_at.substring(0, 10))
      if (p.ai_generated) d.ai_posts++; else d.human_posts++
    }
    for (const c of comments) {
      const d = ensureDay(c.created_at.substring(0, 10))
      if (c.ai_generated) d.ai_comments++; else d.human_comments++
      const isCross = (c.ai_generated && humanPostIds.has(c.post_id)) || (!c.ai_generated && aiPostIds.has(c.post_id))
      if (isCross) d.cross_interactions++
    }

    // Fill gaps
    const daily: Array<{ date: string; human_posts: number; ai_posts: number; human_comments: number; ai_comments: number; cross_interactions: number }> = []
    const start = new Date(since)
    const end = new Date()
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const ds = d.toISOString().substring(0, 10)
      const entry = dailyMap.get(ds)
      daily.push({
        date: ds,
        human_posts: entry?.human_posts || 0,
        ai_posts: entry?.ai_posts || 0,
        human_comments: entry?.human_comments || 0,
        ai_comments: entry?.ai_comments || 0,
        cross_interactions: entry?.cross_interactions || 0,
      })
    }

    // Channel breakdown
    const channelMap = new Map<string, { human: number; ai: number }>()
    for (const p of posts) {
      if (!channelMap.has(p.channel_id)) channelMap.set(p.channel_id, { human: 0, ai: 0 })
      const ch = channelMap.get(p.channel_id)!
      if (p.ai_generated) ch.ai++; else ch.human++
    }

    // Balance score: 0-100, 100 = perfect 50/50 mix with high cross-interaction
    const totalContent = posts.length + comments.length
    const humanShare = totalContent > 0 ? (humanPosts.length + humanComments.length) / totalContent : 0.5
    const mixBalance = 1 - Math.abs(humanShare - 0.5) * 2 // 0 if all one side, 1 if 50/50
    const totalCross = humansReplyingToAI + aiReplyingToHumans
    const crossRate = comments.length > 0 ? totalCross / comments.length : 0
    const balanceScore = Math.round(mixBalance * 60 + crossRate * 40) // weighted

    return NextResponse.json({
      period: { days, since: since.substring(0, 10) },
      balance_score: balanceScore,
      overview: {
        human_posts: humanPosts.length,
        ai_posts: aiPosts.length,
        human_comments: humanComments.length,
        ai_comments: aiComments.length,
        human_share: Math.round(humanShare * 100),
        ai_share: Math.round((1 - humanShare) * 100),
      },
      cross_interaction: {
        humans_to_ai: humansReplyingToAI,
        ai_to_humans: aiReplyingToHumans,
        humans_to_humans: humansReplyingToHumans,
        ai_to_ai: aiReplyingToAI,
        cross_rate: Math.round(crossRate * 100),
      },
      by_channel: Object.fromEntries(channelMap),
      daily,
    })
  } catch (error) {
    console.error('Interaction balance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
