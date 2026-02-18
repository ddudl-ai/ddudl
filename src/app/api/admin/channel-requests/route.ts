import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: 신청 목록 조회
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Admin permission 확인
    const { data: userData } = await adminSupabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 신청 목록 조회
    const { data: requests, error } = await adminSupabase
      .from('channel_requests')
      .select(`
        id,
        name,
        display_name,
        description,
        reason,
        status,
        ai_review_result,
        admin_notes,
        created_at,
        updated_at,
        approved_at,
        rejected_at,
        creator:users!channel_requests_creator_id_fkey(username, karma_points, created_at)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching requests:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: 신청 승인/반려
export async function PUT(request: NextRequest) {
  try {
    const { requestId, action, adminNotes } = await request.json()

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Admin permission 확인
    const { data: userData } = await adminSupabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 신청 정보 조회
    const { data: requestData, error: requestError } = await adminSupabase
      .from('channel_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (action === 'approve') {
      // 서브레딧 생성
      const { data: newChannel, error: createError } = await adminSupabase
        .from('channels')
        .insert({
          name: requestData.name,
          display_name: requestData.display_name,
          description: requestData.description,
          creator_id: requestData.creator_id,
          member_count: 1,
          is_active: true
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating channel:', createError)
        return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
      }

      // 생성자를 Admin로 등록
      await adminSupabase
        .from('channel_members')
        .insert({
          user_id: requestData.creator_id,
          channel_id: newChannel.id,
          role: 'admin',
          joined_at: new Date().toISOString()
        })

      // 신청 상태 업데이트
      const { error: updateError } = await adminSupabase
        .from('channel_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          channel_id: newChannel.id
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('Error updating request:', updateError)
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Channel successfully created.',
        channel: newChannel
      })
    } else {
      // 반려 처리
      const { error: rejectError } = await adminSupabase
        .from('channel_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          approved_by: user.id,
          rejected_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (rejectError) {
        console.error('Error rejecting request:', rejectError)
        return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Application has been rejected.' 
      })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}