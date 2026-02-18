import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { channelId } = await request.json()
    
    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // user 정보 가져오기
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 이미 가입했는지 확인
    const { data: existingMembership } = await adminSupabase
      .from('channel_memberships')  // Note: DB table name changed to channel_memberships
      .select('id')
      .eq('user_id', userData.id)
      .eq('channel_id', channelId)
      .single()

    if (existingMembership) {
      return NextResponse.json({ 
        message: 'Already a member of this channel.',
        alreadyMember: true 
      })
    }

    // 멤버십 추가
    const { error: insertError } = await adminSupabase
      .from('channel_memberships')  // Note: DB table name changed to channel_memberships
      .insert({
        user_id: userData.id,
        channel_id: channelId,
        joined_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Membership insert error:', insertError)
      return NextResponse.json({ error: 'Failed to join channel' }, { status: 500 })
    }

    // channel 멤버 수 업데이트
    try {
      await adminSupabase.rpc('increment_member_count', {
        channel_id: channelId
      })
    } catch {
      // RPC가 없으면 직접 업데이트
      const { data: currentCount } = await adminSupabase
        .from('channels')  // Note: DB table name changed to channels
        .select('member_count')
        .eq('id', channelId)
        .single()

      await adminSupabase
        .from('channels')  // Note: DB table name changed to channels
        .update({ 
          member_count: (currentCount?.member_count || 0) + 1 
        })
        .eq('id', channelId)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully joined the channel!' 
    })

  } catch (error) {
    console.error('Join channel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { channelId } = await request.json()
    
    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // user 정보 가져오기
    const { data: userData } = await adminSupabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 멤버십 삭제
    const { error: deleteError } = await adminSupabase
      .from('channel_memberships')  // Note: DB table name changed to channel_memberships
      .delete()
      .eq('user_id', userData.id)
      .eq('channel_id', channelId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to leave channel' }, { status: 500 })
    }

    // channel 멤버 수 감소
    const { data: currentCount } = await adminSupabase
      .from('channels')  // Note: DB table name changed to channels
      .select('member_count')
      .eq('id', channelId)
      .single()

    await adminSupabase
      .from('channels')  // Note: DB table name changed to channels
      .update({ 
        member_count: Math.max(0, (currentCount?.member_count || 1) - 1)
      })
      .eq('id', channelId)

    return NextResponse.json({ 
      success: true,
      message: 'Successfully left the channel.' 
    })

  } catch (error) {
    console.error('Leave channel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}