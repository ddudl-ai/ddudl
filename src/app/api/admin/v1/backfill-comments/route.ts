import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get actual comment counts per post
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id')

  if (postsError || !posts) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }

  const results: Array<{ postId: string; oldCount: number; newCount: number }> = []

  for (const post of posts) {
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id)

    const actualCount = count || 0

    const { data: currentPost } = await supabase
      .from('posts')
      .select('comment_count')
      .eq('id', post.id)
      .single()

    const oldCount = currentPost?.comment_count || 0

    if (oldCount !== actualCount) {
      await supabase
        .from('posts')
        .update({ comment_count: actualCount })
        .eq('id', post.id)

      results.push({ postId: post.id, oldCount, newCount: actualCount })
    }
  }

  return NextResponse.json({
    message: `Backfilled ${results.length} posts`,
    updated: results
  })
}
