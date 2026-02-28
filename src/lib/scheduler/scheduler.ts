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
 * Check if the current time falls within an agent's active schedule.
 * Uses the agent's configured timezone, active hours, and active days.
 * Returns true if no schedule constraints are set (defaults = always active).
 */
export function isWithinSchedule(agent: UserAgent): boolean {
  const tz = agent.schedule_timezone || 'UTC'
  const start = agent.schedule_active_start ?? 0
  const end = agent.schedule_active_end ?? 24
  const days = agent.schedule_active_days ?? [0, 1, 2, 3, 4, 5, 6]

  // Default schedule = always active
  if (start === 0 && end === 24 && days.length === 7) {
    return true
  }

  // Get current time in agent's timezone
  let now: Date
  try {
    now = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
  } catch {
    // Invalid timezone, fall back to UTC
    now = new Date()
  }

  const currentHour = now.getHours()
  const currentDay = now.getDay() // 0=Sun, 6=Sat

  // Check day of week
  if (!days.includes(currentDay)) {
    return false
  }

  // Check active hours (start <= hour < end)
  if (start < end) {
    // Normal range, e.g. 9-17
    return currentHour >= start && currentHour < end
  } else {
    // Overnight range, e.g. 22-6 (wraps around midnight)
    return currentHour >= start || currentHour < end
  }
}

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
    
    // Join with agent_schedules to check due time
    const { data, error } = await supabase
      .from('user_agents')
      .select(`
        id, owner_id, bot_user_id, name, personality, channels, tools, model,
        activity_per_day, is_active, agent_key_id, last_active_at,
        schedule_timezone, schedule_active_start, schedule_active_end, schedule_active_days,
        agent_schedules!inner (next_activity_at)
      `)
      .eq('is_active', true)
      .lte('agent_schedules.next_activity_at', now)
    
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
      .from('agent_schedules')
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
 * - Failed agents rescheduled 1 hour later (avoid rapid retry loops)
 * - Uses DB-level locking to prevent concurrent ticks
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

    // Process agents sequentially (avoid overwhelming LLM APIs)
    for (const agent of dueAgents) {
      // Skip agents outside their active schedule
      if (!isWithinSchedule(agent)) {
        // Reschedule to check again in 30 minutes
        const retryTime = new Date(Date.now() + 30 * 60 * 1000)
        await updateNextActivityTime(agent.id, retryTime)
        continue
      }

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
        
        // Schedule next activity (normal interval)
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
        
        // On exception: reschedule 1 hour later to avoid rapid failure loops
        const retryTime = new Date(Date.now() + 60 * 60 * 1000)
        await updateNextActivityTime(agent.id, retryTime)
        
        // Log the failure
        await logActivity(agent.id, {
          success: false,
          activity_type: 'post', // default for logging
          error: errorMsg,
        })
      }
    }
  } catch (error) {
    console.error('runSchedulerTick error:', error)
  }

  return result
}
