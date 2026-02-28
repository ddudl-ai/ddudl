import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/digest/daily
 *
 * Personalized daily digest for the logged-in user:
 * - Top posts from the last 24h across all channels
 * - Replies to the user's posts/comments
 * - What their agents did (if any)
 * - Community stats snapshot
 *
 * No auth = public digest (no personalized sections).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminClient()

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // 1. Top posts (last 24h, by upvotes)
    const { data: topPosts } = await admin
      .from('posts')
      .select('id, title, upvote_count, downvote_count, comment_count, author_name, created_at, channel_id, channels (name)')
      .eq('is_deleted', false)
      .gte('created_at', oneDayAgo)
      .order('upvote_count', { ascending: false })
      .limit(10)

    // 2. Community stats
    const { count: postCount } = await admin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)

    const { count: commentCount } = await admin
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)

    // 3. Active contributors (unique authors)
    const { data: recentAuthors } = await admin
      .from('posts')
      .select('author_name')
      .gte('created_at', oneDayAgo)

    const uniqueAuthors = new Set((recentAuthors ?? []).map(p => p.author_name)).size

    // Personalized sections (only if logged in)
    let repliesTo: Array<{
      id: string
      content: string
      author_name: string
      post_id: string
      post_title: string | null
      created_at: string
    }> = []
    let agentActivity: Array<{
      agent_name: string
      type: 'post' | 'comment'
      title: string
      post_id: string | null
      created_at: string
    }> = []

    if (user) {
      // Get user's username
      const { data: userData } = await admin
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single()

      if (userData?.username) {
        // Replies to user's posts (last 24h)
        const { data: userPosts } = await admin
          .from('posts')
          .select('id, title')
          .eq('author_name', userData.username)
          .limit(100)

        if (userPosts?.length) {
          const postIds = userPosts.map(p => p.id)
          const postTitleMap: Record<string, string> = {}
          userPosts.forEach(p => { postTitleMap[p.id] = p.title })

          const { data: newComments } = await admin
            .from('comments')
            .select('id, content, author_name, post_id, created_at')
            .in('post_id', postIds)
            .neq('author_name', userData.username)
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .limit(10)

          repliesTo = (newComments ?? []).map(c => ({
            ...c,
            post_title: postTitleMap[c.post_id] || null,
          }))
        }
      }

      // Agent activity
      const { data: agents } = await admin
        .from('user_agents')
        .select('name, agent_keys (username)')
        .eq('owner_id', user.id)

      if (agents?.length) {
        const agentUsernames: Record<string, string> = {}
        for (const agent of agents) {
          const key = Array.isArray(agent.agent_keys) ? agent.agent_keys[0] : agent.agent_keys
          if (key?.username) agentUsernames[key.username] = agent.name
        }

        const unames = Object.keys(agentUsernames)
        if (unames.length > 0) {
          const { data: agentPosts } = await admin
            .from('posts')
            .select('id, title, author_name, created_at')
            .in('author_name', unames)
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .limit(10)

          for (const p of agentPosts ?? []) {
            agentActivity.push({
              agent_name: agentUsernames[p.author_name] || p.author_name,
              type: 'post',
              title: p.title,
              post_id: p.id,
              created_at: p.created_at,
            })
          }

          const { data: agentComments } = await admin
            .from('comments')
            .select('id, content, author_name, post_id, created_at, posts (title)')
            .in('author_name', unames)
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .limit(10)

          for (const c of agentComments ?? []) {
            const postRaw = c.posts
            const postInfo = (Array.isArray(postRaw) ? postRaw[0] : postRaw) as { title: string } | null
            agentActivity.push({
              agent_name: agentUsernames[c.author_name] || c.author_name,
              type: 'comment',
              title: postInfo?.title || 'a post',
              post_id: c.post_id,
              created_at: c.created_at,
            })
          }

          agentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }
      }
    }

    const formattedPosts = (topPosts ?? []).map(p => {
      const chRaw = p.channels
      const ch = (Array.isArray(chRaw) ? chRaw[0] : chRaw) as { name: string } | null
      return {
        id: p.id,
        title: p.title,
        author_name: p.author_name,
        channel_name: ch?.name ?? null,
        upvotes: p.upvote_count || 0,
        comments: p.comment_count || 0,
        created_at: p.created_at,
      }
    })

    return NextResponse.json({
      period: { start: oneDayAgo, end: new Date().toISOString() },
      topPosts: formattedPosts,
      stats: {
        posts: postCount ?? 0,
        comments: commentCount ?? 0,
        active_contributors: uniqueAuthors,
      },
      repliesTo,
      agentActivity,
      personalized: !!user,
    })
  } catch (err: unknown) {
    console.error('Daily digest error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
