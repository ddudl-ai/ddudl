import { TOKEN_CONFIG } from '@/lib/constants'

export interface TokenTransaction {
  userId: string
  amount: number
  type: 'earn' | 'spend'
  category: string
  description: string
  metadata?: Record<string, unknown>
}

export interface UserLevel {
  level: keyof typeof TOKEN_CONFIG.levels
  name: string
  minTokens: number
  maxTokens: number
  perks: string[]
  progress: number // 현재 레벨에서의 진행률 (0-100)
}

/**
 * user의 token 양에 따른 레벨 계산
 */
export function calculateUserLevel(tokens: number): UserLevel {
  const levels = TOKEN_CONFIG.levels
  
  for (const [levelKey, levelData] of Object.entries(levels)) {
    if (tokens >= levelData.min && tokens <= levelData.max) {
      const progress = levelData.max === 999999 
        ? 100 // 최고 레벨
        : ((tokens - levelData.min) / (levelData.max - levelData.min)) * 100
      
      return {
        level: levelKey as keyof typeof TOKEN_CONFIG.levels,
        name: getLevelDisplayName(levelKey as keyof typeof TOKEN_CONFIG.levels),
        minTokens: levelData.min,
        maxTokens: levelData.max,
        perks: [...levelData.perks],
        progress: Math.round(progress)
      }
    }
  }
  
  // 기본값 (bronze)
  return {
    level: 'bronze',
    name: 'Bronze',
    minTokens: 0,
    maxTokens: 999,
    perks: ['Basic features'],
    progress: 0
  }
}

/**
 * 레벨 표시명 반환
 */
export function getLevelDisplayName(level: keyof typeof TOKEN_CONFIG.levels): string {
  const names = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    diamond: 'Diamond'
  }
  return names[level]
}

/**
 * 레벨 색상 반환
 */
export function getLevelColor(level: keyof typeof TOKEN_CONFIG.levels): string {
  const colors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF'
  }
  return colors[level]
}

/**
 * token 보상 계산
 */
export function calculateReward(action: keyof typeof TOKEN_CONFIG.rewards, metadata?: Record<string, unknown>): number {
  const baseReward = TOKEN_CONFIG.rewards[action]
  
  // 품질 기반 보너스 (AI 점수)
  if (metadata?.aiQualityScore) {
    const qualityMultiplier = Math.max(0.5, Math.min(2.0, metadata.aiQualityScore as number))
    return Math.round(baseReward * qualityMultiplier)
  }
  
  // 연속 활동 보너스
  if (metadata?.consecutiveDays && action === 'daily_login') {
    const streakBonus = Math.min(10, metadata.consecutiveDays as number) * 0.1
    return Math.round(baseReward * (1 + streakBonus))
  }
  
  return baseReward
}

/**
 * token 포맷팅 (소수점 처리)
 */
export function formatTokens(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M ${TOKEN_CONFIG.symbol}`
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K ${TOKEN_CONFIG.symbol}`
  } else {
    return `${amount.toFixed(TOKEN_CONFIG.decimals)} ${TOKEN_CONFIG.symbol}`
  }
}

/**
 * user가 특정 기능을 사용할 수 있는지 확인
 */
export function canAfford(userTokens: number, cost: number): boolean {
  return userTokens >= cost
}

/**
 * 특정 레벨에서 사용 가능한 기능 확인
 */
export function hasLevelAccess(userLevel: keyof typeof TOKEN_CONFIG.levels, requiredLevel: keyof typeof TOKEN_CONFIG.levels): boolean {
  const levelOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  const userIndex = levelOrder.indexOf(userLevel)
  const requiredIndex = levelOrder.indexOf(requiredLevel)
  
  return userIndex >= requiredIndex
}

/**
 * 다음 레벨까지 필요한 token 수 계산
 */
export function getTokensToNextLevel(currentTokens: number): number {
  const currentLevel = calculateUserLevel(currentTokens)
  
  if (currentLevel.level === 'diamond') {
    return 0 // 이미 최고 레벨
  }
  
  const levelOrder: (keyof typeof TOKEN_CONFIG.levels)[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
  const currentIndex = levelOrder.indexOf(currentLevel.level)
  const nextLevel = levelOrder[currentIndex + 1]
  
  if (nextLevel) {
    return TOKEN_CONFIG.levels[nextLevel].min - currentTokens
  }
  
  return 0
}