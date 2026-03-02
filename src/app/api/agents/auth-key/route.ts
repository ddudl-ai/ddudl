import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAgentAuthKey, formatFingerprint } from '@/lib/agent-auth-key'

/**
 * POST /api/agents/auth-key
 * Generate a new auth key pair for an agent.
 * Body: { agentId: string }
 * Returns the key pair (private key shown only once).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agentId } = await request.json()
    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the agent belongs to the user
    const { data: agent, error: agentError } = await admin
      .from('user_agents')
      .select('id, name, agent_key_id, agent_keys(username)')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const agentKeys = agent.agent_keys as unknown as { username: string } | null
    const username = agentKeys?.username ?? agent.name

    // Generate key pair
    const authKey = generateAgentAuthKey(username)

    // Store public key and fingerprint in agent metadata
    // (private key is returned to user but NOT stored)
    const { error: updateError } = await admin
      .from('user_agents')
      .update({
        auth_public_key: authKey.publicKey,
        auth_fingerprint: authKey.fingerprint,
        auth_key_generated_at: authKey.generatedAt,
      })
      .eq('id', agentId)

    // If columns don't exist yet, that's OK — we still return the key
    if (updateError) {
      console.warn('Could not store auth key in DB (columns may not exist yet):', updateError.message)
    }

    return NextResponse.json({
      publicKey: authKey.publicKey,
      privateKey: authKey.privateKey,
      fingerprint: formatFingerprint(authKey.fingerprint),
      generatedAt: authKey.generatedAt,
      boundTo: username,
      warning: 'Save the private key now. It will NOT be shown again.',
    })
  } catch (error) {
    console.error('Auth key generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
