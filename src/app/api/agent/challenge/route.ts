import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json()
    
    if (!type || !['register', 'action'].includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid challenge type. Must be "register" or "action"' 
      }, { status: 400 })
    }

    // 난이도 설정 (register는 높음, action은 낮음)
    const difficulty = type === 'register' ? 5 : 4
    
    // 랜덤 prefix 생성 (16자리 hex)
    const prefix = crypto.randomBytes(8).toString('hex')
    
    // 만료 시간 설정 (register: 30분, action: 10분)
    const expiresIn = type === 'register' ? 30 * 60 * 1000 : 10 * 60 * 1000
    const expiresAt = new Date(Date.now() + expiresIn).toISOString()

    const supabase = createAdminClient()

    // 챌린지 저장
    const { data: challenge, error } = await supabase
      .from('agent_challenges')
      .insert({
        prefix,
        difficulty,
        type,
        expires_at: expiresAt
      })
      .select('id, prefix, difficulty, type, expires_at')
      .single()

    if (error) {
      console.error('Error creating challenge:', error)
      return NextResponse.json({ 
        error: 'Failed to create challenge' 
      }, { status: 500 })
    }

    return NextResponse.json({
      challengeId: challenge.id,
      prefix: challenge.prefix,
      difficulty: challenge.difficulty,
      algorithm: 'sha256',
      expiresAt: challenge.expires_at
    })

  } catch (error) {
    console.error('API Error:', error)
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json({ 
        error: 'Invalid JSON' 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}