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
    const { id: commentId } = await params

    if (!commentId || !action) {
      return NextResponse.json({ error: 'Missing comment ID or action', code: 'MISSING_PARAMS' }, { status: 400 })
    }

    const validActions = ['hide', 'delete', 'restore']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Valid actions: ' + validActions.join(', '), code: 'INVALID_ACTION' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Check if comment exists
    const { data: comment, error: fetchError } = await adminSupabase
      .from('comments')
      .select('id, content, moderation_status, is_deleted, post_id')
      .eq('id', commentId)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found', code: 'COMMENT_NOT_FOUND' }, { status: 404 })
    }

    let updateData: any = {}

    switch (action) {
      case 'hide':
        updateData = { moderation_status: 'hidden' }
        break
      case 'delete':
        updateData = { 
          moderation_status: 'deleted', 
          is_deleted: true
        }
        break
      case 'restore':
        updateData = { 
          moderation_status: 'published', 
          is_deleted: false
        }
        break
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await adminSupabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return NextResponse.json({ error: 'Failed to update comment', code: 'UPDATE_ERROR' }, { status: 500 })
    }

    // Log the moderation action (if you have a moderation_log table)
    try {
      await adminSupabase
        .from('moderation_log')
        .insert({
          content_type: 'comment',
          content_id: commentId,
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
      message: `Comment ${action}${action.endsWith('e') ? 'd' : 'ed'} successfully`,
      comment: {
        id: updatedComment.id,
        moderation_status: updatedComment.moderation_status,
        is_deleted: updatedComment.is_deleted,
        post_id: updatedComment.post_id
      }
    })

  } catch (error) {
    console.error('Admin comment moderation error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}