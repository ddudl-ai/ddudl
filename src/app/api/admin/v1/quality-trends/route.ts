import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

interface DailyQuality {
  date: string
  avg_readability: number
  avg_engagement: number
  post_count: number
  flagged_count: number
  sentiment_positive: number
  sentiment_neutral: number
  sentiment_negative: number
}

export async function GET(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)

    const db = createAdminClient()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Fetch posts with their AI analyses from the period
    const { data: posts, error: postsError } = await db
      .from('posts')
      .select('id, created_at, ai_generated, channel_id')
      .gte('created_at', since)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (postsError) {
      console.error('Failed to fetch posts:', postsError)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    const postIds = (posts || []).map(p => p.id)

    // Fetch AI analyses for these posts
    let analyses: Array<{
      target_id: string
      readability_score: number | null
      engagement_prediction: number | null
      sentiment: Record<string, number> | null
      moderation_flags: string[] | null
      analyzed_at: string
    }> = []

    if (postIds.length > 0) {
      // Batch fetch in chunks of 500
      for (let i = 0; i < postIds.length; i += 500) {
        const chunk = postIds.slice(i, i + 500)
        const { data, error } = await db
          .from('ai_analyses')
          .select('target_id, readability_score, engagement_prediction, sentiment, moderation_flags, analyzed_at')
          .eq('target_type', 'post')
          .in('target_id', chunk)

        if (!error && data) {
          analyses = analyses.concat(data as typeof analyses)
        }
      }
    }

    // Build lookup map
    const analysisMap = new Map(analyses.map(a => [a.target_id, a]))

    // Aggregate by date
    const dailyMap = new Map<string, {
      readability_scores: number[]
      engagement_scores: number[]
      post_count: number
      flagged_count: number
      sentiments: { positive: number; neutral: number; negative: number }
    }>()

    for (const post of (posts || [])) {
      const date = post.created_at.substring(0, 10) // YYYY-MM-DD
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          readability_scores: [],
          engagement_scores: [],
          post_count: 0,
          flagged_count: 0,
          sentiments: { positive: 0, neutral: 0, negative: 0 },
        })
      }

      const day = dailyMap.get(date)!
      day.post_count++

      const analysis = analysisMap.get(post.id)
      if (analysis) {
        if (analysis.readability_score !== null) {
          day.readability_scores.push(analysis.readability_score)
        }
        if (analysis.engagement_prediction !== null) {
          day.engagement_scores.push(analysis.engagement_prediction)
        }
        if (analysis.moderation_flags && analysis.moderation_flags.length > 0) {
          day.flagged_count++
        }
        if (analysis.sentiment && typeof analysis.sentiment === 'object') {
          const s = analysis.sentiment as Record<string, unknown>
          // Classify sentiment: look for positive/negative/neutral keys or label
          if (typeof s.positive === 'number' && s.positive > 0.5) day.sentiments.positive++
          else if (typeof s.negative === 'number' && s.negative > 0.5) day.sentiments.negative++
          else if (s.label === 'positive' || (typeof s.score === 'number' && s.score > 0.6)) day.sentiments.positive++
          else if (s.label === 'negative' || (typeof s.score === 'number' && s.score < 0.4)) day.sentiments.negative++
          else day.sentiments.neutral++
        }
      }
    }

    // Convert to array
    const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0

    const dailyTrends: DailyQuality[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        avg_readability: avg(data.readability_scores),
        avg_engagement: avg(data.engagement_scores),
        post_count: data.post_count,
        flagged_count: data.flagged_count,
        sentiment_positive: data.sentiments.positive,
        sentiment_neutral: data.sentiments.neutral,
        sentiment_negative: data.sentiments.negative,
      }))

    // Overall summary
    const allReadability = analyses
      .filter(a => a.readability_score !== null)
      .map(a => a.readability_score!)
    const allEngagement = analyses
      .filter(a => a.engagement_prediction !== null)
      .map(a => a.engagement_prediction!)
    const totalFlagged = analyses.filter(a => a.moderation_flags && a.moderation_flags.length > 0).length

    return NextResponse.json({
      period: { days, since: since.substring(0, 10) },
      summary: {
        total_posts: posts?.length || 0,
        analyzed_posts: analyses.length,
        avg_readability: avg(allReadability),
        avg_engagement: avg(allEngagement),
        flagged_posts: totalFlagged,
        flagged_rate: posts?.length ? Math.round((totalFlagged / posts.length) * 10000) / 100 : 0,
      },
      daily: dailyTrends,
    })
  } catch (error) {
    console.error('Quality trends API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
