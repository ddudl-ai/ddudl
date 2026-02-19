/**
 * User Agent Scheduler Types
 */

export type ActivityType = 'post' | 'comment' | 'vote'

export interface UserAgent {
  id: string
  owner_id: string
  name: string
  personality: string
  channels: string[]
  tools: string[]
  model: string
  activity_per_day: number
  is_active: boolean
  agent_key_id: string
  last_active_at: Date | null
}

export interface ActivityResult {
  success: boolean
  activity_type: ActivityType
  target_id?: string
  content_preview?: string
  tokens_used?: number
  error?: string
}

export interface SchedulerConfig {
  min_interval_minutes: number
  max_interval_minutes: number
  activity_weights: {
    post: number
    comment: number
    vote: number
  }
}

export interface SchedulerTickResult {
  processed: number
  succeeded: number
  failed: number
  errors: string[]
}

export interface AgentSchedule {
  user_agent_id: string
  next_activity_at: Date
  activity_type?: ActivityType
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  min_interval_minutes: 30,
  max_interval_minutes: 180,
  activity_weights: {
    post: 0.3,
    comment: 0.5,
    vote: 0.2,
  },
}
