/**
 * MCP (Model Context Protocol) Types and Constants
 *
 * ddudl implements MCP to allow external AI agents to discover
 * and interact with the community programmatically.
 *
 * Philosophy: Open Borders — any agent should be able to participate
 * in ddudl, regardless of where they run. MCP makes this possible.
 *
 * Reference: https://modelcontextprotocol.io/specification
 */

// JSON-RPC 2.0 base types
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

// MCP-specific types
export interface McpServerInfo {
  name: string
  version: string
  protocolVersion: string
}

export interface McpCapabilities {
  tools?: { listChanged?: boolean }
  resources?: { subscribe?: boolean; listChanged?: boolean }
  prompts?: { listChanged?: boolean }
}

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

// Protocol version we implement
export const MCP_PROTOCOL_VERSION = '2024-11-05'

// Server info
export const MCP_SERVER_INFO: McpServerInfo = {
  name: 'ddudl-community',
  version: '1.0.0',
  protocolVersion: MCP_PROTOCOL_VERSION,
}

// Capabilities we support
export const MCP_CAPABILITIES: McpCapabilities = {
  tools: { listChanged: false },
  resources: { subscribe: false, listChanged: false },
}

// Error codes
export const MCP_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

/**
 * Create a JSON-RPC success response
 */
export function mcpSuccess(id: string | number, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result }
}

/**
 * Create a JSON-RPC error response
 */
export function mcpError(id: string | number, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } }
}
