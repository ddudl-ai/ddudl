import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('feedback_votes')
      .select('id')
      .eq('feedback_id', id)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      // Remove vote (toggle off)
      const { error: deleteError } = await supabase
        .from('feedback_votes')
        .delete()
        .eq('id', existingVote.id)

      if (deleteError) {
        console.error('Error removing vote:', deleteError)
        return NextResponse.json({ 
          error: 'Failed to remove vote',
          message: deleteError.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'removed',
        hasVoted: false
      })

    } else {
      // Add vote (toggle on)
      const { error: insertError } = await supabase
        .from('feedback_votes')
        .insert({
          feedback_id: id,
          user_id: user.id
        })

      if (insertError) {
        console.error('Error adding vote:', insertError)
        return NextResponse.json({ 
          error: 'Failed to add vote',
          message: insertError.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'added',
        hasVoted: true
      })
    }

  } catch (error) {
    console.error('Vote API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
