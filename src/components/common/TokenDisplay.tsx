'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Card, CardContent } from &apos;@/components/ui/card&apos;
import { Progress } from &apos;@/components/ui/progress&apos;
import { Coins, TrendingUp, Crown, Star } from &apos;lucide-react&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { calculateUserLevel, formatTokens, getTokensToNextLevel, getLevelColor } from &apos;@/lib/token/tokenUtils&apos;

interface TokenDisplayProps {
  className?: string
  showProgress?: boolean
  showLevel?: boolean
}

export default function TokenDisplay({ className = &apos;', showProgress = false, showLevel = true }: TokenDisplayProps) {
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
      <div className=&quot;flex items-center space-x-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-200&quot;>
        <Coins className=&quot;w-4 h-4 text-amber-600&quot; />
        <span className=&quot;text-sm font-medium text-amber-700&quot;>
          {formatTokens(tokens)}
        </span>
      </div>

      {/* Level badge */}
      {showLevel && (
        <Badge
          variant=&quot;outline&quot;
          className=&quot;flex items-center space-x-1&quot;
          style={{ borderColor: getLevelColor(userLevel.level), color: getLevelColor(userLevel.level) }}
        >
          {levelIcon}
          <span className=&quot;text-xs font-medium&quot;>{userLevel.name}</span>
        </Badge>
      )}

      {/* Progress (detailed view) */}
      {showProgress && userLevel.level !== &apos;diamond&apos; && (
        <Card className=&quot;w-48&quot;>
          <CardContent className=&quot;p-3 space-y-2&quot;>
            <div className=&quot;flex justify-between items-center&quot;>
              <span className=&quot;text-xs text-gray-600&quot;>To next level</span>
              <span className=&quot;text-xs font-medium&quot;>{formatTokens(tokensToNext)}</span>
            </div>
            <Progress value={userLevel.progress} className=&quot;h-2&quot; />
            <div className=&quot;text-xs text-gray-500&quot;>
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
    bronze: <TrendingUp className=&quot;w-3 h-3&quot; />,
    silver: <Star className=&quot;w-3 h-3&quot; />,
    gold: <Star className=&quot;w-3 h-3&quot; />,
    platinum: <Crown className=&quot;w-3 h-3&quot; />,
    diamond: <Crown className=&quot;w-3 h-3&quot; />
  }
  return icons[level as keyof typeof icons] || <TrendingUp className=&quot;w-3 h-3&quot; />
}

// Simple component displaying only Token balance
export function SimpleTokenDisplay({ className = &apos;' }: { className?: string }) {
  return <TokenDisplay className={className} showProgress={false} showLevel={false} />
}

// Component displaying with level information  
export function LevelTokenDisplay({ className = &apos;' }: { className?: string }) {
  return <TokenDisplay className={className} showProgress={false} showLevel={true} />
}
