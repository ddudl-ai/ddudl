import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status') || 'open'
    const sort = searchParams.get('sort') || 'popular'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    let query = supabase
      .from('feedback')
      .select(`
        id,
        title,
        description,
        category,
        status,
        author_name,
        upvote_count,
        comment_count,
        created_at,
        updated_at
      `)

    // Filter by category
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply sorting
    if (sort === 'popular') {
      query = query.order('upvote_count', { ascending: false })
    } else if (sort === 'newest') {
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: feedbackList, error } = await query

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json({
      feedback: feedbackList || [],
      pagination: {
        limit,
        offset,
        total: feedbackList?.length || 0
      }
    })

  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, category } = body

    if (!title || !description || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'title, description, and category are required'
      }, { status: 400 })
    }

    if (!['feature', 'bug', 'enhancement'].includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category',
        message: 'category must be one of: feature, bug, enhancement'
      }, { status: 400 })
    }

    // Get user info
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single()

    const { data: newFeedback, error: createError } = await supabase
      .from('feedback')
      .insert({
        title,
        description,
        category,
        author_id: user.id,
        author_name: userData?.username || 'Anonymous'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating feedback:', createError)
      return NextResponse.json({ 
        error: 'Failed to create feedback',
        message: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      feedback: newFeedback
    })

  } catch (error) {
    console.error('Feedback POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
