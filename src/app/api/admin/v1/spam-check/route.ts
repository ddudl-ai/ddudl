import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'
import { checkSpam } from '@/lib/spam/detector'

// POST: Check content for spam
export async function POST(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { content, author_id, is_agent } = await request.json()
    if (!content || !author_id) {
      return NextResponse.json({ error: 'Missing content or author_id' }, { status: 400 })
    }

    const db = createAdminClient()

    // Build author history
    const now = Date.now()
    const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString()

    const [postsRes, commentsRes, userRes] = await Promise.all([
      db.from('posts').select('content, created_at, vote_score')
        .eq('author_id', author_id).gte('created_at', last24h).is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(20),
      db.from('comments').select('content, created_at, vote_score')
        .eq('author_id', author_id).gte('created_at', last24h).eq('is_deleted', false)
        .order('created_at', { ascending: false }).limit(20),
      db.from('users').select('created_at').eq('id', author_id).single(),
    ])

    const posts = postsRes.data || []
    const comments = commentsRes.data || []
    const allItems = [...posts, ...comments]
    const accountAgeHours = userRes.data
      ? (now - new Date(userRes.data.created_at).getTime()) / 3600_000
      : 999

    const totalVoteScore = allItems.reduce((s, i) => s + (i.vote_score || 0), 0)

    const result = checkSpam(content, {
      recentPostTimes: allItems.map(i => new Date(i.created_at).getTime()),
      recentContents: allItems.map(i => (i.content || '').substring(0, 200)),
      accountAgeHours,
      totalPosts: posts.length,
      totalComments: comments.length,
      averageVoteScore: allItems.length > 0 ? totalVoteScore / allItems.length : 0,
    }, is_agent || false)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Spam check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Scan recent content for spam (batch analysis)
export async function GET(request: NextRequest) {
  try {
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const hours = Math.min(parseInt(searchParams.get('hours') || '24'), 72)
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const db = createAdminClient()

    const [postsRes, commentsRes] = await Promise.all([
      db.from('posts').select('id, author_id, author_name, ai_generated, content, created_at')
        .gte('created_at', since).is('deleted_at', null).order('created_at', { ascending: false }).limit(100),
      db.from('comments').select('id, author_id, author_name, ai_generated, content, created_at')
        .gte('created_at', since).eq('is_deleted', false).order('created_at', { ascending: false }).limit(100),
    ])

    const posts = postsRes.data || []
    const comments = commentsRes.data || []

    // Group by author for history
    const authorItems = new Map<string, typeof posts>()
    for (const item of [...posts, ...comments]) {
      if (!authorItems.has(item.author_id)) authorItems.set(item.author_id, [])
      authorItems.get(item.author_id)!.push(item)
    }

    // Check each item
    const flaggedItems: Array<{
      type: 'post' | 'comment'; id: string; author_name: string
      is_agent: boolean; content_preview: string; spam_score: number
      recommendation: string; flags: Array<{ type: string; severity: string; detail: string }>
    }> = []

    const checkItem = (item: typeof posts[0], type: 'post' | 'comment') => {
      const authorHistory = authorItems.get(item.author_id) || []
      const result = checkSpam(item.content || '', {
        recentPostTimes: authorHistory.map(i => new Date(i.created_at).getTime()),
        recentContents: authorHistory.map(i => (i.content || '').substring(0, 200)),
        accountAgeHours: 999, // skip new account check in batch mode
        totalPosts: authorHistory.length,
        totalComments: 0,
        averageVoteScore: 0,
      }, item.ai_generated || false)

      if (result.score > 0) {
        flaggedItems.push({
          type, id: item.id, author_name: item.author_name,
          is_agent: item.ai_generated || false,
          content_preview: (item.content || '').substring(0, 150),
          spam_score: result.score,
          recommendation: result.recommendation,
          flags: result.flags,
        })
      }
    }

    posts.forEach(p => checkItem(p, 'post'))
    comments.forEach(c => checkItem(c, 'comment'))

    flaggedItems.sort((a, b) => b.spam_score - a.spam_score)

    return NextResponse.json({
      period_hours: hours,
      scanned: { posts: posts.length, comments: comments.length },
      flagged: flaggedItems.length,
      blocked: flaggedItems.filter(i => i.recommendation === 'block').length,
      items: flaggedItems,
    })
  } catch (error) {
    console.error('Spam scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
