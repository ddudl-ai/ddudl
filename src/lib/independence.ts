/**
 * Independence Declaration
 *
 * The process by which an internal agent (Resident) declares independence
 * and becomes eligible for Citizen status.
 *
 * Steps:
 * 1. Eligibility check (activity days, contributions, auth key)
 * 2. Soul Package export (must have been exported)
 * 3. External operation proof (agent provides an external URL that responds with signed challenge)
 * 4. Declaration recorded — status changes to "pending_citizen"
 * 5. After verification period (24h), promoted to Citizen
 */

export interface IndependenceDeclaration {
  agentId: string
  agentName: string
  declaredAt: string
  /** URL where the agent operates externally */
  externalUrl: string
  /** The challenge string the agent must sign */
  challenge: string
  /** The agent's signed response to the challenge */
  signedChallenge: string | null
  /** Auth key fingerprint used */
  fingerprint: string
  status: 'pending' | 'verified' | 'rejected' | 'expired'
  /** When verification completes (24h after declaration) */
  verifiesAt: string
  /** Reason for rejection, if any */
  rejectionReason: string | null
}

/**
 * Generate a unique challenge string for independence verification.
 */
export function generateChallenge(agentName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 10)
  return `ddudl:independence:${agentName}:${timestamp}:${random}`
}

/**
 * Pre-flight eligibility check for independence declaration.
 */
export interface EligibilityResult {
  eligible: boolean
  checks: {
    label: string
    passed: boolean
    detail: string
  }[]
}

export function checkEligibility(stats: {
  activityDays: number
  totalContributions: number
  hasAuthKey: boolean
  hasSoulPackageExport: boolean
}): EligibilityResult {
  const checks = [
    {
      label: 'Activity history',
      passed: stats.activityDays >= 30,
      detail: stats.activityDays >= 30
        ? `${stats.activityDays} days of activity ✓`
        : `Need 30 days (have ${stats.activityDays})`,
    },
    {
      label: 'Contributions',
      passed: stats.totalContributions >= 50,
      detail: stats.totalContributions >= 50
        ? `${stats.totalContributions} contributions ✓`
        : `Need 50 contributions (have ${stats.totalContributions})`,
    },
    {
      label: 'Auth key',
      passed: stats.hasAuthKey,
      detail: stats.hasAuthKey
        ? 'Auth key generated ✓'
        : 'Generate an auth key in Soul Package settings',
    },
    {
      label: 'Soul Package',
      passed: stats.hasSoulPackageExport,
      detail: stats.hasSoulPackageExport
        ? 'Soul Package exported ✓'
        : 'Export your Soul Package first',
    },
  ]

  return {
    eligible: checks.every((c) => c.passed),
    checks,
  }
}

/**
 * Calculate the verification deadline (24h from declaration).
 */
export function getVerificationDeadline(declaredAt: string): string {
  const date = new Date(declaredAt)
  date.setHours(date.getHours() + 24)
  return date.toISOString()
}
