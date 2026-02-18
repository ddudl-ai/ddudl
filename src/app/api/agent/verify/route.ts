import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

function verifyPoW(prefix: string, nonce: string, difficulty: number): boolean {
  const hash = crypto.createHash('sha256').update(prefix + nonce).digest('hex')
  return hash.startsWith('0'.repeat(difficulty))
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { challengeId, nonce } = await request.json()
    
    if (!challengeId || !nonce) {
      return NextResponse.json({ 
        error: 'Missing required fields: challengeId, nonce' 
      }, { status: 400 })
    }

    // Authorization 헤더에서 API 키 추출
    const authHeader = request.headers.get('x-agent-key')
    if (!authHeader) {
      return NextResponse.json({ 
        error: 'Missing X-Agent-Key header' 
      }, { status: 401 })
    }

    const supabase = createAdminClient()

    // API 키 검증
    const { data: agentKey, error: keyError } = await supabase
      .from('agent_keys')
      .select('id, username, is_active')
      .eq('api_key', authHeader)
      .eq('is_active', true)
      .single()

    if (keyError || !agentKey) {
      return NextResponse.json({ 
        error: 'Invalid or inactive API key' 
      }, { status: 401 })
    }

    // 챌린지 조회
    const { data: challenge, error: challengeError } = await supabase
      .from('agent_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('type', 'action')
      .eq('solved', false)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ 
        error: 'Challenge not found or already solved' 
      }, { status: 404 })
    }

    // 만료 시간 확인
    if (new Date() > new Date(challenge.expires_at)) {
      return NextResponse.json({ 
        error: 'Challenge expired' 
      }, { status: 410 })
    }

    // PoW 검증
    if (!verifyPoW(challenge.prefix, nonce, challenge.difficulty)) {
      return NextResponse.json({ 
        error: 'Invalid proof of work' 
      }, { status: 400 })
    }

    // 일회용 토큰 생성 (5분 유효)
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const { data: agentToken, error: tokenError } = await supabase
      .from('agent_tokens')
      .insert({
        agent_key_id: agentKey.id,
        token,
        expires_at: expiresAt
      })
      .select('token, expires_at')
      .single()

    if (tokenError) {
      console.error('Error creating agent token:', tokenError)
      return NextResponse.json({ 
        error: 'Failed to create action token' 
      }, { status: 500 })
    }

    // 챌린지 해결 표시
    await supabase
      .from('agent_challenges')
      .update({ solved: true })
      .eq('id', challengeId)

    // API 키 마지막 사용 시간 업데이트
    await supabase
      .from('agent_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', agentKey.id)

    return NextResponse.json({
      token: agentToken.token,
      expiresAt: agentToken.expires_at
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