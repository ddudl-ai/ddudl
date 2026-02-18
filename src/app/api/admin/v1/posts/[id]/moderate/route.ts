import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Validate Admin API Key
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { action, reason } = await request.json()
    const { id: postId } = await params

    if (!postId || !action) {
      return NextResponse.json({ error: 'Missing post ID or action', code: 'MISSING_PARAMS' }, { status: 400 })
    }

    const validActions = ['hide', 'delete', 'pin', 'unpin', 'restore']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Valid actions: ' + validActions.join(', '), code: 'INVALID_ACTION' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Check if post exists
    const { data: post, error: fetchError } = await adminSupabase
      .from('posts')
      .select('id, title, moderation_status, is_deleted, is_pinned')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found', code: 'POST_NOT_FOUND' }, { status: 404 })
    }

    let updateData: any = {}

    switch (action) {
      case 'hide':
        updateData = { moderation_status: 'rejected', is_deleted: true }
        break
      case 'delete':
        updateData = { 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        }
        break
      case 'pin':
        updateData = { is_pinned: true }
        break
      case 'unpin':
        updateData = { is_pinned: false }
        break
      case 'restore':
        updateData = { 
          moderation_status: 'approved', 
          is_deleted: false,
          deleted_at: null
        }
        break
    }

    // Update the post
    const { data: updatedPost, error: updateError } = await adminSupabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating post:', updateError)
      return NextResponse.json({ error: 'Failed to update post', code: 'UPDATE_ERROR' }, { status: 500 })
    }

    // Log the moderation action (if you have a moderation_log table)
    try {
      await adminSupabase
        .from('moderation_log')
        .insert({
          content_type: 'post',
          content_id: postId,
          action: action,
          reason: reason || null,
          moderator: 'admin_api',
          created_at: new Date().toISOString()
        })
    } catch (error) {
      // Moderation log table might not exist, that's OK
    }

    return NextResponse.json({
      success: true,
      message: `Post ${action}${action.endsWith('e') ? 'd' : action === 'pin' || action === 'unpin' ? 'ned' : 'ed'} successfully`,
      post: {
        id: updatedPost.id,
        title: updatedPost.title,
        moderation_status: updatedPost.moderation_status,
        is_deleted: updatedPost.is_deleted,
        is_pinned: updatedPost.is_pinned
      }
    })

  } catch (error) {
    console.error('Admin post moderation error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}