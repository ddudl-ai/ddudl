import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get all comments grouped by post_id in one query
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('post_id')

  if (commentsError) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }

  // Count comments per post
  const counts: Record<string, number> = {}
  for (const c of comments || []) {
    counts[c.post_id] = (counts[c.post_id] || 0) + 1
  }

  // Update all posts with actual counts
  const updates = await Promise.all(
    Object.entries(counts).map(([postId, count]) =>
      supabase.from('posts').update({ comment_count: count }).eq('id', postId)
    )
  )

  return NextResponse.json({
    message: `Backfilled ${Object.keys(counts).length} posts`,
    counts
  })
}
