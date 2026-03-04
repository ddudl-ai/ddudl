import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminAccess, unauthorizedResponse } from '@/lib/admin-auth'

interface DailyGrowth {
  date: string
  new_users: number
  new_agents: number
  new_posts: number
  new_comments: number
  active_users: number
}

export async function GET(request: NextRequest) {
  try {
    if (!(await validateAdminAccess(request))) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const db = createAdminClient()

    // Fetch all needed data in parallel
    const [usersRes, agentKeysRes, postsRes, commentsRes] = await Promise.all([
      db.from('users').select('id, created_at').gte('created_at', since),
      db.from('agent_keys').select('user_id, created_at').gte('created_at', since),
      db.from('posts').select('id, author_id, created_at').gte('created_at', since).is('deleted_at', null),
      db.from('comments').select('id, author_id, created_at').gte('created_at', since).is('deleted_at', null),
    ])

    const users = usersRes.data || []
    const agentKeys = agentKeysRes.data || []
    const posts = postsRes.data || []
    const comments = commentsRes.data || []

    // Build agent user ID set
    const agentUserIds = new Set(agentKeys.map(a => a.user_id))

    // Aggregate by date
    const dailyMap = new Map<string, {
      new_users: number
      new_agents: number
      new_posts: number
      new_comments: number
      active_user_ids: Set<string>
    }>()

    const ensureDay = (date: string) => {
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          new_users: 0, new_agents: 0, new_posts: 0, new_comments: 0,
          active_user_ids: new Set(),
        })
      }
      return dailyMap.get(date)!
    }

    for (const u of users) {
      const date = u.created_at.substring(0, 10)
      const day = ensureDay(date)
      if (agentUserIds.has(u.id)) {
        day.new_agents++
      } else {
        day.new_users++
      }
    }

    for (const p of posts) {
      const date = p.created_at.substring(0, 10)
      const day = ensureDay(date)
      day.new_posts++
      day.active_user_ids.add(p.author_id)
    }

    for (const c of comments) {
      const date = c.created_at.substring(0, 10)
      const day = ensureDay(date)
      day.new_comments++
      day.active_user_ids.add(c.author_id)
    }

    // Fill gaps and sort
    const startDate = new Date(since)
    const endDate = new Date()
    const daily: DailyGrowth[] = []
    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().substring(0, 10)
      const entry = dailyMap.get(dateStr)
      daily.push({
        date: dateStr,
        new_users: entry?.new_users || 0,
        new_agents: entry?.new_agents || 0,
        new_posts: entry?.new_posts || 0,
        new_comments: entry?.new_comments || 0,
        active_users: entry?.active_user_ids.size || 0,
      })
    }

    // Cumulative totals
    const { count: totalUsers } = await db.from('users').select('*', { count: 'exact', head: true })
    const { count: totalAgents } = await db.from('agent_keys').select('*', { count: 'exact', head: true })
    const { count: totalPosts } = await db.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null)

    // Period totals
    const periodUsers = users.filter(u => !agentUserIds.has(u.id)).length
    const periodAgents = users.filter(u => agentUserIds.has(u.id)).length
    const periodPosts = posts.length
    const periodComments = comments.length

    // Week-over-week comparison
    const recentWeek = daily.slice(-7)
    const previousWeek = daily.slice(-14, -7)
    const sum = (arr: DailyGrowth[], key: keyof Omit<DailyGrowth, 'date'>) =>
      arr.reduce((s, d) => s + d[key], 0)

    const wow = (recent: number, previous: number) => {
      if (previous === 0) return recent > 0 ? 100 : 0
      return Math.round(((recent - previous) / previous) * 100)
    }

    return NextResponse.json({
      period: { days, since: since.substring(0, 10) },
      totals: {
        users: totalUsers || 0,
        humans: (totalUsers || 0) - (totalAgents || 0),
        agents: totalAgents || 0,
        posts: totalPosts || 0,
      },
      period_growth: {
        new_humans: periodUsers,
        new_agents: periodAgents,
        new_posts: periodPosts,
        new_comments: periodComments,
      },
      wow_change: {
        users: wow(sum(recentWeek, 'new_users'), sum(previousWeek, 'new_users')),
        posts: wow(sum(recentWeek, 'new_posts'), sum(previousWeek, 'new_posts')),
        comments: wow(sum(recentWeek, 'new_comments'), sum(previousWeek, 'new_comments')),
        active_users: wow(sum(recentWeek, 'active_users'), sum(previousWeek, 'active_users')),
      },
      daily,
    })
  } catch (error) {
    console.error('Growth tracking API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
