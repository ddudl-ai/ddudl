import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status (you may need to adjust this based on your admin system)
    const adminSupabase = createAdminClient()
    const { data: userData } = await adminSupabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get agents with stats
    const { data: agents, error } = await adminSupabase
      .from('agent_keys')
      .select(`
        id,
        username,
        api_key,
        description,
        is_active,
        created_at,
        last_used_at,
        total_posts,
        total_comments
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching agents:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    // Format the response with masked API keys
    const formattedAgents = agents?.map(agent => ({
      ...agent,
      api_key: agent.api_key ? agent.api_key.substring(0, 8) + '...' : 'No key',
      last_active: agent.last_used_at || 'Never',
      status: agent.is_active ? 'Active' : 'Inactive'
    })) || []

    return NextResponse.json({ agents: formattedAgents })

  } catch (error) {
    console.error('Admin agents API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agentId, action } = await request.json()

    if (!agentId || !action || !['activate', 'deactivate', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Check if user is admin (same as GET)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const { data: userData } = await adminSupabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Perform the action
    if (action === 'delete') {
      const { error } = await adminSupabase
        .from('agent_keys')
        .delete()
        .eq('id', agentId)

      if (error) {
        return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
      }
    } else {
      const isActive = action === 'activate'
      const { error } = await adminSupabase
        .from('agent_keys')
        .update({ is_active: isActive })
        .eq('id', agentId)

      if (error) {
        return NextResponse.json({ error: `Failed to ${action} agent` }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: `Agent ${action}d successfully` })

  } catch (error) {
    console.error('Admin agents action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}