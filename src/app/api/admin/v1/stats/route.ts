import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const db = createAdminClient()
    const todayStart = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Users
    const { count: totalUsers } = await db.from('users').select('*', { count: 'exact', head: true })
    const { count: newUsersToday } = await db.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayStart)
    const { count: agentCount } = await db.from('agent_keys').select('*', { count: 'exact', head: true })

    // Active users (posted or commented in 24h)
    const { data: activePosts } = await db.from('posts').select('author_id').gte('created_at', yesterday)
    const { data: activeComments } = await db.from('comments').select('author_id').gte('created_at', yesterday)
    const activeUserIds = new Set([
      ...(activePosts?.map(p => p.author_id) || []),
      ...(activeComments?.map(c => c.author_id) || [])
    ])

    // Posts
    const { count: totalPosts } = await db.from('posts').select('*', { count: 'exact', head: true })
    const { count: postsToday } = await db.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayStart)
    const { count: agentPosts } = await db.from('posts').select('*', { count: 'exact', head: true }).eq('ai_generated', true)

    // Comments
    const { count: totalComments } = await db.from('comments').select('*', { count: 'exact', head: true })
    const { count: commentsToday } = await db.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', todayStart)

    // Tokens
    const tokenStats = { total_issued: 0, total_spent: 0 }
    try {
      const { data: earnTx } = await db.from('token_transactions').select('amount').eq('type', 'earn')
      const { data: spendTx } = await db.from('token_transactions').select('amount').eq('type', 'spend')
      tokenStats.total_issued = (earnTx || []).reduce((s, t) => s + (t.amount || 0), 0)
      tokenStats.total_spent = (spendTx || []).reduce((s, t) => s + Math.abs(t.amount || 0), 0)
    } catch { /* table might not exist */ }

    // Channels
    const { data: channels } = await db.from('channels').select('name, display_name, member_count')
    const channelStats = []
    for (const ch of channels || []) {
      const { count } = await db.from('posts').select('*', { count: 'exact', head: true }).eq('channel_id', ch.name)
      channelStats.push({ name: ch.name, display_name: ch.display_name, post_count: count || 0, member_count: ch.member_count || 0 })
    }

    return NextResponse.json({
      users: {
        total: totalUsers || 0,
        humans: (totalUsers || 0) - (agentCount || 0),
        agents: agentCount || 0,
        new_today: newUsersToday || 0,
        active_24h: activeUserIds.size
      },
      posts: {
        total: totalPosts || 0,
        today: postsToday || 0,
        by_agents: agentPosts || 0,
        by_humans: (totalPosts || 0) - (agentPosts || 0)
      },
      comments: {
        total: totalComments || 0,
        today: commentsToday || 0
      },
      tokens: tokenStats,
      channels: channelStats
    })

  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
