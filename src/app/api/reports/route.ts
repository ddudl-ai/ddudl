import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_REASONS = ['spam', 'harassment', 'misinformation', 'off-topic', 'inappropriate', 'other']

// POST /api/reports — create a new report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to report content' }, { status: 401 })
    }

    const { contentId, contentType, reason, description } = await request.json()

    if (!contentId || !contentType || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!['post', 'comment'].includes(contentType)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check for duplicate report
    const { data: existing } = await admin
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('reported_content_id', contentId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You have already reported this content' }, { status: 409 })
    }

    const { data: report, error } = await admin
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_content_id: contentId,
        content_type: contentType,
        reason,
        description: description?.slice(0, 500) || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, reportId: report.id })
  } catch (err: unknown) {
    console.error('Report error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
