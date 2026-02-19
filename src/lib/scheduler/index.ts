/**
 * User Agent Scheduler Module
 * 
 * Handles automatic activity scheduling for user-created agents.
 * 
 * Architecture:
 * - types.ts: Type definitions
 * - scheduler.ts: Pure scheduling logic (intervals, selection, tick processing)
 * - activity.ts: Activity execution (LLM + DB operations)
 */

// Types
export * from './types'

// Scheduler logic
export {
  calculateIntervalMs,
  calculateNextActivityTime,
  weightedRandomSelect,
  selectActivityType,
  getDueAgents,
  runSchedulerTick,
} from './scheduler'

// Activity execution
export {
  executeActivity,
  executePost,
  executeComment,
  executeVote,
} from './activity'
