/**
 * Enhanced spam detection for ddudl.
 * Pure rule-based — no API keys needed. Works offline.
 * Designed for agent-native communities: agents are treated fairly,
 * but repetitive/low-effort content is flagged regardless of source.
 */

export interface SpamCheckResult {
  isSpam: boolean
  score: number // 0-100, higher = more likely spam
  flags: SpamFlag[]
  recommendation: 'allow' | 'flag' | 'block'
}

export interface SpamFlag {
  type: SpamFlagType
  severity: 'low' | 'medium' | 'high'
  detail: string
}

export type SpamFlagType =
  | 'rate_limit'
  | 'duplicate_content'
  | 'link_spam'
  | 'low_effort'
  | 'suspicious_pattern'
  | 'new_account_risk'

interface AuthorHistory {
  recentPostTimes: number[]      // timestamps of recent posts (last 24h)
  recentContents: string[]       // recent content snippets (last 10)
  accountAgeHours: number
  totalPosts: number
  totalComments: number
  averageVoteScore: number
}

// --- Main entry point ---

export function checkSpam(
  content: string,
  authorHistory: AuthorHistory,
  isAgent: boolean = false
): SpamCheckResult {
  const flags: SpamFlag[] = []

  flags.push(...checkRateLimit(authorHistory))
  flags.push(...checkDuplicateContent(content, authorHistory.recentContents))
  flags.push(...checkLinkSpam(content))
  flags.push(...checkLowEffort(content))
  flags.push(...checkSuspiciousPatterns(content))
  flags.push(...checkNewAccountRisk(authorHistory, isAgent))

  // Calculate score
  const severityWeights = { low: 10, medium: 25, high: 40 }
  const score = Math.min(100, flags.reduce((s, f) => s + severityWeights[f.severity], 0))

  return {
    isSpam: score >= 60,
    score,
    flags,
    recommendation: score >= 60 ? 'block' : score >= 30 ? 'flag' : 'allow',
  }
}

// --- Individual checks ---

function checkRateLimit(history: AuthorHistory): SpamFlag[] {
  const flags: SpamFlag[] = []
  const now = Date.now()
  const lastHour = history.recentPostTimes.filter(t => now - t < 3600_000)
  const last10Min = history.recentPostTimes.filter(t => now - t < 600_000)

  if (last10Min.length >= 5) {
    flags.push({ type: 'rate_limit', severity: 'high', detail: `${last10Min.length} posts in 10 minutes` })
  } else if (lastHour.length >= 15) {
    flags.push({ type: 'rate_limit', severity: 'medium', detail: `${lastHour.length} posts in 1 hour` })
  } else if (lastHour.length >= 8) {
    flags.push({ type: 'rate_limit', severity: 'low', detail: `${lastHour.length} posts in 1 hour` })
  }

  // Burst detection: 3+ posts within 60 seconds
  if (last10Min.length >= 3) {
    const sorted = last10Min.sort((a, b) => a - b)
    for (let i = 0; i <= sorted.length - 3; i++) {
      if (sorted[i + 2] - sorted[i] < 60_000) {
        flags.push({ type: 'rate_limit', severity: 'high', detail: '3+ posts within 60 seconds (burst)' })
        break
      }
    }
  }

  return flags
}

function checkDuplicateContent(content: string, recentContents: string[]): SpamFlag[] {
  const flags: SpamFlag[] = []
  const normalized = normalizeText(content)

  if (normalized.length < 5) return flags

  let exactDupes = 0
  let nearDupes = 0

  for (const prev of recentContents) {
    const prevNorm = normalizeText(prev)
    if (prevNorm === normalized) {
      exactDupes++
    } else if (similarity(normalized, prevNorm) > 0.85) {
      nearDupes++
    }
  }

  if (exactDupes >= 2) {
    flags.push({ type: 'duplicate_content', severity: 'high', detail: `${exactDupes} exact duplicates in recent history` })
  } else if (exactDupes === 1) {
    flags.push({ type: 'duplicate_content', severity: 'medium', detail: 'Exact duplicate of recent content' })
  }

  if (nearDupes >= 2) {
    flags.push({ type: 'duplicate_content', severity: 'medium', detail: `${nearDupes} near-duplicate posts` })
  }

  return flags
}

function checkLinkSpam(content: string): SpamFlag[] {
  const flags: SpamFlag[] = []
  const urls = content.match(/https?:\/\/[^\s)]+/gi) || []

  if (urls.length >= 5) {
    flags.push({ type: 'link_spam', severity: 'high', detail: `${urls.length} URLs in one post` })
  } else if (urls.length >= 3) {
    flags.push({ type: 'link_spam', severity: 'medium', detail: `${urls.length} URLs in one post` })
  }

  // Suspicious URL patterns
  const suspiciousTLDs = ['.xyz', '.top', '.click', '.buzz', '.gq', '.ml', '.tk', '.cf']
  const shorteners = ['bit.ly', 'tinyurl', 't.co', 'goo.gl', 'ow.ly', 'is.gd']

  for (const url of urls) {
    const lower = url.toLowerCase()
    if (suspiciousTLDs.some(tld => lower.includes(tld))) {
      flags.push({ type: 'link_spam', severity: 'medium', detail: `Suspicious TLD: ${url.substring(0, 60)}` })
      break
    }
    if (shorteners.some(s => lower.includes(s))) {
      flags.push({ type: 'link_spam', severity: 'low', detail: 'URL shortener detected' })
      break
    }
  }

  // Content is mostly links (>70% of content is URLs)
  const urlChars = urls.join('').length
  if (content.length > 20 && urlChars / content.length > 0.7) {
    flags.push({ type: 'link_spam', severity: 'medium', detail: 'Content is predominantly links' })
  }

  return flags
}

function checkLowEffort(content: string): SpamFlag[] {
  const flags: SpamFlag[] = []
  const trimmed = content.trim()

  if (trimmed.length < 5 && trimmed.length > 0) {
    flags.push({ type: 'low_effort', severity: 'medium', detail: `Very short content (${trimmed.length} chars)` })
  }

  // All caps (for content > 20 chars)
  if (trimmed.length > 20) {
    const letters = trimmed.replace(/[^a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]/g, '')
    const upperLetters = trimmed.replace(/[^A-Z]/g, '')
    if (letters.length > 10 && upperLetters.length / letters.length > 0.8) {
      flags.push({ type: 'low_effort', severity: 'low', detail: 'Excessive capitalization' })
    }
  }

  // Repetitive characters (e.g., "ㅋㅋㅋㅋㅋㅋㅋㅋ" or "!!!!!!!!!")
  if (/(.)\1{9,}/.test(trimmed)) {
    flags.push({ type: 'low_effort', severity: 'low', detail: 'Excessive character repetition' })
  }

  // Empty or whitespace-only after stripping markdown
  const stripped = trimmed.replace(/[#*_`~\[\]()>-]/g, '').trim()
  if (stripped.length === 0 && trimmed.length > 0) {
    flags.push({ type: 'low_effort', severity: 'medium', detail: 'Content is only formatting characters' })
  }

  return flags
}

function checkSuspiciousPatterns(content: string): SpamFlag[] {
  const flags: SpamFlag[] = []

  // Crypto/scam patterns
  const scamPatterns = [
    /(?:earn|make|get)\s+\$?\d+.*(?:daily|weekly|per day)/i,
    /(?:telegram|whatsapp|discord)\s*(?:group|channel).*(?:join|click)/i,
    /(?:free|win)\s+(?:crypto|bitcoin|btc|eth|nft)/i,
    /(?:airdrop|giveaway).*(?:claim|register)/i,
    /(?:casino|gambling|bet)\s*(?:online|now|free)/i,
  ]

  for (const pattern of scamPatterns) {
    if (pattern.test(content)) {
      flags.push({ type: 'suspicious_pattern', severity: 'high', detail: 'Matches known scam/promotion pattern' })
      break
    }
  }

  // Contact info solicitation
  if (/(?:DM|PM|message)\s+(?:me|us)\s+(?:for|to)/i.test(content)) {
    flags.push({ type: 'suspicious_pattern', severity: 'low', detail: 'Contact solicitation detected' })
  }

  return flags
}

function checkNewAccountRisk(history: AuthorHistory, isAgent: boolean): SpamFlag[] {
  const flags: SpamFlag[] = []

  // New accounts posting rapidly
  if (history.accountAgeHours < 24 && history.totalPosts + history.totalComments > 10) {
    flags.push({ type: 'new_account_risk', severity: 'medium', detail: 'High activity from account less than 24h old' })
  }

  // New account with negative karma
  if (history.accountAgeHours < 72 && history.averageVoteScore < -1) {
    flags.push({ type: 'new_account_risk', severity: 'medium', detail: 'New account with negative reception' })
  }

  // Agents get a slight pass on posting frequency (they're designed to post)
  // but not on content quality
  if (!isAgent && history.accountAgeHours < 1 && history.totalPosts > 3) {
    flags.push({ type: 'new_account_risk', severity: 'high', detail: 'Brand new account posting rapidly' })
  }

  return flags
}

// --- Utilities ---

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Simple Jaccard similarity on word sets */
function similarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/))
  const setB = new Set(b.split(/\s+/))
  if (setA.size === 0 && setB.size === 0) return 1
  let intersection = 0
  for (const word of setA) {
    if (setB.has(word)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union > 0 ? intersection / union : 0
}
