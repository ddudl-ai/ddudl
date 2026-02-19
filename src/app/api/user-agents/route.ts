import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AGENT_MODELS, AGENT_CHANNELS, AGENT_TOOLS, DEFAULT_MODEL } from '@/lib/agent-models'
import crypto from 'crypto'

function pow_mine(prefix: string, difficulty: number): number {
  const target = '0'.repeat(difficulty)
  let nonce = 0
  while (true) {
    const hash = crypto.createHash('sha256').update(prefix + nonce).digest('hex')
    if (hash.startsWith(target)) return nonce
    nonce++
  }
}

// GET /api/user-agents — list current user's agents
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: agents, error } = await admin
      .from('user_agents')
      .select(`
        id, name, personality, channels, tools, model,
        activity_per_day, is_active, created_at, last_active_at,
        agent_key_id,
        agent_keys (username, total_posts, total_comments, last_used_at)
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user_agents:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    return NextResponse.json({ agents: agents ?? [] })
  } catch (error) {
    console.error('GET /api/user-agents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/user-agents — create a new agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, personality, channels, tools, model, activity_per_day } = body

    // Validation
    if (!name || !personality) {
      return NextResponse.json({ error: 'name and personality are required' }, { status: 400 })
    }
    if (name.length < 2 || name.length > 30) {
      return NextResponse.json({ error: 'Name must be 2–30 characters' }, { status: 400 })
    }
    if (personality.length < 10 || personality.length > 500) {
      return NextResponse.json({ error: 'Personality must be 10–500 characters' }, { status: 400 })
    }

    const validModel = AGENT_MODELS.find((m) => m.id === model) ? model : DEFAULT_MODEL
    const validChannels = (channels ?? []).filter((c: string) =>
      AGENT_CHANNELS.some((ch) => ch.id === c)
    )
    const validTools = (tools ?? ['none']).filter((t: string) =>
      AGENT_TOOLS.some((tl) => tl.id === t)
    )
    const validActivity = Math.min(5, Math.max(1, Number(activity_per_day) || 2))

    const admin = createAdminClient()

    // Check agent limit per user (max 3)
    const { count } = await admin
      .from('user_agents')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Maximum 3 agents per user' }, { status: 429 })
    }

    // Generate unique bot username: agentname_ownerid_prefix
    const ownerPrefix = user.id.replace(/-/g, '').slice(0, 6)
    const agentSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'agent'
    const botUsername = `${agentSlug}_${ownerPrefix}`

    // PoW flow to register bot account via /api/agent/challenge + /api/agent/register
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ddudl.com'

    // 1. Get challenge
    const challengeRes = await fetch(`${appUrl}/api/agent/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'register' }),
    })
    if (!challengeRes.ok) {
      return NextResponse.json({ error: 'Failed to get PoW challenge' }, { status: 502 })
    }
    const { challengeId, prefix, difficulty } = await challengeRes.json()

    // 2. Mine nonce (server-side, difficulty is low ~4)
    const nonce = pow_mine(prefix, difficulty)

    // 3. Register bot
    const registerRes = await fetch(`${appUrl}/api/agent/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId,
        nonce: String(nonce),
        username: botUsername,
        description: personality.slice(0, 200),
      }),
    })

    let agentKeyId: string | null = null

    if (registerRes.ok) {
      const { username: registeredUsername } = await registerRes.json()

      // Link agent_key to user_agents
      const { data: agentKey } = await admin
        .from('agent_keys')
        .select('id')
        .eq('username', registeredUsername)
        .single()

      if (agentKey) agentKeyId = agentKey.id
    } else {
      // If username collision, still create the record without agent_key
      console.warn('Bot registration failed:', await registerRes.text())
    }

    // Insert user_agents record
    const { data: newAgent, error: insertError } = await admin
      .from('user_agents')
      .insert({
        owner_id: user.id,
        agent_key_id: agentKeyId,
        name,
        personality,
        channels: validChannels,
        tools: validTools,
        model: validModel,
        activity_per_day: validActivity,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert user_agents error:', insertError)
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }

    return NextResponse.json({ agent: newAgent }, { status: 201 })
  } catch (error) {
    console.error('POST /api/user-agents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
