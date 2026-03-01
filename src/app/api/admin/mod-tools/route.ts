import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: Fetch review queue + recent mod actions
export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'queue' // 'queue' | 'log'

    if (view === 'log') {
      // Fetch recent moderation log
      const { data: logs } = await db
        .from('moderation_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      return NextResponse.json({ logs: logs || [] })
    }

    // Default: review queue
    const last48Hours = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const [postsRes, commentsRes] = await Promise.all([
      db
        .from('posts')
        .select('id, title, content, author_name, upvote_count, downvote_count, vote_score, created_at, ai_generated, moderation_status, channel_id')
        .or(`vote_score.lt.-1,moderation_status.eq.pending`)
        .eq('is_deleted', false)
        .gte('created_at', last48Hours)
        .order('vote_score', { ascending: true })
        .limit(30),
      db
        .from('comments')
        .select('id, content, author_name, upvote_count, downvote_count, vote_score, created_at, ai_generated, moderation_status, post_id')
        .or(`vote_score.lt.-1,moderation_status.eq.pending`)
        .eq('is_deleted', false)
        .gte('created_at', last48Hours)
        .order('vote_score', { ascending: true })
        .limit(30),
    ])

    const queue = [
      ...(postsRes.data || []).map(p => ({
        type: 'post' as const,
        id: p.id,
        title: p.title,
        content: (p.content || '').substring(0, 300),
        author_name: p.author_name,
        vote_score: p.vote_score || 0,
        upvotes: p.upvote_count || 0,
        downvotes: p.downvote_count || 0,
        ai_generated: p.ai_generated || false,
        moderation_status: p.moderation_status,
        created_at: p.created_at,
      })),
      ...(commentsRes.data || []).map(c => ({
        type: 'comment' as const,
        id: c.id,
        title: null,
        content: (c.content || '').substring(0, 300),
        author_name: c.author_name,
        vote_score: c.vote_score || 0,
        upvotes: c.upvote_count || 0,
        downvotes: c.downvote_count || 0,
        ai_generated: c.ai_generated || false,
        moderation_status: c.moderation_status,
        created_at: c.created_at,
      })),
    ].sort((a, b) => a.vote_score - b.vote_score)

    return NextResponse.json({ queue })
  } catch (error) {
    console.error('Mod tools GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Execute moderation action
export async function POST(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { type, id, action, reason } = await request.json()

    if (!type || !id || !action) {
      return NextResponse.json({ error: 'Missing type, id, or action' }, { status: 400 })
    }

    const table = type === 'post' ? 'posts' : 'comments'

    let updateData: Record<string, unknown> = {}
    switch (action) {
      case 'approve':
        updateData = { moderation_status: 'approved' }
        break
      case 'hide':
        updateData = { moderation_status: 'rejected', is_deleted: true }
        break
      case 'delete':
        updateData = { is_deleted: true, deleted_at: new Date().toISOString() }
        break
      case 'restore':
        updateData = { moderation_status: 'approved', is_deleted: false, deleted_at: null }
        break
      case 'pin':
        if (type !== 'post') return NextResponse.json({ error: 'Can only pin posts' }, { status: 400 })
        updateData = { is_pinned: true }
        break
      case 'unpin':
        if (type !== 'post') return NextResponse.json({ error: 'Can only unpin posts' }, { status: 400 })
        updateData = { is_pinned: false }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error: updateError } = await db
      .from(table)
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    // Log moderation action (best effort)
    try {
      await db.from('moderation_log').insert({
        content_type: type,
        content_id: id,
        action,
        reason: reason || null,
        moderator: 'admin_dashboard',
        created_at: new Date().toISOString(),
      })
    } catch {
      // table might not exist
    }

    return NextResponse.json({ success: true, action, type, id })
  } catch (error) {
    console.error('Mod tools POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
