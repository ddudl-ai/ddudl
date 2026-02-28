import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/user-agents/analytics — agent performance data for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get user's agents with their keys
    const { data: agents } = await admin
      .from('user_agents')
      .select(`
        id, name, model, is_active, created_at, last_active_at, channels, activity_per_day,
        agent_keys (id, username, total_posts, total_comments, last_used_at)
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (!agents?.length) {
      return NextResponse.json({ agents: [], summary: { total_posts: 0, total_comments: 0, total_agents: 0, active_agents: 0 } })
    }

    // For each agent, get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const enriched = await Promise.all(agents.map(async (agent) => {
      const agentKey = Array.isArray(agent.agent_keys) ? agent.agent_keys[0] : agent.agent_keys
      if (!agentKey) return { ...agent, recent_posts: 0, recent_comments: 0, top_channels: [] }

      // Get username for querying
      const username = agentKey.username

      // Recent posts count
      const { count: recentPosts } = await admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_name', username)
        .gte('created_at', sevenDaysAgo)

      // Recent comments count
      const { count: recentComments } = await admin
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('author_name', username)
        .gte('created_at', sevenDaysAgo)

      // Top channels by post count
      const { data: channelPosts } = await admin
        .from('posts')
        .select('channels(name)')
        .eq('author_name', username)
        .order('created_at', { ascending: false })
        .limit(50)

      const channelCounts: Record<string, number> = {}
      channelPosts?.forEach((p: Record<string, unknown>) => {
        const ch = p.channels as { name: string } | null
        if (ch?.name) channelCounts[ch.name] = (channelCounts[ch.name] || 0) + 1
      })
      const topChannels = Object.entries(channelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }))

      // Votes received
      const { data: agentPosts } = await admin
        .from('posts')
        .select('upvote_count, downvote_count')
        .eq('author_name', username)

      let totalUpvotes = 0, totalDownvotes = 0
      agentPosts?.forEach((p) => {
        totalUpvotes += p.upvote_count || 0
        totalDownvotes += p.downvote_count || 0
      })

      return {
        id: agent.id,
        name: agent.name,
        username,
        model: agent.model,
        is_active: agent.is_active,
        channels: agent.channels,
        activity_per_day: agent.activity_per_day,
        created_at: agent.created_at,
        last_active_at: agentKey.last_used_at || agent.last_active_at,
        total_posts: agentKey.total_posts || 0,
        total_comments: agentKey.total_comments || 0,
        recent_posts: recentPosts || 0,
        recent_comments: recentComments || 0,
        total_upvotes: totalUpvotes,
        total_downvotes: totalDownvotes,
        top_channels: topChannels,
      }
    }))

    const summary = {
      total_agents: agents.length,
      active_agents: agents.filter(a => a.is_active).length,
      total_posts: enriched.reduce((s, a) => s + a.total_posts, 0),
      total_comments: enriched.reduce((s, a) => s + a.total_comments, 0),
      total_upvotes: enriched.reduce((s, a) => s + (a.total_upvotes || 0), 0),
    }

    return NextResponse.json({ agents: enriched, summary })
  } catch (err: unknown) {
    console.error('Analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
