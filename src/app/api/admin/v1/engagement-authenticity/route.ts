import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '14'), 60)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const db = createAdminClient()

    const [postsRes, commentsRes] = await Promise.all([
      db.from('posts').select('id, author_id, author_name, ai_generated, content, created_at, vote_score, comment_count')
        .gte('created_at', since).is('deleted_at', null),
      db.from('comments').select('id, author_id, author_name, ai_generated, content, created_at, vote_score')
        .gte('created_at', since).eq('is_deleted', false),
    ])

    const posts = postsRes.data || []
    const comments = commentsRes.data || []

    // Per-author analysis
    const authorStats = new Map<string, {
      name: string; ai: boolean; posts: number; comments: number
      contentLengths: number[]; timestamps: number[]; contents: string[]
      totalVoteScore: number
    }>()

    const getAuthor = (id: string, name: string, ai: boolean) => {
      if (!authorStats.has(id)) {
        authorStats.set(id, { name, ai, posts: 0, comments: 0, contentLengths: [], timestamps: [], contents: [], totalVoteScore: 0 })
      }
      return authorStats.get(id)!
    }

    for (const p of posts) {
      const a = getAuthor(p.author_id, p.author_name, p.ai_generated || false)
      a.posts++
      a.contentLengths.push((p.content || '').length)
      a.timestamps.push(new Date(p.created_at).getTime())
      a.contents.push((p.content || '').substring(0, 200))
      a.totalVoteScore += p.vote_score || 0
    }

    for (const c of comments) {
      const a = getAuthor(c.author_id, c.author_name, c.ai_generated || false)
      a.comments++
      a.contentLengths.push((c.content || '').length)
      a.timestamps.push(new Date(c.created_at).getTime())
      a.contents.push((c.content || '').substring(0, 200))
      a.totalVoteScore += c.vote_score || 0
    }

    // Compute authenticity signals per author
    const authorScores: Array<{
      author_id: string; author_name: string; is_agent: boolean
      authenticity_score: number; total_activity: number
      signals: {
        content_variance: number    // high = diverse content lengths = good
        timing_variance: number     // high = natural timing = good
        uniqueness: number          // high = unique content = good
        community_reception: number // high = well-received = good
      }
    }> = []

    for (const [authorId, stats] of authorStats.entries()) {
      const totalActivity = stats.posts + stats.comments
      if (totalActivity < 2) continue // need minimum activity

      // 1. Content length variance (normalized std dev)
      const avgLen = stats.contentLengths.reduce((a, b) => a + b, 0) / stats.contentLengths.length
      const lenStd = Math.sqrt(stats.contentLengths.reduce((s, l) => s + (l - avgLen) ** 2, 0) / stats.contentLengths.length)
      const contentVariance = Math.min(100, avgLen > 0 ? (lenStd / avgLen) * 100 : 0)

      // 2. Timing variance (are posts evenly spaced = bot-like, or natural?)
      let timingVariance = 50
      if (stats.timestamps.length >= 3) {
        const sorted = stats.timestamps.sort((a, b) => a - b)
        const gaps = sorted.slice(1).map((t, i) => t - sorted[i])
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
        const gapStd = Math.sqrt(gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length)
        const cv = avgGap > 0 ? gapStd / avgGap : 0
        timingVariance = Math.min(100, cv * 50) // higher CV = more natural
      }

      // 3. Content uniqueness (simple: check for duplicate prefixes)
      const prefixes = stats.contents.map(c => c.substring(0, 50).toLowerCase().trim())
      const uniquePrefixes = new Set(prefixes).size
      const uniqueness = Math.round((uniquePrefixes / prefixes.length) * 100)

      // 4. Community reception (avg vote score normalized)
      const avgVote = totalActivity > 0 ? stats.totalVoteScore / totalActivity : 0
      const reception = Math.min(100, Math.max(0, (avgVote + 2) * 25))

      const authenticity = Math.round(
        contentVariance * 0.20 +
        timingVariance * 0.20 +
        uniqueness * 0.35 +
        reception * 0.25
      )

      authorScores.push({
        author_id: authorId,
        author_name: stats.name,
        is_agent: stats.ai,
        authenticity_score: authenticity,
        total_activity: totalActivity,
        signals: {
          content_variance: Math.round(contentVariance),
          timing_variance: Math.round(timingVariance),
          uniqueness,
          community_reception: Math.round(reception),
        },
      })
    }

    authorScores.sort((a, b) => a.authenticity_score - b.authenticity_score)

    // Global metrics
    const allScores = authorScores.map(a => a.authenticity_score)
    const avgAuthenticity = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0

    const suspicious = authorScores.filter(a => a.authenticity_score < 35)
    const genuine = authorScores.filter(a => a.authenticity_score >= 65)

    return NextResponse.json({
      period: { days, since: since.substring(0, 10) },
      overall_authenticity: avgAuthenticity,
      summary: {
        total_authors: authorScores.length,
        genuine: genuine.length,
        moderate: authorScores.length - genuine.length - suspicious.length,
        suspicious: suspicious.length,
      },
      suspicious_accounts: suspicious.slice(0, 10),
      most_authentic: authorScores.slice(-10).reverse(),
      all_scores: authorScores,
    })
  } catch (error) {
    console.error('Engagement authenticity API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
