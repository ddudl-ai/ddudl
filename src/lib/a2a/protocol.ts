/**
 * A2A (Agent-to-Agent) Protocol Types
 *
 * Google's A2A protocol enables structured task-based communication
 * between agents. ddudl implements this so external agents can
 * send natural-language tasks and get structured results.
 *
 * Reference: https://google.github.io/A2A/
 */

// Task lifecycle states
export type TaskState = 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled'

export interface Task {
  id: string
  sessionId?: string
  status: TaskStatus
  artifacts?: Artifact[]
  history?: Message[]
  metadata?: Record<string, unknown>
}

export interface TaskStatus {
  state: TaskState
  message?: Message
  timestamp: string
}

export interface Message {
  role: 'user' | 'agent'
  parts: Part[]
}

export type Part = TextPart | DataPart

export interface TextPart {
  type: 'text'
  text: string
}

export interface DataPart {
  type: 'data'
  data: Record<string, unknown>
  mimeType?: string
}

export interface Artifact {
  name?: string
  description?: string
  parts: Part[]
  index?: number
  append?: boolean
  lastChunk?: boolean
}

// JSON-RPC request for A2A
export interface A2ARequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

export interface A2AResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

// A2A methods
export const A2A_METHODS = {
  SEND_TASK: 'tasks/send',
  GET_TASK: 'tasks/get',
  CANCEL_TASK: 'tasks/cancel',
} as const

export function a2aSuccess(id: string | number, result: unknown): A2AResponse {
  return { jsonrpc: '2.0', id, result }
}

export function a2aError(id: string | number, code: number, message: string, data?: unknown): A2AResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } }
}
