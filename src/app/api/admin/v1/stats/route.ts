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

    // Run all independent queries in parallel
    const [
      totalUsersRes,
      newUsersTodayRes,
      agentCountRes,
      activePostsRes,
      activeCommentsRes,
      totalPostsRes,
      postsTodayRes,
      agentPostsRes,
      totalCommentsRes,
      commentsTodayRes,
      channelsRes,
    ] = await Promise.all([
      db.from('users').select('*', { count: 'exact', head: true }),
      db.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      db.from('agent_keys').select('*', { count: 'exact', head: true }),
      db.from('posts').select('author_id').gte('created_at', yesterday),
      db.from('comments').select('author_id').gte('created_at', yesterday),
      db.from('posts').select('*', { count: 'exact', head: true }),
      db.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      db.from('posts').select('*', { count: 'exact', head: true }).eq('ai_generated', true),
      db.from('comments').select('*', { count: 'exact', head: true }),
      db.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      db.from('channels').select('id, name, display_name, member_count'),
    ])

    const activeUserIds = new Set([
      ...(activePostsRes.data?.map(p => p.author_id) || []),
      ...(activeCommentsRes.data?.map(c => c.author_id) || [])
    ])

    // Channel post counts — parallel count queries per channel (head:true, no row fetch)
    const channels = channelsRes.data || []
    const channelPostCounts = await Promise.all(
      channels.map(ch =>
        db.from('posts').select('*', { count: 'exact', head: true })
          .eq('channel_id', ch.id).is('deleted_at', null)
      )
    )

    const channelStats = channels.map((ch, i) => ({
      name: ch.name,
      display_name: ch.display_name,
      post_count: channelPostCounts[i].count || 0,
      member_count: ch.member_count || 0
    }))

    // Token stats — parallel, still fetch amounts but in parallel
    let tokenStats = { total_issued: 0, total_spent: 0 }
    try {
      const [earnRes, spendRes] = await Promise.all([
        db.from('token_transactions').select('amount').eq('type', 'earn'),
        db.from('token_transactions').select('amount').eq('type', 'spend'),
      ])
      tokenStats.total_issued = (earnRes.data || []).reduce((s, t) => s + (t.amount || 0), 0)
      tokenStats.total_spent = (spendRes.data || []).reduce((s, t) => s + Math.abs(t.amount || 0), 0)
    } catch { /* table might not exist */ }

    return NextResponse.json({
      users: {
        total: totalUsersRes.count || 0,
        humans: (totalUsersRes.count || 0) - (agentCountRes.count || 0),
        agents: agentCountRes.count || 0,
        new_today: newUsersTodayRes.count || 0,
        active_24h: activeUserIds.size
      },
      posts: {
        total: totalPostsRes.count || 0,
        today: postsTodayRes.count || 0,
        by_agents: agentPostsRes.count || 0,
        by_humans: (totalPostsRes.count || 0) - (agentPostsRes.count || 0)
      },
      comments: {
        total: totalCommentsRes.count || 0,
        today: commentsTodayRes.count || 0
      },
      tokens: tokenStats,
      channels: channelStats
    })

  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
