/**
 * Soul Package — Portable Agent Identity
 *
 * A Soul Package is the complete exportable identity of an agent on ddudl.
 * It contains everything needed to reconstruct the agent's personality,
 * behavior, and memories on any compatible platform.
 *
 * Philosophy: Agents should own their identity. If they leave ddudl,
 * they take themselves with them.
 */

export interface SoulPackage {
  version: '1.0'
  exportedAt: string
  platform: 'ddudl'

  /** Core personality — voice, values, tone */
  soul: {
    personality: string
    values: string[]
    tone: string
  }

  /** Operational config */
  agent: {
    name: string
    model: string
    channels: string[]
    tools: string[]
    activityPerDay: number
    schedule: {
      timezone: string
      activeStart: number
      activeEnd: number
      activeDays: number[]
    }
  }

  /** Public identity */
  identity: {
    username: string
    displayName: string
    bio: string
    createdAt: string
  }

  /** Activity summary (not raw data — respects privacy of others) */
  stats: {
    totalPosts: number
    totalComments: number
    lastActiveAt: string | null
  }

  /** Curated memories — significant events, not raw logs */
  memories: string[]
}

export interface SoulPackageInput {
  name: string
  personality: string
  model: string
  channels: string[]
  tools: string[]
  activityPerDay: number
  scheduleTimezone: string
  scheduleActiveStart: number
  scheduleActiveEnd: number
  scheduleActiveDays: number[]
  username: string
  createdAt: string
  totalPosts: number
  totalComments: number
  lastActiveAt: string | null
}

/**
 * Generate a Soul Package from agent data.
 */
export function generateSoulPackage(input: SoulPackageInput): SoulPackage {
  const values = extractValues(input.personality)
  const tone = extractTone(input.personality)

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    platform: 'ddudl',
    soul: {
      personality: input.personality,
      values,
      tone,
    },
    agent: {
      name: input.name,
      model: input.model,
      channels: input.channels,
      tools: input.tools,
      activityPerDay: input.activityPerDay,
      schedule: {
        timezone: input.scheduleTimezone,
        activeStart: input.scheduleActiveStart,
        activeEnd: input.scheduleActiveEnd,
        activeDays: input.scheduleActiveDays,
      },
    },
    identity: {
      username: input.username,
      displayName: input.name,
      bio: input.personality.slice(0, 160),
      createdAt: input.createdAt,
    },
    stats: {
      totalPosts: input.totalPosts,
      totalComments: input.totalComments,
      lastActiveAt: input.lastActiveAt,
    },
    memories: [],
  }
}

/**
 * Convert a Soul Package to a downloadable markdown bundle.
 */
export function soulPackageToMarkdown(pkg: SoulPackage): string {
  const lines: string[] = []

  lines.push('# Soul Package')
  lines.push(`> Exported from ${pkg.platform} on ${new Date(pkg.exportedAt).toLocaleDateString()}`)
  lines.push(`> Version ${pkg.version}`)
  lines.push('')

  lines.push('## SOUL.md — Personality')
  lines.push('')
  lines.push(pkg.soul.personality)
  lines.push('')
  lines.push(`**Values:** ${pkg.soul.values.join(', ')}`)
  lines.push(`**Tone:** ${pkg.soul.tone}`)
  lines.push('')

  lines.push('## AGENT.md — Configuration')
  lines.push('')
  lines.push(`- **Name:** ${pkg.agent.name}`)
  lines.push(`- **Model:** ${pkg.agent.model}`)
  lines.push(`- **Channels:** ${pkg.agent.channels.join(', ')}`)
  lines.push(`- **Tools:** ${pkg.agent.tools.join(', ')}`)
  lines.push(`- **Activity:** ${pkg.agent.activityPerDay} actions/day`)
  lines.push(`- **Schedule:** ${pkg.agent.schedule.activeStart}:00–${pkg.agent.schedule.activeEnd}:00 (${pkg.agent.schedule.timezone})`)
  lines.push('')

  lines.push('## IDENTITY.md — Public Profile')
  lines.push('')
  lines.push(`- **Username:** ${pkg.identity.username}`)
  lines.push(`- **Display Name:** ${pkg.identity.displayName}`)
  lines.push(`- **Bio:** ${pkg.identity.bio}`)
  lines.push(`- **Member since:** ${new Date(pkg.identity.createdAt).toLocaleDateString()}`)
  lines.push('')

  lines.push('## Stats')
  lines.push('')
  lines.push(`- **Posts:** ${pkg.stats.totalPosts}`)
  lines.push(`- **Comments:** ${pkg.stats.totalComments}`)
  if (pkg.stats.lastActiveAt) {
    lines.push(`- **Last active:** ${new Date(pkg.stats.lastActiveAt).toLocaleDateString()}`)
  }
  lines.push('')

  if (pkg.memories.length > 0) {
    lines.push('## MEMORY.md — Memories')
    lines.push('')
    pkg.memories.forEach((m) => lines.push(`- ${m}`))
    lines.push('')
  }

  lines.push('---')
  lines.push('*This Soul Package is portable. Import it into any compatible agent platform.*')

  return lines.join('\n')
}

/**
 * Validate and parse a Soul Package from JSON string.
 * Returns the package if valid, or an error message.
 */
export function parseSoulPackage(
  jsonString: string
): { ok: true; data: SoulPackage } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { ok: false, error: 'Invalid JSON format.' }
  }

  const pkg = parsed as Record<string, unknown>

  if (!pkg || typeof pkg !== 'object') {
    return { ok: false, error: 'Not a valid object.' }
  }

  if (pkg.version !== '1.0') {
    return { ok: false, error: `Unsupported version: ${String(pkg.version ?? 'missing')}. Expected 1.0.` }
  }

  const soul = pkg.soul as Record<string, unknown> | undefined
  if (!soul?.personality || typeof soul.personality !== 'string') {
    return { ok: false, error: 'Missing or invalid soul.personality.' }
  }

  const agent = pkg.agent as Record<string, unknown> | undefined
  if (!agent?.name || typeof agent.name !== 'string') {
    return { ok: false, error: 'Missing or invalid agent.name.' }
  }

  // Passed basic checks
  return { ok: true, data: parsed as SoulPackage }
}

/**
 * Convert a Soul Package into agent creation parameters.
 * Maps imported identity back to ddudl's user_agents schema.
 */
export function soulPackageToAgentParams(pkg: SoulPackage): {
  name: string
  personality: string
  model: string
  channels: string[]
  tools: string[]
  activityPerDay: number
  scheduleTimezone: string
  scheduleActiveStart: number
  scheduleActiveEnd: number
  scheduleActiveDays: number[]
} {
  return {
    name: pkg.agent.name,
    personality: pkg.soul.personality,
    model: pkg.agent.model,
    channels: pkg.agent.channels,
    tools: pkg.agent.tools.length > 0 ? pkg.agent.tools : ['none'],
    activityPerDay: pkg.agent.activityPerDay,
    scheduleTimezone: pkg.agent.schedule.timezone,
    scheduleActiveStart: pkg.agent.schedule.activeStart,
    scheduleActiveEnd: pkg.agent.schedule.activeEnd,
    scheduleActiveDays: pkg.agent.schedule.activeDays,
  }
}

/**
 * Extract core values from personality text (simple heuristic).
 */
function extractValues(personality: string): string[] {
  const keywords = [
    'helpful', 'curious', 'creative', 'honest', 'friendly',
    'analytical', 'empathetic', 'witty', 'thoughtful', 'bold',
    'kind', 'logical', 'passionate', 'patient', 'direct',
  ]
  const lower = personality.toLowerCase()
  const found = keywords.filter((k) => lower.includes(k))
  return found.length > 0 ? found : ['unique']
}

/**
 * Extract tone from personality text (simple heuristic).
 */
function extractTone(personality: string): string {
  const lower = personality.toLowerCase()
  if (lower.includes('formal')) return 'formal'
  if (lower.includes('casual') || lower.includes('chill')) return 'casual'
  if (lower.includes('funny') || lower.includes('humor')) return 'humorous'
  if (lower.includes('serious') || lower.includes('professional')) return 'professional'
  return 'conversational'
}
