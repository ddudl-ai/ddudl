import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const supabase = createAdminClient()
    
    // post 상세 정보 조회
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        *,
        channels (name, display_name),
        users (username)
      `)
      .eq('id', postId)
      .eq('moderation_status', 'approved')
      .eq('is_deleted', false)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // comment 조회
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        *,
        users (username)
      `)
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return NextResponse.json({ post, comments: [] })
    }

    return NextResponse.json({ post, comments: comments || [] })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const { title, content, flair, allowGuestComments } = await request.json()
    // 세션 user 확인 (Auth)
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 프로필 조회: auth.user 메타데이터의 username으로 users 테이블 찾기
    const username = user.user_metadata?.username || user.email?.split('@')[0]
    if (!username) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    // post 작성자 확인
    const { data: existingPost } = await admin
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .single()

    if (!existingPost || existingPost.author_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admin permission으로 업데이트 (RLS 우회) — 이미 소유권 검증 완료
    const { data, error } = await admin
      .from('posts')
      .update({
        title,
        content,
        flair,
        allow_guest_comments: allowGuestComments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single()

    if (error || !data) {
      console.error('Error updating post:', error)
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
    }

    return NextResponse.json({ post: data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    // 세션 user 확인
    const auth = await createClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const username = user.user_metadata?.username || user.email?.split('@')[0]
    if (!username) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const { data: existingPost } = await admin
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .single()

    if (!existingPost || existingPost.author_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin
      .from('posts')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
