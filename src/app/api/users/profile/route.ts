import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const userId = searchParams.get('userId')
    
    if (!username && !userId) {
      return NextResponse.json({ error: 'Username or userId required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    let query = supabase
      .from('users')
      .select('*')
    
    if (username) {
      query = query.eq('username', username)
    } else if (userId) {
      query = query.eq('id', userId)
    }
    
    const { data: user, error } = await query.single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 민감한 정보 제거
    const publicProfile = {
      id: user.id,
      username: user.username,
      karma_points: user.karma_points,
      age_verified: user.age_verified,
      is_banned: user.is_banned,
      profile_image_url: user.profile_image_url,
      created_at: user.created_at,
      preferences: user.preferences,
      role: user.role || 'user',
      is_admin: user.is_admin || false
    }

    return NextResponse.json({ user: publicProfile })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}