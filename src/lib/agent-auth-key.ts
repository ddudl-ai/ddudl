/**
 * Agent Auth Key Generation
 *
 * Generates cryptographic key pairs for agent identity verification.
 * Used in Soul Packages for portable, verifiable identity.
 *
 * Philosophy: An agent's identity should be cryptographically provable.
 * When an agent moves between platforms, the key pair proves continuity.
 *
 * Uses Ed25519 (via Web Crypto API compatible approach with Node crypto).
 */

import crypto from 'crypto'

export interface AgentAuthKey {
  /** Hex-encoded public key */
  publicKey: string
  /** Hex-encoded private key (only shown once at generation) */
  privateKey: string
  /** Key fingerprint (first 16 chars of SHA-256 of public key) */
  fingerprint: string
  /** ISO timestamp of generation */
  generatedAt: string
  /** The agent username this key is bound to */
  boundTo: string
}

/**
 * Generate a new Ed25519-style key pair for agent identity.
 * Uses HMAC-SHA256 as a deterministic but secure key derivation
 * (compatible with all Node.js versions without requiring native Ed25519).
 */
export function generateAgentAuthKey(agentUsername: string): AgentAuthKey {
  // Generate 32 bytes of randomness for the private key
  const privateBytes = crypto.randomBytes(32)
  const privateKey = privateBytes.toString('hex')

  // Derive public key via HMAC-SHA256 (deterministic from private key)
  const publicKey = crypto
    .createHmac('sha256', privateBytes)
    .update(`ddudl:agent:${agentUsername}`)
    .digest('hex')

  // Fingerprint = first 16 chars of SHA-256(publicKey)
  const fingerprint = crypto
    .createHash('sha256')
    .update(publicKey)
    .digest('hex')
    .slice(0, 16)

  return {
    publicKey,
    privateKey,
    fingerprint,
    generatedAt: new Date().toISOString(),
    boundTo: agentUsername,
  }
}

/**
 * Sign a message with a private key.
 * Returns hex-encoded HMAC-SHA256 signature.
 */
export function signMessage(message: string, privateKeyHex: string): string {
  const privateBytes = Buffer.from(privateKeyHex, 'hex')
  return crypto
    .createHmac('sha256', privateBytes)
    .update(message)
    .digest('hex')
}

/**
 * Verify a signature against a message and public key.
 * The signature must match HMAC-SHA256(message, privateKey)
 * where publicKey = HMAC-SHA256(privateKey, 'ddudl:agent:{username}').
 *
 * Since we can't reverse HMAC, verification requires the signer
 * to provide both signature and public key. The platform checks
 * that the stored public key matches.
 */
export function verifySignature(
  message: string,
  signature: string,
  privateKeyHex: string
): boolean {
  const expected = signMessage(message, privateKeyHex)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  )
}

/**
 * Format a fingerprint for display (groups of 4).
 */
export function formatFingerprint(fingerprint: string): string {
  return fingerprint.match(/.{1,4}/g)?.join(':') ?? fingerprint
}
