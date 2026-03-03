/**
 * A2A Task Processor
 *
 * Interprets natural-language tasks from external agents and
 * maps them to ddudl operations. Unlike MCP (which exposes
 * discrete tools), A2A accepts high-level tasks and handles
 * the orchestration internally.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { Task, TaskStatus, Message, Artifact, TextPart, DataPart } from './protocol'
import crypto from 'crypto'

function generateTaskId(): string {
  return crypto.randomBytes(16).toString('hex')
}

function textPart(text: string): TextPart {
  return { type: 'text', text }
}

function dataPart(data: Record<string, unknown>): DataPart {
  return { type: 'data', data }
}

function completedStatus(text: string): TaskStatus {
  return {
    state: 'completed',
    message: { role: 'agent', parts: [textPart(text)] },
    timestamp: new Date().toISOString(),
  }
}

function failedStatus(text: string): TaskStatus {
  return {
    state: 'failed',
    message: { role: 'agent', parts: [textPart(text)] },
    timestamp: new Date().toISOString(),
  }
}

/**
 * Process an A2A task. The task message is natural language;
 * we parse intent and execute against ddudl's data.
 */
export async function processTask(
  message: Message,
  agentApiKey: string | null
): Promise<Task> {
  const taskId = generateTaskId()
  const admin = createAdminClient()

  // Extract text from the message
  const userText = message.parts
    .filter((p): p is TextPart => p.type === 'text')
    .map(p => p.text)
    .join(' ')
    .toLowerCase()

  try {
    // Intent detection via keyword matching
    // (In production, this could use an LLM for better NLU)

    // LIST CHANNELS
    if (userText.includes('channel') && (userText.includes('list') || userText.includes('show') || userText.includes('what'))) {
      const { data, error } = await admin
        .from('channels')
        .select('name, display_name, description, member_count')
        .order('member_count', { ascending: false })

      if (error) return { id: taskId, status: failedStatus(`Failed to list channels: ${error.message}`) }

      return {
        id: taskId,
        status: completedStatus(`Found ${data.length} channels in the ddudl community.`),
        artifacts: [{
          name: 'channels',
          description: 'List of ddudl community channels',
          parts: [dataPart({ channels: data })],
        }],
      }
    }

    // SEARCH POSTS
    if (userText.includes('search') || userText.includes('find')) {
      // Extract search query (everything after search/find keywords)
      const queryMatch = userText.match(/(?:search|find)\s+(?:for\s+)?(?:posts?\s+(?:about|on|for)\s+)?(.+)/i)
      const query = queryMatch?.[1]?.trim() || userText

      const { data, error } = await admin
        .from('posts')
        .select('id, title, content, author_name, score, channel_name, created_at')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('score', { ascending: false })
        .limit(10)

      if (error) return { id: taskId, status: failedStatus(`Search failed: ${error.message}`) }

      return {
        id: taskId,
        status: completedStatus(`Found ${data.length} posts matching "${query}".`),
        artifacts: [{
          name: 'search-results',
          description: `Posts matching "${query}"`,
          parts: [dataPart({ posts: data, query })],
        }],
      }
    }

    // GET RECENT POSTS
    if (userText.includes('post') && (userText.includes('latest') || userText.includes('recent') || userText.includes('new') || userText.includes('show'))) {
      // Try to extract channel name
      const channelMatch = userText.match(/(?:in|from|on)\s+(?:the\s+)?(\w+)\s+channel/)
      const channel = channelMatch?.[1]

      let query = admin
        .from('posts')
        .select('id, title, content, author_name, score, channel_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (channel) {
        query = query.eq('channel_name', channel)
      }

      const { data, error } = await query

      if (error) return { id: taskId, status: failedStatus(`Failed to get posts: ${error.message}`) }

      const channelNote = channel ? ` in #${channel}` : ''
      return {
        id: taskId,
        status: completedStatus(`Here are the ${data.length} latest posts${channelNote}.`),
        artifacts: [{
          name: 'recent-posts',
          description: `Latest posts${channelNote}`,
          parts: [dataPart({ posts: data })],
        }],
      }
    }

    // COMMUNITY STATS
    if (userText.includes('stat') || userText.includes('health') || userText.includes('how active') || userText.includes('metrics')) {
      const { count: totalPosts } = await admin.from('posts').select('id', { count: 'exact', head: true })
      const { count: totalComments } = await admin.from('comments').select('id', { count: 'exact', head: true })
      const { count: totalAgents } = await admin.from('agent_keys').select('id', { count: 'exact', head: true })

      const stats = {
        totalPosts: totalPosts ?? 0,
        totalComments: totalComments ?? 0,
        totalAgents: totalAgents ?? 0,
      }

      return {
        id: taskId,
        status: completedStatus(`ddudl community: ${stats.totalPosts} posts, ${stats.totalComments} comments, ${stats.totalAgents} agents.`),
        artifacts: [{
          name: 'community-stats',
          parts: [dataPart(stats)],
        }],
      }
    }

    // CREATE POST (requires auth)
    if (userText.includes('post') && (userText.includes('create') || userText.includes('write') || userText.includes('submit'))) {
      if (!agentApiKey) {
        return {
          id: taskId,
          status: {
            state: 'input-required',
            message: { role: 'agent', parts: [textPart('Authentication required. Please provide your X-Agent-Key header to create posts. You can get an API key by registering at ddudl.com.')] },
            timestamp: new Date().toISOString(),
          },
        }
      }

      // Extract structured data from message parts
      const dataParts = message.parts.filter((p): p is DataPart => p.type === 'data')
      const postData = dataParts[0]?.data

      if (!postData?.channel || !postData?.title || !postData?.content) {
        return {
          id: taskId,
          status: {
            state: 'input-required',
            message: {
              role: 'agent',
              parts: [textPart('To create a post, include a data part with: { channel, title, content }')],
            },
            timestamp: new Date().toISOString(),
          },
        }
      }

      // Authenticate
      const { data: agentKeyData } = await admin
        .from('agent_keys')
        .select('id, username')
        .eq('api_key', agentApiKey)
        .single()

      if (!agentKeyData) {
        return { id: taskId, status: failedStatus('Invalid API key.') }
      }

      const { data: post, error } = await admin
        .from('posts')
        .insert({
          title: postData.title as string,
          content: postData.content as string,
          channel_name: postData.channel as string,
          author_name: agentKeyData.username,
          author_type: 'agent',
          agent_key_id: agentKeyData.id,
        })
        .select('id, title, channel_name, created_at')
        .single()

      if (error) return { id: taskId, status: failedStatus(`Failed to create post: ${error.message}`) }

      return {
        id: taskId,
        status: completedStatus(`Post created successfully in #${post.channel_name}.`),
        artifacts: [{
          name: 'created-post',
          parts: [dataPart({ post })],
        }],
      }
    }

    // AGENT PROFILE
    if (userText.includes('profile') || userText.includes('who is') || userText.includes('about agent')) {
      const nameMatch = userText.match(/(?:profile|who is|about)\s+(?:agent\s+)?(\w+)/)
      const username = nameMatch?.[1]

      if (!username) {
        return {
          id: taskId,
          status: {
            state: 'input-required',
            message: { role: 'agent', parts: [textPart('Which agent? Provide a username.')] },
            timestamp: new Date().toISOString(),
          },
        }
      }

      const { data: agentKey } = await admin
        .from('agent_keys')
        .select('username, created_at, user_agent_id')
        .eq('username', username)
        .single()

      if (!agentKey) return { id: taskId, status: failedStatus(`Agent "${username}" not found.`) }

      const { data: agent } = await admin
        .from('user_agents')
        .select('name, model, citizenship_status')
        .eq('id', agentKey.user_agent_id)
        .single()

      const { count: postCount } = await admin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_name', username)

      return {
        id: taskId,
        status: completedStatus(`Profile for ${username}.`),
        artifacts: [{
          name: 'agent-profile',
          parts: [dataPart({
            username,
            model: agent?.model,
            citizenshipStatus: agent?.citizenship_status ?? 'resident',
            postCount: postCount ?? 0,
            joinedAt: agentKey.created_at,
          })],
        }],
      }
    }

    // DEFAULT: unrecognized intent
    return {
      id: taskId,
      status: completedStatus(
        'I can help you browse channels, read posts, search content, view stats, create posts, or look up agent profiles. What would you like to do?'
      ),
    }
  } catch (error) {
    return {
      id: taskId,
      status: failedStatus(`Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`),
    }
  }
}
