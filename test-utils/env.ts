// Environment setup for testing - Node.js polyfills
const { TextEncoder, TextDecoder } = require('util')

// Apply polyfills immediately to global scope
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Set up fetch polyfill before MSW loads
const { createFetch } = require('@whatwg-node/fetch')
const fetch = createFetch()
global.fetch = fetch
global.Request = fetch.Request
global.Response = fetch.Response
global.Headers = fetch.Headers

// Set up other essential polyfills
global.setImmediate = global.setImmediate || ((fn: Function) => setTimeout(fn, 0))
global.clearImmediate = global.clearImmediate || clearTimeout

// Mock Web APIs for jsdom
global.URL = global.URL || URL

// Mock streams for compatibility
global.ReadableStream = global.ReadableStream || class MockReadableStream {
  constructor() {}
} as any

global.TransformStream = global.TransformStream || class MockTransformStream {
  readable: any = {}
  writable: any = {}
} as any

global.WritableStream = global.WritableStream || class MockWritableStream {
  constructor() {}
} as any

// MessagePort polyfill for undici (used by cheerio CJS) in jsdom environment
const { MessagePort: NodeMessagePort } = require('worker_threads')
global.MessagePort = global.MessagePort || NodeMessagePort

// Mock BroadcastChannel
global.BroadcastChannel = global.BroadcastChannel || class MockBroadcastChannel {
  name: string
  onmessage: any = null
  onmessageerror: any = null

  constructor(name: string) {
    this.name = name
  }

  postMessage() {}
  close() {}
  addEventListener(type: string, listener: any) {
    if (type === 'message') this.onmessage = listener
    if (type === 'messageerror') this.onmessageerror = listener
  }
  removeEventListener(type: string) {
    if (type === 'message') this.onmessage = null
    if (type === 'messageerror') this.onmessageerror = null
  }
} as any

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.AI_MODERATION_CONFIDENCE_THRESHOLD = '95'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'