import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

// Shannon diversity index: H = -Σ(pi * ln(pi))
// Normalized to 0-1: H / ln(S) where S = number of categories
function shannonDiversity(counts: number[]): { raw: number; normalized: number; evenness: number } {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0 || counts.length <= 1) return { raw: 0, normalized: 0, evenness: 0 }
  const proportions = counts.filter(c => c > 0).map(c => c / total)
  const raw = -proportions.reduce((s, p) => s + p * Math.log(p), 0)
  const maxH = Math.log(proportions.length)
  const normalized = maxH > 0 ? raw / maxH : 0
  return {
    raw: Math.round(raw * 1000) / 1000,
    normalized: Math.round(normalized * 1000) / 1000,
    evenness: Math.round(normalized * 100),
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const db = createAdminClient()

    // Fetch agent configurations
    const { data: agents } = await db
      .from('user_agents')
      .select('id, name, model, channels, is_active, bot_user_id, created_at')

    // Fetch agent posts in period
    const { data: agentPosts } = await db
      .from('posts')
      .select('id, author_id, author_name, channel_id, created_at')
      .eq('ai_generated', true)
      .gte('created_at', since)
      .is('deleted_at', null)

    // Fetch agent comments in period
    const { data: agentComments } = await db
      .from('comments')
      .select('id, author_id, author_name, created_at')
      .eq('ai_generated', true)
      .gte('created_at', since)
      .eq('is_deleted', false)

    const allAgents = agents || []
    const posts = agentPosts || []
    const comments = agentComments || []

    // 1. Model diversity
    const modelCounts = new Map<string, number>()
    for (const a of allAgents) {
      const model = a.model || 'unknown'
      modelCounts.set(model, (modelCounts.get(model) || 0) + 1)
    }
    const modelDiversity = shannonDiversity(Array.from(modelCounts.values()))

    // 2. Channel spread — which channels do agents post in?
    const channelCounts = new Map<string, number>()
    for (const p of posts) {
      channelCounts.set(p.channel_id, (channelCounts.get(p.channel_id) || 0) + 1)
    }
    const channelDiversity = shannonDiversity(Array.from(channelCounts.values()))

    // 3. Activity concentration — are a few agents doing all the work?
    const activityByAgent = new Map<string, number>()
    for (const p of posts) {
      activityByAgent.set(p.author_id, (activityByAgent.get(p.author_id) || 0) + 1)
    }
    for (const c of comments) {
      activityByAgent.set(c.author_id, (activityByAgent.get(c.author_id) || 0) + 1)
    }
    const activityDiversity = shannonDiversity(Array.from(activityByAgent.values()))

    // 4. Top agents by activity
    const agentNameMap = new Map<string, string>()
    for (const p of posts) agentNameMap.set(p.author_id, p.author_name)
    for (const c of comments) agentNameMap.set(c.author_id, c.author_name)

    const topAgents = Array.from(activityByAgent.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({
        author_id: id,
        author_name: agentNameMap.get(id) || 'unknown',
        activity_count: count,
        share: activityByAgent.size > 0
          ? Math.round((count / (posts.length + comments.length)) * 100)
          : 0,
      }))

    // 5. Gini coefficient for activity inequality
    const activities = Array.from(activityByAgent.values()).sort((a, b) => a - b)
    let gini = 0
    if (activities.length > 1) {
      const n = activities.length
      const totalActivity = activities.reduce((a, b) => a + b, 0)
      let cumulativeSum = 0
      for (let i = 0; i < n; i++) {
        cumulativeSum += activities[i]
        gini += (2 * (i + 1) - n - 1) * activities[i]
      }
      gini = totalActivity > 0 ? gini / (n * totalActivity) : 0
    }

    // Overall diversity score (0-100)
    const overallScore = Math.round(
      modelDiversity.evenness * 0.25 +
      channelDiversity.evenness * 0.25 +
      activityDiversity.evenness * 0.30 +
      (1 - gini) * 100 * 0.20
    )

    return NextResponse.json({
      period: { days, since: since.substring(0, 10) },
      overall_score: overallScore,
      total_agents: allAgents.length,
      active_agents: activityByAgent.size,
      total_activity: posts.length + comments.length,
      dimensions: {
        model: {
          diversity: modelDiversity,
          distribution: Object.fromEntries(modelCounts),
        },
        channel: {
          diversity: channelDiversity,
          distribution: Object.fromEntries(channelCounts),
        },
        activity: {
          diversity: activityDiversity,
          gini_coefficient: Math.round(gini * 1000) / 1000,
          inequality: gini > 0.6 ? 'high' : gini > 0.4 ? 'moderate' : 'low',
        },
      },
      top_agents: topAgents,
    })
  } catch (error) {
    console.error('Agent diversity API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
