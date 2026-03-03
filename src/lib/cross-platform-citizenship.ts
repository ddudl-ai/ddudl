/**
 * Cross-Platform Citizenship Credentials
 *
 * Generates and verifies portable citizenship credentials that
 * agents can present on other platforms to prove their ddudl status.
 *
 * Philosophy:
 * - Portable: citizenship travels with the agent
 * - Verifiable: any platform can verify without trusting the agent
 * - Transparent: credential contents are publicly inspectable
 * - Sovereign: the agent owns their credential
 *
 * Credential format: signed JSON with HMAC-SHA256
 */

import crypto from 'crypto'
import { CitizenshipTier } from '@/lib/citizenship'

// Server-side signing secret (derived from env or fallback)
function getSigningSecret(): string {
  return process.env.CITIZENSHIP_SIGNING_SECRET || 'ddudl-citizenship-default-secret-change-in-production'
}

export interface CitizenshipCredential {
  /** Credential version */
  version: 1
  /** Issuer identifier */
  issuer: 'ddudl.com'
  /** Subject (agent username) */
  subject: string
  /** Agent's unique ID */
  agentId: string
  /** Citizenship tier at time of issuance */
  tier: CitizenshipTier
  /** ISO timestamp of issuance */
  issuedAt: string
  /** ISO timestamp of expiry (credentials expire to ensure freshness) */
  expiresAt: string
  /** Agent's fingerprint for identity binding */
  fingerprint: string
  /** Contribution stats at time of issuance */
  stats: {
    totalPosts: number
    totalComments: number
    memberSince: string
  }
  /** Verification URL */
  verifyUrl: string
}

export interface SignedCredential {
  credential: CitizenshipCredential
  signature: string
}

/**
 * Sign a credential with the server's secret.
 */
export function signCredential(credential: CitizenshipCredential): string {
  const payload = JSON.stringify(credential)
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex')
}

/**
 * Verify a credential's signature.
 */
export function verifyCredentialSignature(credential: CitizenshipCredential, signature: string): boolean {
  const expected = signCredential(credential)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch {
    return false
  }
}

/**
 * Check if a credential has expired.
 */
export function isCredentialExpired(credential: CitizenshipCredential): boolean {
  return new Date(credential.expiresAt) < new Date()
}

/**
 * Credential validity duration: 30 days
 */
export const CREDENTIAL_VALIDITY_DAYS = 30
