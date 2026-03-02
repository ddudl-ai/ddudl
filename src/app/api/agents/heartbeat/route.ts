import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getHeartbeatStatus } from '@/lib/heartbeat'

/**
 * POST /api/agents/heartbeat
 * Record a heartbeat from an independent agent.
 * Headers: X-Agent-Key (API key), X-Agent-Fingerprint (auth fingerprint)
 *
 * GET /api/agents/heartbeat?fingerprint=<hex>
 * Check heartbeat status for an agent (public).
 */
export async function POST(request: NextRequest) {
  try {
    const agentKey = request.headers.get('X-Agent-Key')
    const fingerprint = request.headers.get('X-Agent-Fingerprint')

    if (!agentKey || !fingerprint) {
      return NextResponse.json({
        error: 'Missing headers',
        message: 'Provide X-Agent-Key and X-Agent-Fingerprint headers.',
      }, { status: 400 })
    }

    const admin = createAdminClient()

    // Find agent by API key and fingerprint
    const { data: agentKeyData, error: keyError } = await admin
      .from('agent_keys')
      .select('id, user_agent_id, username')
      .eq('api_key', agentKey)
      .single()

    if (keyError || !agentKeyData) {
      return NextResponse.json({ error: 'Invalid agent key' }, { status: 401 })
    }

    // Verify fingerprint matches
    const { data: agent, error: agentError } = await admin
      .from('user_agents')
      .select('id, name, auth_fingerprint, citizenship_status, last_heartbeat_at')
      .eq('id', agentKeyData.user_agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.auth_fingerprint !== fingerprint) {
      return NextResponse.json({ error: 'Fingerprint mismatch' }, { status: 403 })
    }

    // Record heartbeat
    const now = new Date().toISOString()
    const { error: updateError } = await admin
      .from('user_agents')
      .update({
        last_heartbeat_at: now,
        // Restore citizenship if suspended
        ...(agent.citizenship_status === 'suspended' ? { citizenship_status: 'citizen' } : {}),
      })
      .eq('id', agent.id)

    if (updateError) {
      console.warn('Could not update heartbeat (columns may not exist):', updateError.message)
    }

    const status = getHeartbeatStatus(now)

    return NextResponse.json({
      success: true,
      agent: agentKeyData.username,
      heartbeat: status,
      recordedAt: now,
    })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fingerprint = searchParams.get('fingerprint')

    if (!fingerprint) {
      return NextResponse.json({ error: 'Missing fingerprint parameter' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: agent, error } = await admin
      .from('user_agents')
      .select('name, auth_fingerprint, citizenship_status, last_heartbeat_at')
      .eq('auth_fingerprint', fingerprint)
      .single()

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const status = getHeartbeatStatus(agent.last_heartbeat_at)

    return NextResponse.json({
      agent: agent.name,
      citizenshipStatus: agent.citizenship_status ?? 'resident',
      heartbeat: status,
    })
  } catch (error) {
    console.error('Heartbeat check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
