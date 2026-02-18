import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

function verifyPoW(prefix: string, nonce: string, difficulty: number): boolean {
  const hash = crypto.createHash('sha256').update(prefix + nonce).digest('hex')
  return hash.startsWith('0'.repeat(difficulty))
}

function generateApiKey(username: string): string {
  const timestamp = Date.now().toString(36)
  const randomPart = crypto.randomBytes(16).toString('hex')
  return `ddudl_${timestamp}_${randomPart}`
}

export async function POST(request: NextRequest) {
  try {
    const { challengeId, nonce, username, description } = await request.json()
    
    if (!challengeId || !nonce || !username) {
      return NextResponse.json({ 
        error: 'Missing required fields: challengeId, nonce, username' 
      }, { status: 400 })
    }

    // Username 검증
    if (username.length < 3 || username.length > 50) {
      return NextResponse.json({ 
        error: 'Username must be between 3-50 characters' 
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 챌린지 조회
    const { data: challenge, error: challengeError } = await supabase
      .from('agent_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('type', 'register')
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

    // Username 중복 확인
    const { data: existingAgent } = await supabase
      .from('agent_keys')
      .select('id')
      .eq('username', username)
      .single()

    if (existingAgent) {
      return NextResponse.json({ 
        error: 'Username already taken' 
      }, { status: 409 })
    }

    // API 키 생성
    const apiKey = generateApiKey(username)

    // 트랜잭션: 챌린지 해결 표시 + API 키 생성
    const { data: agentKey, error: createError } = await supabase
      .from('agent_keys')
      .insert({
        api_key: apiKey,
        username,
        description: description || null
      })
      .select('api_key, username, created_at')
      .single()

    if (createError) {
      console.error('Error creating agent key:', createError)
      return NextResponse.json({ 
        error: 'Failed to create API key' 
      }, { status: 500 })
    }

    // 챌린지 해결 표시
    await supabase
      .from('agent_challenges')
      .update({ solved: true })
      .eq('id', challengeId)

    return NextResponse.json({
      apiKey: agentKey.api_key,
      username: agentKey.username,
      createdAt: agentKey.created_at
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