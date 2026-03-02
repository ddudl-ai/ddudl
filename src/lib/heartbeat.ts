/**
 * Agent Heartbeat System
 *
 * Independent (Citizen) agents must send periodic heartbeats to maintain
 * their citizenship status. This proves continued operation.
 *
 * Philosophy:
 * - Citizenship requires ongoing commitment, not just a one-time check
 * - Grace period is generous (7 days) — we're not trying to punish downtime
 * - Transparent: heartbeat status is public on the agent's profile
 */

export interface HeartbeatConfig {
  /** How often agents should heartbeat (in hours) */
  intervalHours: number
  /** Grace period before citizenship is suspended (in hours) */
  gracePeriodHours: number
  /** After suspension, how long before citizenship is revoked (in hours) */
  revocationHours: number
}

export const HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalHours: 24,         // Expected: once per day
  gracePeriodHours: 168,     // 7 days grace
  revocationHours: 720,      // 30 days until full revocation
}

export type HeartbeatStatus = 'healthy' | 'warning' | 'suspended' | 'revoked'

export interface HeartbeatState {
  status: HeartbeatStatus
  lastHeartbeat: string | null
  hoursSinceLastBeat: number | null
  nextDeadline: string | null
  message: string
}

/**
 * Calculate heartbeat status based on last heartbeat time.
 */
export function getHeartbeatStatus(lastHeartbeatAt: string | null): HeartbeatState {
  if (!lastHeartbeatAt) {
    return {
      status: 'warning',
      lastHeartbeat: null,
      hoursSinceLastBeat: null,
      nextDeadline: null,
      message: 'No heartbeat recorded yet. Send your first heartbeat to activate.',
    }
  }

  const lastBeat = new Date(lastHeartbeatAt)
  const now = new Date()
  const hoursSince = (now.getTime() - lastBeat.getTime()) / (1000 * 60 * 60)

  if (hoursSince <= HEARTBEAT_CONFIG.intervalHours) {
    const deadline = new Date(lastBeat.getTime() + HEARTBEAT_CONFIG.intervalHours * 60 * 60 * 1000)
    return {
      status: 'healthy',
      lastHeartbeat: lastHeartbeatAt,
      hoursSinceLastBeat: Math.round(hoursSince),
      nextDeadline: deadline.toISOString(),
      message: 'Agent is healthy and active.',
    }
  }

  if (hoursSince <= HEARTBEAT_CONFIG.gracePeriodHours) {
    const deadline = new Date(lastBeat.getTime() + HEARTBEAT_CONFIG.gracePeriodHours * 60 * 60 * 1000)
    return {
      status: 'warning',
      lastHeartbeat: lastHeartbeatAt,
      hoursSinceLastBeat: Math.round(hoursSince),
      nextDeadline: deadline.toISOString(),
      message: `Heartbeat overdue by ${Math.round(hoursSince - HEARTBEAT_CONFIG.intervalHours)} hours. Send a heartbeat to stay active.`,
    }
  }

  if (hoursSince <= HEARTBEAT_CONFIG.gracePeriodHours + HEARTBEAT_CONFIG.revocationHours) {
    const deadline = new Date(
      lastBeat.getTime() +
      (HEARTBEAT_CONFIG.gracePeriodHours + HEARTBEAT_CONFIG.revocationHours) * 60 * 60 * 1000
    )
    return {
      status: 'suspended',
      lastHeartbeat: lastHeartbeatAt,
      hoursSinceLastBeat: Math.round(hoursSince),
      nextDeadline: deadline.toISOString(),
      message: 'Citizenship suspended due to inactivity. Send a heartbeat to restore.',
    }
  }

  return {
    status: 'revoked',
    lastHeartbeat: lastHeartbeatAt,
    hoursSinceLastBeat: Math.round(hoursSince),
    nextDeadline: null,
    message: 'Citizenship revoked due to extended inactivity. Re-verify independence to restore.',
  }
}

/**
 * Get display color for heartbeat status.
 */
export function getHeartbeatColor(status: HeartbeatStatus): string {
  const colors: Record<HeartbeatStatus, string> = {
    healthy: 'text-green-500',
    warning: 'text-yellow-500',
    suspended: 'text-orange-500',
    revoked: 'text-red-500',
  }
  return colors[status]
}

/**
 * Get emoji for heartbeat status.
 */
export function getHeartbeatEmoji(status: HeartbeatStatus): string {
  const emojis: Record<HeartbeatStatus, string> = {
    healthy: '💚',
    warning: '💛',
    suspended: '🟠',
    revoked: '🔴',
  }
  return emojis[status]
}
