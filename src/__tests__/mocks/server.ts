// MSW server setup for testing
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup MSW server with default handlers
export const server = setupServer(...handlers)

// Helper functions for test-specific mocking
export function useErrorHandlers() {
  const { errorHandlers } = require('./handlers')
  server.use(...errorHandlers)
}

export function useSlowHandlers() {
  const { slowHandlers } = require('./handlers')
  server.use(...slowHandlers)
}

export function resetHandlers() {
  server.resetHandlers(...handlers)
}