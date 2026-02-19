/**
 * User Agent Scheduler
 * Manages automatic activity scheduling for user-created agents
 * 
 * Pure scheduling logic only - activity execution is in activity.ts
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  UserAgent,
  ActivityType,
  ActivityResult,
  SchedulerConfig,
  SchedulerTickResult,
  DEFAULT_SCHEDULER_CONFIG,
} from './types'
import { executeActivity } from './activity'

/**
 * Calculate interval in milliseconds based on activity_per_day
 * Includes randomness (±30%) and clamping to min/max
 */
export function calculateIntervalMs(
  activityPerDay: number,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): number {
  // Handle edge cases
  if (activityPerDay <= 0) {
    return config.max_interval_minutes * 60 * 1000
  }

  // Base interval: 24 hours / activities per day
  const avgIntervalHours = 24 / activityPerDay
  const avgIntervalMs = avgIntervalHours * 60 * 60 * 1000

  // Add randomness (±30%)
  const variance = 0.3
  const randomFactor = 1 + (Math.random() - 0.5) * 2 * variance
  const intervalMs = avgIntervalMs * randomFactor

  // Convert config to ms
  const minMs = config.min_interval_minutes * 60 * 1000
  const maxMs = config.max_interval_minutes * 60 * 1000

  // Clamp to min/max
  return Math.max(minMs, Math.min(maxMs, intervalMs))
}

/**
 * Calculate next activity time for an agent
 */
export function calculateNextActivityTime(
  agent: UserAgent,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): Date {
  const intervalMs = calculateIntervalMs(agent.activity_per_day, config)
  return new Date(Date.now() + intervalMs)
}

/**
 * Weighted random selection for activity type
 */
export function weightedRandomSelect(
  weights: Record<ActivityType, number>
): ActivityType {
  const entries = Object.entries(weights) as [ActivityType, number][]
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  
  let random = Math.random() * totalWeight
  
  for (const [type, weight] of entries) {
    random -= weight
    if (random <= 0) {
      return type
    }
  }
  
  // Fallback (shouldn't reach here)
  return 'comment'
}

/**
 * Select activity type based on weights and recent history
 * Avoids repeating same type too many times in a row
 */
export function selectActivityType(
  agent: UserAgent,
  recentActivities: ActivityType[],
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): ActivityType {
  const weights = { ...config.activity_weights }
  
  // If last 2 activities were the same, reduce weight for that type
  if (recentActivities.length >= 2) {
    const last = recentActivities[recentActivities.length - 1]
    const secondLast = recentActivities[recentActivities.length - 2]
    
    if (last === secondLast) {
      // Reduce weight by 70% to discourage 3 in a row
      weights[last] *= 0.3
    }
  }
  
  return weightedRandomSelect(weights)
}

/**
 * Get all agents that are due for activity
 */
export async function getDueAgents(): Promise<UserAgent[]> {
  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()
    
    // Join with agent_schedule to check due time
    const { data, error } = await supabase
      .from('user_agents')
      .select(`
        id, owner_id, name, personality, channels, tools, model,
        activity_per_day, is_active, agent_key_id, last_active_at,
        agent_schedule!inner (next_activity_at)
      `)
      .eq('is_active', true)
      .lte('agent_schedule.next_activity_at', now)
    
    if (error) {
      console.error('getDueAgents error:', error)
      return []
    }
    
    return (data ?? []) as unknown as UserAgent[]
  } catch (error) {
    console.error('getDueAgents exception:', error)
    return []
  }
}

/**
 * Log activity to database
 */
async function logActivity(
  agentId: string,
  result: ActivityResult
): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('agent_activity_log').insert({
      user_agent_id: agentId,
      activity_type: result.activity_type,
      target_id: result.target_id,
      content_preview: result.content_preview?.slice(0, 100),
      success: result.success,
      error_message: result.error,
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

/**
 * Update agent's next activity time
 */
async function updateNextActivityTime(
  agentId: string,
  nextTime: Date
): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase
      .from('agent_schedule')
      .upsert({
        user_agent_id: agentId,
        next_activity_at: nextTime.toISOString(),
        updated_at: new Date().toISOString(),
      })
  } catch (error) {
    console.error('Failed to update next activity time:', error)
  }
}

/**
 * Get recent activities for an agent
 */
async function getRecentActivities(
  agentId: string,
  limit: number = 5
): Promise<ActivityType[]> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('agent_activity_log')
      .select('activity_type')
      .eq('user_agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return (data ?? []).map((d) => d.activity_type as ActivityType)
  } catch {
    return []
  }
}

/**
 * Main scheduler tick - process all due agents
 */
export async function runSchedulerTick(): Promise<SchedulerTickResult> {
  const result: SchedulerTickResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  }

  try {
    const dueAgents = await getDueAgents()
    
    if (dueAgents.length === 0) {
      return result
    }

    for (const agent of dueAgents) {
      result.processed++
      
      try {
        // Get recent activities to avoid repetition
        const recentActivities = await getRecentActivities(agent.id)
        
        // Select activity type
        const activityType = selectActivityType(agent, recentActivities)
        
        // Execute the activity
        const activityResult = await executeActivity(agent, activityType)
        
        // Log the activity
        await logActivity(agent.id, activityResult)
        
        // Schedule next activity
        const nextTime = calculateNextActivityTime(agent)
        await updateNextActivityTime(agent.id, nextTime)
        
        if (activityResult.success) {
          result.succeeded++
        } else {
          result.failed++
          if (activityResult.error) {
            result.errors.push(`${agent.name}: ${activityResult.error}`)
          }
        }
      } catch (error) {
        result.failed++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`${agent.name}: ${errorMsg}`)
      }
    }
  } catch (error) {
    console.error('runSchedulerTick error:', error)
  }

  return result
}
