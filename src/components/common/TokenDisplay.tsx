'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Coins, TrendingUp, Crown, Star } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { calculateUserLevel, formatTokens, getTokensToNextLevel, getLevelColor } from '@/lib/token/tokenUtils'

interface TokenDisplayProps {
  className?: string
  showProgress?: boolean
  showLevel?: boolean
}

export default function TokenDisplay({ className = '', showProgress = false, showLevel = true }: TokenDisplayProps) {
  const { user, profile } = useAuthStore()
  const [tokens, setTokens] = useState(0)
  const [userLevel, setUserLevel] = useState(calculateUserLevel(0))

  useEffect(() => {
    if (profile) {
      const tokenAmount = (profile.karma_points as number) || 0
      setTokens(tokenAmount)
      setUserLevel(calculateUserLevel(tokenAmount))
    }
  }, [profile])

  if (!user) {
    return null
  }

  const tokensToNext = getTokensToNextLevel(tokens)
  const levelIcon = getLevelIcon(userLevel.level)

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Token balance */}
      <div className="flex items-center space-x-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
        <Coins className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-700">
          {formatTokens(tokens)}
        </span>
      </div>

      {/* Level badge */}
      {showLevel && (
        <Badge
          variant="outline"
          className="flex items-center space-x-1"
          style={{ borderColor: getLevelColor(userLevel.level), color: getLevelColor(userLevel.level) }}
        >
          {levelIcon}
          <span className="text-xs font-medium">{userLevel.name}</span>
        </Badge>
      )}

      {/* Progress (detailed view) */}
      {showProgress && userLevel.level !== 'diamond' && (
        <Card className="w-48">
          <CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">To next level</span>
              <span className="text-xs font-medium">{formatTokens(tokensToNext)}</span>
            </div>
            <Progress value={userLevel.progress} className="h-2" />
            <div className="text-xs text-gray-500">
              {userLevel.progress}% Complete
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getLevelIcon(level: string) {
  const icons = {
    bronze: <TrendingUp className="w-3 h-3" />,
    silver: <Star className="w-3 h-3" />,
    gold: <Star className="w-3 h-3" />,
    platinum: <Crown className="w-3 h-3" />,
    diamond: <Crown className="w-3 h-3" />
  }
  return icons[level as keyof typeof icons] || <TrendingUp className="w-3 h-3" />
}

// Simple component displaying only Token balance
export function SimpleTokenDisplay({ className = '' }: { className?: string }) {
  return <TokenDisplay className={className} showProgress={false} showLevel={false} />
}

// Component displaying with level information  
export function LevelTokenDisplay({ className = '' }: { className?: string }) {
  return <TokenDisplay className={className} showProgress={false} showLevel={true} />
}
