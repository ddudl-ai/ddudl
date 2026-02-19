/**
 * User Agent Scheduler Tests
 * TDD: Tests written before implementation
 */

import {
  UserAgent,
  ActivityType,
  SchedulerConfig,
  DEFAULT_SCHEDULER_CONFIG,
} from '../types'

// These functions will be implemented after tests
import {
  calculateNextActivityTime,
  selectActivityType,
  getDueAgents,
  runSchedulerTick,
  // helpers
  calculateIntervalMs,
  weightedRandomSelect,
} from '../scheduler'

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockSupabaseClient),
}))

// Test fixtures
const createMockAgent = (overrides: Partial<UserAgent> = {}): UserAgent => ({
  id: 'agent-123',
  owner_id: 'user-456',
  name: 'TestBot',
  personality: 'A helpful test agent',
  channels: ['tech', 'general'],
  tools: ['none'],
  model: 'gpt-4.1-nano',
  activity_per_day: 10,
  is_active: true,
  agent_key_id: 'key-789',
  last_active_at: null,
  ...overrides,
})

describe('User Agent Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-19T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('calculateIntervalMs', () => {
    it('should calculate base interval from activity_per_day', () => {
      // 10 activities per day = 24h / 10 = 2.4h = 144 minutes
      const intervalMs = calculateIntervalMs(10, DEFAULT_SCHEDULER_CONFIG)
      const intervalMinutes = intervalMs / 1000 / 60
      
      // With randomness ±30%, should be between 100.8 and 187.2 minutes
      // But clamped to 30-180
      expect(intervalMinutes).toBeGreaterThanOrEqual(30)
      expect(intervalMinutes).toBeLessThanOrEqual(180)
    })

    it('should clamp to minimum interval for high frequency agents', () => {
      // 100 activities per day would be ~14 min without clamping
      const intervalMs = calculateIntervalMs(100, DEFAULT_SCHEDULER_CONFIG)
      const intervalMinutes = intervalMs / 1000 / 60
      
      expect(intervalMinutes).toBeGreaterThanOrEqual(30)
    })

    it('should clamp to maximum interval for low frequency agents', () => {
      // 1 activity per day would be 24h without clamping
      const intervalMs = calculateIntervalMs(1, DEFAULT_SCHEDULER_CONFIG)
      const intervalMinutes = intervalMs / 1000 / 60
      
      expect(intervalMinutes).toBeLessThanOrEqual(180)
    })
  })

  describe('calculateNextActivityTime', () => {
    it('should return a future Date', () => {
      const agent = createMockAgent({ activity_per_day: 10 })
      const nextTime = calculateNextActivityTime(agent)
      
      expect(nextTime).toBeInstanceOf(Date)
      expect(nextTime.getTime()).toBeGreaterThan(Date.now())
    })

    it('should return time within expected range for activity_per_day=10', () => {
      const agent = createMockAgent({ activity_per_day: 10 })
      
      // Run multiple times to account for randomness
      const intervals: number[] = []
      for (let i = 0; i < 100; i++) {
        const nextTime = calculateNextActivityTime(agent)
        const diffMinutes = (nextTime.getTime() - Date.now()) / 1000 / 60
        intervals.push(diffMinutes)
      }
      
      // All should be within bounds
      expect(intervals.every(i => i >= 30)).toBe(true)
      expect(intervals.every(i => i <= 180)).toBe(true)
      
      // Should have some variance (not all the same)
      const uniqueValues = new Set(intervals.map(i => Math.round(i)))
      expect(uniqueValues.size).toBeGreaterThan(1)
    })

    it('should respect minimum interval for very active agents', () => {
      const agent = createMockAgent({ activity_per_day: 48 })
      const nextTime = calculateNextActivityTime(agent)
      const diffMinutes = (nextTime.getTime() - Date.now()) / 1000 / 60
      
      expect(diffMinutes).toBeGreaterThanOrEqual(30)
    })

    it('should respect maximum interval for low activity agents', () => {
      const agent = createMockAgent({ activity_per_day: 1 })
      const nextTime = calculateNextActivityTime(agent)
      const diffMinutes = (nextTime.getTime() - Date.now()) / 1000 / 60
      
      expect(diffMinutes).toBeLessThanOrEqual(180)
    })

    it('should handle edge case of activity_per_day = 0', () => {
      const agent = createMockAgent({ activity_per_day: 0 })
      const nextTime = calculateNextActivityTime(agent)
      
      // Should return max interval or throw
      const diffMinutes = (nextTime.getTime() - Date.now()) / 1000 / 60
      expect(diffMinutes).toBeLessThanOrEqual(180)
    })
  })

  describe('weightedRandomSelect', () => {
    it('should return valid activity type', () => {
      const weights = { post: 0.3, comment: 0.5, vote: 0.2 }
      const result = weightedRandomSelect(weights)
      
      expect(['post', 'comment', 'vote']).toContain(result)
    })

    it('should respect weights over many iterations', () => {
      const weights = { post: 0.1, comment: 0.8, vote: 0.1 }
      const counts = { post: 0, comment: 0, vote: 0 }
      
      for (let i = 0; i < 1000; i++) {
        const result = weightedRandomSelect(weights)
        counts[result]++
      }
      
      // Comment should be most frequent (around 80%)
      expect(counts.comment).toBeGreaterThan(counts.post)
      expect(counts.comment).toBeGreaterThan(counts.vote)
      expect(counts.comment).toBeGreaterThan(600) // At least 60%
    })
  })

  describe('selectActivityType', () => {
    it('should return valid activity type', () => {
      const agent = createMockAgent()
      const result = selectActivityType(agent, [])
      
      expect(['post', 'comment', 'vote']).toContain(result)
    })

    it('should avoid repeating same type 3 times in a row', () => {
      const agent = createMockAgent()
      const recentActivities: ActivityType[] = ['post', 'post']
      
      // Run many times
      const selections: ActivityType[] = []
      for (let i = 0; i < 100; i++) {
        selections.push(selectActivityType(agent, recentActivities))
      }
      
      // Should bias away from 'post'
      const postCount = selections.filter(s => s === 'post').length
      expect(postCount).toBeLessThan(50) // Less than 50% should be post
    })

    it('should handle empty recent activities', () => {
      const agent = createMockAgent()
      const result = selectActivityType(agent, [])
      
      expect(['post', 'comment', 'vote']).toContain(result)
    })

    it('should work with agent that only has vote permissions', () => {
      // Future feature: agents with limited permissions
      const agent = createMockAgent({ channels: [] }) // No channels = can't post
      const result = selectActivityType(agent, [])
      
      // Should still return something valid
      expect(['post', 'comment', 'vote']).toContain(result)
    })
  })

  describe('getDueAgents', () => {
    beforeEach(() => {
      // Reset mock chain to return promise at the end
      mockSupabaseClient.lte.mockReturnValue({
        then: (resolve: (value: { data: UserAgent[] | null, error: null | { message: string } }) => void) => {
          resolve({ data: [], error: null })
          return { catch: jest.fn() }
        }
      })
    })

    it('should return agents with next_activity_at in the past', async () => {
      const mockAgents = [
        createMockAgent({ id: 'agent-1' }),
        createMockAgent({ id: 'agent-2' }),
      ]
      
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: mockAgents,
        error: null,
      })
      
      const result = await getDueAgents()
      
      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_agents')
    })

    it('should filter out inactive agents', async () => {
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: [createMockAgent({ is_active: true })],
        error: null,
      })
      
      await getDueAgents()
      
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('should return empty array on database error', async () => {
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB Error' },
      })
      
      const result = await getDueAgents()
      
      expect(result).toEqual([])
    })

    it('should only return agents with past due schedule', async () => {
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: [],
        error: null,
      })
      
      await getDueAgents()
      
      // Should filter by next_activity_at <= now
      expect(mockSupabaseClient.lte).toHaveBeenCalled()
    })
  })

  describe('runSchedulerTick', () => {
    beforeEach(() => {
      // Default: no due agents
      mockSupabaseClient.lte.mockResolvedValue({ data: [], error: null })
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null })
      mockSupabaseClient.insert.mockResolvedValue({ data: {}, error: null })
      mockSupabaseClient.upsert.mockResolvedValue({ data: {}, error: null })
    })

    it('should return summary with counts', async () => {
      const result = await runSchedulerTick()
      
      expect(result).toHaveProperty('processed')
      expect(result).toHaveProperty('succeeded')
      expect(result).toHaveProperty('failed')
      expect(result).toHaveProperty('errors')
    })

    it('should process due agents', async () => {
      const mockAgents = [
        createMockAgent({ id: 'agent-1' }),
      ]
      
      // getDueAgents returns 1 agent
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: mockAgents,
        error: null,
      })
      
      // getRecentActivities returns empty
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      })
      
      const result = await runSchedulerTick()
      
      expect(result.processed).toBe(1)
      expect(result.succeeded).toBe(1)
    })

    it('should handle individual agent failures gracefully', async () => {
      const mockAgents = [
        createMockAgent({ id: 'agent-1', name: 'FailBot' }),
        createMockAgent({ id: 'agent-2', name: 'SuccessBot' }),
      ]
      
      // getDueAgents returns 2 agents
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: mockAgents,
        error: null,
      })
      
      // getRecentActivities for both agents
      mockSupabaseClient.limit
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
      
      // logActivity: first fails, second succeeds
      mockSupabaseClient.insert
        .mockRejectedValueOnce(new Error('DB Error'))
        .mockResolvedValueOnce({ data: {}, error: null })
      
      const result = await runSchedulerTick()
      
      expect(result.processed).toBe(2)
      // Both activities execute successfully (executeActivity doesn't throw)
      // Only the logging fails, which doesn't count as activity failure
      expect(result.succeeded).toBe(2)
    })

    it('should return immediately if no due agents', async () => {
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: [],
        error: null,
      })
      
      const result = await runSchedulerTick()
      
      expect(result.processed).toBe(0)
      expect(result.succeeded).toBe(0)
      expect(result.failed).toBe(0)
    })
  })
})
