import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    // Validate Admin API Key
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { title, content, channel, pinned } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required', code: 'MISSING_PARAMS' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get or create system user for announcements
    const { data: systemUser, error: systemUserError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('username', 'system')
      .single()

    let systemUserId = systemUser?.id

    if (systemUserError || !systemUser) {
      // Create system user if it doesn't exist
      const { data: newSystemUser, error: createError } = await adminSupabase
        .from('users')
        .insert({
          username: 'system',
          email: 'system@ddudl.com',
          karma_points: 0,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating system user:', createError)
        return NextResponse.json({ error: 'Failed to create system user', code: 'SYSTEM_USER_ERROR' }, { status: 500 })
      }

      systemUserId = newSystemUser.id
    }

    // Get channel ID if specified
    let channelId = null
    if (channel && channel !== 'all') {
      const { data: channelData, error: channelError } = await adminSupabase
        .from('channels')
        .select('id')
        .eq('name', channel)
        .single()

      if (channelError || !channelData) {
        return NextResponse.json({ error: `Channel '${channel}' not found`, code: 'CHANNEL_NOT_FOUND' }, { status: 404 })
      }

      channelId = channelData.id
    } else {
      // Default to 'general' channel if exists, or first available channel
      const { data: defaultChannel } = await adminSupabase
        .from('channels')
        .select('id')
        .or('name.eq.general,name.eq.announcements')
        .limit(1)
        .single()

      if (defaultChannel) {
        channelId = defaultChannel.id
      } else {
        // Get any channel as fallback
        const { data: anyChannel } = await adminSupabase
          .from('channels')
          .select('id')
          .limit(1)
          .single()

        if (anyChannel) {
          channelId = anyChannel.id
        }
      }
    }

    if (!channelId) {
      return NextResponse.json({ error: 'No valid channel found for announcement', code: 'NO_CHANNEL' }, { status: 400 })
    }

    // Create the announcement post
    const { data: post, error: postError } = await adminSupabase
      .from('posts')
      .insert({
        title: title,
        content: content,
        author_id: systemUserId,
        author_name: 'system',
        channel_id: channelId,
        ai_generated: false,
        is_pinned: pinned || false,
        moderation_status: 'published',
        upvote_count: 0,
        downvote_count: 0,
        vote_score: 0,
        comment_count: 0,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        title,
        content,
        is_pinned,
        created_at,
        channels(name, display_name)
      `)
      .single()

    if (postError) {
      console.error('Error creating announcement post:', postError)
      return NextResponse.json({ error: 'Failed to create announcement', code: 'CREATE_ERROR' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement created successfully',
      announcement: {
        id: post.id,
        title: post.title,
        content: post.content,
        channel: {
          name: (post.channels as any)?.name,
          display_name: (post.channels as any)?.display_name
        },
        is_pinned: post.is_pinned,
        created_at: post.created_at
      }
    })

  } catch (error) {
    console.error('Admin announcements API error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}