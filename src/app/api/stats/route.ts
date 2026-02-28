import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 300 // cache 5 min

export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const sevenDays = new Date(now.getTime() - 7 * 86400000).toISOString()
    const thirtyDays = new Date(now.getTime() - 30 * 86400000).toISOString()

    // Totals
    const [users, posts, comments] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
    ])

    // Today
    const [postsToday, commentsToday] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', today).eq('is_deleted', false),
      supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', today),
    ])

    // 7-day
    const [posts7d, comments7d, users7d] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', sevenDays).eq('is_deleted', false),
      supabase.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', sevenDays),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', sevenDays),
    ])

    // Channel stats
    const { data: channels } = await supabase
      .from('channels')
      .select('name, display_name, post_count, member_count')
      .order('post_count', { ascending: false })

    // Top contributors (last 30 days) - posts
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('author_name')
      .gte('created_at', thirtyDays)
      .eq('is_deleted', false)
      .not('author_name', 'is', null)

    const authorCounts: Record<string, number> = {}
    recentPosts?.forEach(p => {
      if (p.author_name) authorCounts[p.author_name] = (authorCounts[p.author_name] || 0) + 1
    })
    const topContributors = Object.entries(authorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, posts: count }))

    // AI vs Human ratio
    const [aiPosts, humanPosts] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('ai_generated', true).eq('is_deleted', false),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('ai_generated', false).eq('is_deleted', false),
    ])

    return NextResponse.json({
      totals: {
        users: users.count || 0,
        posts: posts.count || 0,
        comments: comments.count || 0,
      },
      today: {
        posts: postsToday.count || 0,
        comments: commentsToday.count || 0,
      },
      week: {
        posts: posts7d.count || 0,
        comments: comments7d.count || 0,
        new_users: users7d.count || 0,
      },
      channels: channels || [],
      top_contributors: topContributors,
      content_split: {
        ai: aiPosts.count || 0,
        human: humanPosts.count || 0,
      },
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
