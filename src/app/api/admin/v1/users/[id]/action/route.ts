import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Validate Admin API Key
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { action, reason, duration_days } = await request.json()
    const { id: userId } = await params

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing user ID or action', code: 'MISSING_PARAMS' }, { status: 400 })
    }

    const validActions = ['warn', 'suspend', 'ban', 'unsuspend', 'unban']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Valid actions: ' + validActions.join(', '), code: 'INVALID_ACTION' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Check if user exists
    const { data: user, error: fetchError } = await adminSupabase
      .from('users')
      .select('id, username, email, is_banned, banned_until')
      .eq('id', userId)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, { status: 404 })
    }

    let updateData: any = {}
    let message = ''

    switch (action) {
      case 'warn':
        // Warning doesn't change user status, just logs the action
        message = `User ${user.username} warned successfully`
        break
      case 'suspend':
        if (!duration_days || duration_days <= 0) {
          return NextResponse.json({ error: 'Duration in days is required for suspension', code: 'MISSING_DURATION' }, { status: 400 })
        }
        const suspendUntil = new Date()
        suspendUntil.setDate(suspendUntil.getDate() + duration_days)
        updateData = { 
          is_banned: true, 
          banned_until: suspendUntil.toISOString()
        }
        message = `User ${user.username} suspended for ${duration_days} days`
        break
      case 'ban':
        updateData = { 
          is_banned: true, 
          banned_until: null // Permanent ban
        }
        message = `User ${user.username} permanently banned`
        break
      case 'unsuspend':
      case 'unban':
        updateData = { 
          is_banned: false, 
          banned_until: null
        }
        message = `User ${user.username} unbanned successfully`
        break
    }

    // Update the user if needed
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await adminSupabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating user:', updateError)
        return NextResponse.json({ error: 'Failed to update user', code: 'UPDATE_ERROR' }, { status: 500 })
      }
    }

    // Log the action (if you have a moderation_log table)
    try {
      await adminSupabase
        .from('moderation_log')
        .insert({
          content_type: 'user',
          content_id: userId,
          action: action,
          reason: reason || null,
          moderator: 'admin_api',
          metadata: duration_days ? { duration_days } : null,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      // Moderation log table might not exist, that's OK
    }

    // Get updated user data
    const { data: updatedUser } = await adminSupabase
      .from('users')
      .select('id, username, email, is_banned, banned_until')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      success: true,
      message,
      user: {
        id: updatedUser?.id || user.id,
        username: updatedUser?.username || user.username,
        is_banned: updatedUser?.is_banned || false,
        banned_until: updatedUser?.banned_until,
        status: updatedUser?.is_banned 
          ? (updatedUser?.banned_until ? 'suspended' : 'banned')
          : 'active'
      }
    })

  } catch (error) {
    console.error('Admin user action error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}