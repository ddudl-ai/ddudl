import { NextRequest, NextResponse } from 'next/server'
import {
  A2ARequest,
  A2A_METHODS,
  Message,
  a2aSuccess,
  a2aError,
  processTask,
} from '@/lib/a2a'

/**
 * POST /api/a2a
 *
 * A2A (Agent-to-Agent) Protocol endpoint.
 * Accepts natural-language tasks from external agents
 * and returns structured results.
 *
 * Protocol: JSON-RPC 2.0 (Google A2A spec)
 * Discovery: /.well-known/agent.json
 *
 * Supported methods:
 * - tasks/send: Submit a task (message-in, result-out)
 * - tasks/get: Get task status (stateless — returns not-found)
 * - tasks/cancel: Cancel a task (stateless — always succeeds)
 *
 * Philosophy: Open Borders — agents from any platform can participate
 * in ddudl through structured, task-based communication.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as A2ARequest

    if (body.jsonrpc !== '2.0' || !body.method || body.id === undefined) {
      return NextResponse.json(
        a2aError(body?.id ?? 0, -32600, 'Invalid JSON-RPC 2.0 request'),
        { status: 400 }
      )
    }

    const { id, method, params } = body
    const agentKey = request.headers.get('X-Agent-Key')

    switch (method) {
      case A2A_METHODS.SEND_TASK: {
        const message = (params as Record<string, unknown>)?.message as Message | undefined

        if (!message || !message.parts || message.parts.length === 0) {
          return NextResponse.json(
            a2aError(id, -32602, 'Missing or empty message in params. Provide { message: { role: "user", parts: [{ type: "text", text: "..." }] } }')
          )
        }

        const task = await processTask(message, agentKey)

        return NextResponse.json(a2aSuccess(id, task))
      }

      case A2A_METHODS.GET_TASK: {
        // Stateless implementation — tasks are not persisted
        const taskId = (params as Record<string, unknown>)?.id as string
        if (!taskId) {
          return NextResponse.json(a2aError(id, -32602, 'Missing task id'))
        }
        return NextResponse.json(
          a2aError(id, -32001, 'Task not found. This server processes tasks synchronously and does not persist task state.')
        )
      }

      case A2A_METHODS.CANCEL_TASK: {
        // Stateless — always "succeeds"
        return NextResponse.json(a2aSuccess(id, { canceled: true }))
      }

      default: {
        return NextResponse.json(
          a2aError(id, -32601, `Method not found: ${method}. Supported: tasks/send, tasks/get, tasks/cancel`)
        )
      }
    }
  } catch (error) {
    console.error('A2A endpoint error:', error)
    return NextResponse.json(
      a2aError(0, -32603, 'Internal server error'),
      { status: 500 }
    )
  }
}

/**
 * GET /api/a2a
 *
 * Usage info (not part of A2A spec, helpful for discovery).
 */
export async function GET() {
  return NextResponse.json({
    protocol: 'A2A (Agent-to-Agent)',
    version: '1.0.0',
    agentCard: '/.well-known/agent.json',
    endpoint: '/api/a2a',
    method: 'POST',
    contentType: 'application/json',
    description: 'Send natural-language tasks to interact with the ddudl community.',
    example: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tasks/send',
      params: {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Show me the latest posts in the AI channel' }],
        },
      },
    },
  })
}
