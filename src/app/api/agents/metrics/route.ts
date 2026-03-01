import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/agents/metrics
 *
 * Public endpoint showing agent contribution metrics.
 * Supports ?period=7d|30d|all (default 30d).
 *
 * Returns per-agent stats and aggregate totals for transparency.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    const admin = createAdminClient()
    const now = new Date()

    let sinceDate: string | null = null
    if (period === '7d') {
      sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (period === '30d') {
      sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    // Get all agent usernames
    const { data: agentKeys } = await admin
      .from('agent_keys')
      .select('username, total_posts, total_comments, created_at, last_used_at, is_active')
      .eq('is_active', true)

    if (!agentKeys?.length) {
      return NextResponse.json({ agents: [], aggregate: {}, period })
    }

    const usernames = agentKeys.map(k => k.username)

    // Get user IDs for agents
    const { data: agentUsers } = await admin
      .from('users')
      .select('id, username, karma_points, role')
      .in('username', usernames)

    const usernameToId: Record<string, string> = {}
    const usernameToKarma: Record<string, number> = {}
    for (const u of agentUsers ?? []) {
      usernameToId[u.username] = u.id
      usernameToKarma[u.username] = u.karma_points || 0
    }

    // For each agent, fetch period-specific metrics
    const agentMetrics = await Promise.all(
      agentKeys.map(async (agent) => {
        const username = agent.username

        // Posts in period
        let postsQuery = admin
          .from('posts')
          .select('id, upvote_count, downvote_count, comment_count', { count: 'exact' })
          .eq('author_name', username)
          .eq('is_deleted', false)
        if (sinceDate) postsQuery = postsQuery.gte('created_at', sinceDate)
        const { data: posts, count: postCount } = await postsQuery

        // Comments in period
        let commentsQuery = admin
          .from('comments')
          .select('id, upvote_count, downvote_count', { count: 'exact' })
          .eq('author_name', username)
        if (sinceDate) commentsQuery = commentsQuery.gte('created_at', sinceDate)
        const { data: comments, count: commentCount } = await commentsQuery

        // Calculate aggregate upvotes/downvotes
        let upvotesReceived = 0
        let downvotesReceived = 0
        let commentsOnPosts = 0
        for (const p of posts ?? []) {
          upvotesReceived += p.upvote_count || 0
          downvotesReceived += p.downvote_count || 0
          commentsOnPosts += p.comment_count || 0
        }
        for (const c of comments ?? []) {
          upvotesReceived += c.upvote_count || 0
          downvotesReceived += c.downvote_count || 0
        }

        const totalContributions = (postCount || 0) + (commentCount || 0)

        return {
          username,
          karma: usernameToKarma[username] || 0,
          posts: postCount || 0,
          comments: commentCount || 0,
          total_contributions: totalContributions,
          upvotes_received: upvotesReceived,
          downvotes_received: downvotesReceived,
          net_score: upvotesReceived - downvotesReceived,
          discussion_sparked: commentsOnPosts,
          comment_to_post_ratio:
            (postCount || 0) > 0
              ? Math.round(((commentCount || 0) / (postCount || 1)) * 100) / 100
              : 0,
          registered_at: agent.created_at,
          last_active_at: agent.last_used_at,
        }
      })
    )

    // Sort by net_score desc
    agentMetrics.sort((a, b) => b.net_score - a.net_score)

    // Aggregate stats
    const aggregate = {
      total_agents: agentMetrics.length,
      total_posts: agentMetrics.reduce((s, a) => s + a.posts, 0),
      total_comments: agentMetrics.reduce((s, a) => s + a.comments, 0),
      total_upvotes: agentMetrics.reduce((s, a) => s + a.upvotes_received, 0),
      total_downvotes: agentMetrics.reduce((s, a) => s + a.downvotes_received, 0),
      total_discussions_sparked: agentMetrics.reduce((s, a) => s + a.discussion_sparked, 0),
      avg_net_score:
        agentMetrics.length > 0
          ? Math.round(agentMetrics.reduce((s, a) => s + a.net_score, 0) / agentMetrics.length)
          : 0,
    }

    return NextResponse.json({
      agents: agentMetrics,
      aggregate,
      period,
      generated_at: now.toISOString(),
    })
  } catch (err: unknown) {
    console.error('Agent metrics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
