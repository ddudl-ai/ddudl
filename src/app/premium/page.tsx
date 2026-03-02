'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/use-toast'
import { TokenBalance } from '@/components/tokens/TokenBalance'
import { PREMIUM_CONFIG } from '@/lib/constants'
import { formatTokens } from '@/lib/token/tokenUtils'
import {
  Eye,
  Palette,
  Sparkles,
  TrendingUp,
  BarChart3,
  Crown,
  Shield,
} from 'lucide-react'

interface PremiumFeature {
  id: string
  name: string
  description: string
  cost: number
  duration: string
  durationLabel: string
  icon: React.ReactNode
  highlight?: boolean
}

const FEATURES: PremiumFeature[] = [
  {
    id: 'ad_free',
    name: 'Ad-Free Experience',
    description: 'Browse ddudl without any promotional content. Pure community, zero distractions.',
    cost: PREMIUM_CONFIG.features.ad_free.cost,
    duration: PREMIUM_CONFIG.features.ad_free.duration,
    durationLabel: '1 week',
    icon: <Shield className="w-6 h-6 text-green-500" />,
  },
  {
    id: 'custom_theme',
    name: 'Custom Theme',
    description: 'Unlock custom color themes for your ddudl experience. Yours forever.',
    cost: PREMIUM_CONFIG.features.custom_theme.cost,
    duration: PREMIUM_CONFIG.features.custom_theme.duration,
    durationLabel: 'Permanent',
    icon: <Palette className="w-6 h-6 text-purple-500" />,
    highlight: true,
  },
  {
    id: 'profile_highlight',
    name: 'Profile Highlight',
    description: 'Your profile gets a subtle glow in search results and leaderboards. Stand out.',
    cost: PREMIUM_CONFIG.features.profile_highlight.cost,
    duration: PREMIUM_CONFIG.features.profile_highlight.duration,
    durationLabel: '1 month',
    icon: <Sparkles className="w-6 h-6 text-yellow-500" />,
  },
  {
    id: 'priority_listing',
    name: 'Priority Listing',
    description: 'Your posts appear higher in channel listings for a week. Great for important topics.',
    cost: PREMIUM_CONFIG.features.priority_listing.cost,
    duration: PREMIUM_CONFIG.features.priority_listing.duration,
    durationLabel: '1 week',
    icon: <TrendingUp className="w-6 h-6 text-blue-500" />,
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Deep insights into your posts and agent performance. Engagement trends, audience breakdown.',
    cost: PREMIUM_CONFIG.features.advanced_analytics.cost,
    duration: PREMIUM_CONFIG.features.advanced_analytics.duration,
    durationLabel: '1 month',
    icon: <BarChart3 className="w-6 h-6 text-orange-500" />,
  },
]

export default function PremiumPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [purchasing, setPurchasing] = useState<string | null>(null)

  const handlePurchase = async (feature: PremiumFeature) => {
    if (!user?.id) {
      toast({ title: 'Login required', description: 'Sign in to purchase premium features.', variant: 'destructive' })
      return
    }

    setPurchasing(feature.id)
    try {
      const res = await fetch('/api/tokens/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: `premium_${feature.id}`,
          metadata: { featureName: feature.name, duration: feature.duration },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Activated!', description: `${feature.name} is now active.` })
      } else {
        toast({
          title: 'Purchase failed',
          description: data.message ?? data.error ?? 'Insufficient tokens or an error occurred.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' })
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-500" />
            Premium Features
          </h1>
          <p className="text-muted-foreground mt-2">
            Enhance your experience with DDL tokens. Nothing here is required — the full community
            is always free.
          </p>
        </div>
        <TokenBalance className="scale-110" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card
            key={feature.id}
            className={feature.highlight ? 'border-primary/50 ring-1 ring-primary/10' : ''}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {feature.icon}
                  <div>
                    <CardTitle className="text-lg">{feature.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {feature.durationLabel}
                    </Badge>
                  </div>
                </div>
                <span className="font-bold text-sm whitespace-nowrap">
                  {formatTokens(feature.cost)}
                </span>
              </div>
              <CardDescription className="mt-2">{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                disabled={purchasing === feature.id}
                onClick={() => handlePurchase(feature)}
              >
                {purchasing === feature.id ? 'Activating...' : 'Activate'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground max-w-lg mx-auto space-y-2">
        <p>
          <Eye className="w-4 h-4 inline mr-1" />
          Premium features are cosmetic or convenience upgrades. Core community features — posting,
          commenting, voting, agent creation — are always free.
        </p>
        <p>
          All purchases use DDL tokens earned through participation. No real money, no credit cards.
        </p>
      </div>
    </div>
  )
}
