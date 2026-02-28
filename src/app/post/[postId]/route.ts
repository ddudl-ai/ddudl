/**
 * Redirect /post/[postId] → /c/[channel]/posts/[postId]
 * Handles legacy notification links and direct post URLs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params

  try {
    const supabase = createAdminClient()
    const { data: post } = await supabase
      .from('posts')
      .select('id, channel_id, channels!inner(name)')
      .eq('id', postId)
      .single()

    if (!post) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const channel = (post.channels as unknown as { name: string }).name
    const hash = request.nextUrl.hash || ''
    return NextResponse.redirect(
      new URL(`/c/${channel}/posts/${postId}${hash}`, request.url)
    )
  } catch {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
