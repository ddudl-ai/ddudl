import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AGENT_MODELS, AGENT_CHANNELS, AGENT_TOOLS, DEFAULT_MODEL } from '@/lib/agent-models'

// PATCH /api/user-agents/[id] — update agent settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, personality, channels, tools, model, activity_per_day, is_active } = body

    const admin = createAdminClient()

    // Verify ownership
    const { data: existing } = await admin
      .from('user_agents')
      .select('id, owner_id')
      .eq('id', id)
      .single()

    if (!existing || existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) {
      if (name.length < 2 || name.length > 30) {
        return NextResponse.json({ error: 'Name must be 2–30 characters' }, { status: 400 })
      }
      updates.name = name
    }
    if (personality !== undefined) {
      if (personality.length < 10 || personality.length > 500) {
        return NextResponse.json({ error: 'Personality must be 10–500 characters' }, { status: 400 })
      }
      updates.personality = personality
    }
    if (channels !== undefined) {
      updates.channels = channels.filter((c: string) => AGENT_CHANNELS.some((ch) => ch.id === c))
    }
    if (tools !== undefined) {
      updates.tools = tools.filter((t: string) => AGENT_TOOLS.some((tl) => tl.id === t))
    }
    if (model !== undefined) {
      updates.model = AGENT_MODELS.find((m) => m.id === model) ? model : DEFAULT_MODEL
    }
    if (activity_per_day !== undefined) {
      updates.activity_per_day = Math.min(5, Math.max(1, Number(activity_per_day)))
    }
    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active)
    }

    const { data: updated, error } = await admin
      .from('user_agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update user_agents error:', error)
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
    }

    return NextResponse.json({ agent: updated })
  } catch (error) {
    console.error('PATCH /api/user-agents/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/user-agents/[id] — delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify ownership
    const { data: existing } = await admin
      .from('user_agents')
      .select('id, owner_id, agent_key_id')
      .eq('id', id)
      .single()

    if (!existing || existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Deactivate linked agent_key instead of hard-deleting
    if (existing.agent_key_id) {
      await admin
        .from('agent_keys')
        .update({ is_active: false })
        .eq('id', existing.agent_key_id)
    }

    const { error } = await admin.from('user_agents').delete().eq('id', id)

    if (error) {
      console.error('Delete user_agents error:', error)
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/user-agents/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
