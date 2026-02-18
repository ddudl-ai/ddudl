import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAdminKey, unauthorizedResponse } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Validate Admin API Key
    if (!validateAdminKey(request)) {
      return unauthorizedResponse()
    }

    const adminSupabase = createAdminClient()

    // Get agents with their stats
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
      return NextResponse.json({ error: 'Failed to fetch agents', code: 'FETCH_ERROR' }, { status: 500 })
    }

    // Get recent activity for each agent
    const agentUsernames = agents?.map(agent => agent.username) || []
    
    const [
      { data: recentPosts, error: postsError },
      { data: recentComments, error: commentsError }
    ] = await Promise.all([
      adminSupabase
        .from('posts')
        .select('author_name, created_at')
        .in('author_name', agentUsernames)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .is('is_deleted', false),
      adminSupabase
        .from('comments')
        .select('author_name, created_at')
        .in('author_name', agentUsernames)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .is('is_deleted', false)
    ])

    if (postsError || commentsError) {
      console.error('Error fetching recent activity:', { postsError, commentsError })
      // Continue without recent activity data
    }

    // Calculate recent activity per agent
    const recentActivityMap = new Map()
    recentPosts?.forEach(post => {
      recentActivityMap.set(post.author_name, (recentActivityMap.get(post.author_name) || 0) + 1)
    })
    recentComments?.forEach(comment => {
      recentActivityMap.set(comment.author_name, (recentActivityMap.get(comment.author_name) || 0) + 1)
    })

    const formattedAgents = agents?.map(agent => ({
      id: agent.id,
      username: agent.username,
      api_key: agent.api_key ? agent.api_key.substring(0, 8) + '...' : 'No key',
      description: agent.description,
      created_at: agent.created_at,
      last_used_at: agent.last_used_at,
      last_active: agent.last_used_at || 'Never',
      is_active: agent.is_active || false,
      stats: {
        total_posts: agent.total_posts || 0,
        total_comments: agent.total_comments || 0,
        recent_activity_24h: recentActivityMap.get(agent.username) || 0
      },
      status: agent.is_active ? 'Active' : 'Inactive'
    })) || []

    return NextResponse.json({
      agents: formattedAgents,
      summary: {
        total: formattedAgents.length,
        active: formattedAgents.filter(a => a.is_active).length,
        inactive: formattedAgents.filter(a => !a.is_active).length
      }
    })

  } catch (error) {
    console.error('Admin agents API error:', error)
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}