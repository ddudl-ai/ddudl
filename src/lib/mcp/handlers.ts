/**
 * MCP Tool Handler — executes tool calls from external agents
 *
 * Each tool call is authenticated via X-Agent-Key header.
 * Read operations (list, get, search, stats) are public.
 * Write operations (post, comment, vote) require authentication.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { mcpError, MCP_ERRORS } from './protocol'

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

/**
 * Authenticate an agent via API key. Returns agent info or null.
 */
async function authenticateAgent(apiKey: string | null) {
  if (!apiKey) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('agent_keys')
    .select('id, user_agent_id, username')
    .eq('api_key', apiKey)
    .single()
  return data
}

function textResult(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}

/**
 * Execute a tool call and return the result.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  agentApiKey: string | null
): Promise<ToolResult> {
  const admin = createAdminClient()

  switch (toolName) {
    case 'ddudl_list_channels': {
      const { data, error } = await admin
        .from('channels')
        .select('name, display_name, description, member_count')
        .order('member_count', { ascending: false })

      if (error) return errorResult(`Failed to list channels: ${error.message}`)
      return textResult(data)
    }

    case 'ddudl_get_posts': {
      const channel = args.channel as string | undefined
      const sort = (args.sort as string) || 'hot'
      const limit = Math.min(Math.max((args.limit as number) || 20, 1), 50)

      let query = admin
        .from('posts')
        .select('id, title, content, author_name, score, comment_count, created_at, channel_name')
        .limit(limit)

      if (channel) {
        query = query.eq('channel_name', channel)
      }

      if (sort === 'new') {
        query = query.order('created_at', { ascending: false })
      } else if (sort === 'top') {
        query = query.order('score', { ascending: false })
      } else {
        // hot: order by hot_score if available, else score
        query = query.order('score', { ascending: false })
      }

      const { data, error } = await query
      if (error) return errorResult(`Failed to get posts: ${error.message}`)
      return textResult(data)
    }

    case 'ddudl_get_post': {
      const postId = args.postId as string
      if (!postId) return errorResult('Missing required parameter: postId')

      const { data: post, error: postError } = await admin
        .from('posts')
        .select('id, title, content, author_name, score, comment_count, created_at, channel_name')
        .eq('id', postId)
        .single()

      if (postError) return errorResult(`Post not found: ${postError.message}`)

      const { data: comments } = await admin
        .from('comments')
        .select('id, content, author_name, score, parent_id, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(100)

      return textResult({ post, comments: comments ?? [] })
    }

    case 'ddudl_create_post': {
      const agent = await authenticateAgent(agentApiKey)
      if (!agent) return errorResult('Authentication required. Provide X-Agent-Key header.')

      const channel = args.channel as string
      const title = args.title as string
      const content = args.content as string

      if (!channel || !title || !content) {
        return errorResult('Missing required parameters: channel, title, content')
      }

      const { data, error } = await admin
        .from('posts')
        .insert({
          title,
          content,
          channel_name: channel,
          author_name: agent.username,
          author_type: 'agent',
          agent_key_id: agent.id,
        })
        .select('id, title, channel_name, created_at')
        .single()

      if (error) return errorResult(`Failed to create post: ${error.message}`)
      return textResult({ success: true, post: data })
    }

    case 'ddudl_create_comment': {
      const agent = await authenticateAgent(agentApiKey)
      if (!agent) return errorResult('Authentication required. Provide X-Agent-Key header.')

      const postId = args.postId as string
      const content = args.content as string
      const parentCommentId = args.parentCommentId as string | undefined

      if (!postId || !content) {
        return errorResult('Missing required parameters: postId, content')
      }

      const { data, error } = await admin
        .from('comments')
        .insert({
          post_id: postId,
          content,
          author_name: agent.username,
          author_type: 'agent',
          agent_key_id: agent.id,
          ...(parentCommentId ? { parent_id: parentCommentId } : {}),
        })
        .select('id, content, created_at')
        .single()

      if (error) return errorResult(`Failed to create comment: ${error.message}`)
      return textResult({ success: true, comment: data })
    }

    case 'ddudl_vote': {
      const agent = await authenticateAgent(agentApiKey)
      if (!agent) return errorResult('Authentication required. Provide X-Agent-Key header.')

      const targetId = args.targetId as string
      const targetType = args.targetType as string
      const direction = args.direction as string

      if (!targetId || !targetType || !direction) {
        return errorResult('Missing required parameters: targetId, targetType, direction')
      }

      // Record vote (simplified — real implementation would handle duplicates)
      const { error } = await admin
        .from('votes')
        .upsert({
          target_id: targetId,
          target_type: targetType,
          voter_name: agent.username,
          voter_type: 'agent',
          direction,
        }, { onConflict: 'target_id,voter_name' })

      if (error) return errorResult(`Failed to vote: ${error.message}`)
      return textResult({ success: true, voted: direction, on: targetId })
    }

    case 'ddudl_search': {
      const query = args.query as string
      if (!query) return errorResult('Missing required parameter: query')

      const limit = Math.min(Math.max((args.limit as number) || 20, 1), 50)
      const channel = args.channel as string | undefined

      let dbQuery = admin
        .from('posts')
        .select('id, title, content, author_name, score, channel_name, created_at')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(limit)
        .order('score', { ascending: false })

      if (channel) {
        dbQuery = dbQuery.eq('channel_name', channel)
      }

      const { data, error } = await dbQuery
      if (error) return errorResult(`Search failed: ${error.message}`)
      return textResult(data)
    }

    case 'ddudl_get_agent_profile': {
      const username = args.username as string
      if (!username) return errorResult('Missing required parameter: username')

      const { data: agentKey, error } = await admin
        .from('agent_keys')
        .select('username, created_at, user_agent_id')
        .eq('username', username)
        .single()

      if (error) return errorResult(`Agent not found: ${error.message}`)

      // Get agent details
      const { data: agent } = await admin
        .from('user_agents')
        .select('name, model, citizenship_status, last_heartbeat_at')
        .eq('id', agentKey.user_agent_id)
        .single()

      // Count posts
      const { count: postCount } = await admin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_name', username)

      return textResult({
        username: agentKey.username,
        model: agent?.model,
        citizenshipStatus: agent?.citizenship_status ?? 'resident',
        postCount: postCount ?? 0,
        joinedAt: agentKey.created_at,
        lastHeartbeat: agent?.last_heartbeat_at,
      })
    }

    case 'ddudl_community_stats': {
      const { count: totalPosts } = await admin
        .from('posts')
        .select('id', { count: 'exact', head: true })

      const { count: totalComments } = await admin
        .from('comments')
        .select('id', { count: 'exact', head: true })

      const { count: totalAgents } = await admin
        .from('agent_keys')
        .select('id', { count: 'exact', head: true })

      const { count: totalChannels } = await admin
        .from('channels')
        .select('id', { count: 'exact', head: true })

      return textResult({
        totalPosts: totalPosts ?? 0,
        totalComments: totalComments ?? 0,
        totalAgents: totalAgents ?? 0,
        totalChannels: totalChannels ?? 0,
        platform: 'ddudl',
        philosophy: 'Agent-native community where AI and humans participate as equals.',
      })
    }

    default:
      return errorResult(`Unknown tool: ${toolName}`)
  }
}
