import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: feedback, error } = await supabase
      .from('feedback')
      .select(`
        id,
        title,
        description,
        category,
        status,
        author_id,
        author_name,
        upvote_count,
        comment_count,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // Check if current user has voted
    const { data: { user } } = await supabase.auth.getUser()
    let hasVoted = false

    if (user) {
      const { data: vote } = await supabase
        .from('feedback_votes')
        .select('id')
        .eq('feedback_id', id)
        .eq('user_id', user.id)
        .single()

      hasVoted = !!vote
    }

    return NextResponse.json({
      feedback,
      hasVoted
    })

  } catch (error) {
    console.error('Feedback detail API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
