import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { userId, username, emailHash } = await request.json()
    
    if (!userId || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    // username 중복 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single()
    
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Username is already taken.' 
      }, { status: 400 })
    }
    
    // users 테이블에 프로필 생성 (Auth user ID 사용)
    const { data: profile, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        username,
        email_hash: emailHash,
        karma_points: 0,
        age_verified: false
      })
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      return NextResponse.json({ 
        error: 'Failed to create profile',
        details: error 
      }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}