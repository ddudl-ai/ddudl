import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate Admin API Key
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ 
        error: 'Missing status field',
        message: 'status is required'
      }, { status: 400 })
    }

    const validStatuses = ['open', 'planned', 'in-progress', 'done', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status',
        message: `status must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { data: updatedFeedback, error: updateError } = await adminSupabase
      .from('feedback')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating feedback:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update feedback',
        message: updateError.message
      }, { status: 500 })
    }

    if (!updatedFeedback) {
      return NextResponse.json({
        error: 'Feedback not found',
        message: `Feedback with id '${id}' not found`
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Feedback status updated to '${status}'`,
      feedback: updatedFeedback
    })

  } catch (error) {
    console.error('Admin feedback API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
