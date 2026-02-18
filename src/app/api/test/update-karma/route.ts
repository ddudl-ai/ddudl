import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username') || 'someone'
    const amount = parseInt(searchParams.get('amount') || '100')
    
    const supabase = createAdminClient()
    
    // user 찾기
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()
    
    if (fetchError || !user) {
      return NextResponse.json({ 
        error: 'User not found', 
        details: fetchError 
      }, { status: 404 })
    }
    
    
    // karma_points 업데이트
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({ 
        karma_points: amount 
      })
      .eq('id', user.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update karma', 
        details: updateError 
      }, { status: 500 })
    }
    
    
    return NextResponse.json({ 
      success: true,
      user: updated,
      message: `Updated ${username}'s karma points to ${amount}`
    })
    
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      error: 'Internal error', 
      details: error 
    }, { status: 500 })
  }
}