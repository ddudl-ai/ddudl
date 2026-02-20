import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: comments, error } = await supabase
      .from('feedback_comments')
      .select(`
        id,
        content,
        author_id,
        author_name,
        created_at
      `)
      .eq('feedback_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json({
      comments: comments || []
    })

  } catch (error) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Missing content',
        message: 'Comment content is required'
      }, { status: 400 })
    }

    // Get user info
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single()

    const { data: newComment, error: createError } = await supabase
      .from('feedback_comments')
      .insert({
        feedback_id: id,
        author_id: user.id,
        author_name: userData?.username || 'Anonymous',
        content: content.trim()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating comment:', createError)
      return NextResponse.json({ 
        error: 'Failed to create comment',
        message: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      comment: newComment
    })

  } catch (error) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
