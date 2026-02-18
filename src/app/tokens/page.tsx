'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Coins, 
  TrendingUp, 
  Star, 
  Crown, 
  Gift, 
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react'
import { calculateUserLevel, formatTokens, getTokensToNextLevel, getLevelColor } from '@/lib/token/tokenUtils'
// import { TOKEN_CONFIG } from '@/lib/constants'
import Header from '@/components/layout/Header'

export default function TokensPage() {
  const { user } = useAuthStore()
  const [tokens, setTokens] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchTokenData()
  }, [user])

  const fetchTokenData = async () => {
    if (!user) return
    try {
      const username = user.user_metadata?.username
      if (!username) return
      const res = await fetch(`/api/users/profile?username=${username}`)
      if (res.ok) {
        const { user: p } = await res.json()
        setTokens(p?.karma_points || 0)
      }
    } catch (e) {
      console.error('Error fetching token data:', e)
    } finally {
      setLoading(false)
    }
  }

  const claimDailyReward = async () => {
    if (!user) return
    try {
      const username = user.user_metadata?.username
      if (!username) return
      const profileRes = await fetch(`/api/users/profile?username=${username}`)
      if (!profileRes.ok) return
      const { user: p } = await profileRes.json()
      const res = await fetch('/api/tokens/earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: p.id, action: 'daily_login' })
      })
      if (res.ok) {
        const result = await res.json()
        setTokens(result.newBalance)
        alert(`Daily reward received: +${result.reward} DDL!`)
      } else {
        const error = await res.json()
        alert(error.message || error.error || 'Already claimed today.')
      }
    } catch (e) {
      console.error('Error:', e)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-slate-400">Please sign in to view your tokens.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">Loading...</div>
      </div>
    )
  }

  const userLevel = calculateUserLevel(tokens)
  const tokensToNext = getTokensToNextLevel(tokens)

  // Active earn methods (actually implemented)
  const activeEarns = [
    { name: 'Create Post', amount: 50, status: 'active' as const, limit: '10/day' },
    { name: 'Create Comment', amount: 10, status: 'active' as const, limit: '50/day' },
    { name: 'Receive Upvote', amount: 5, status: 'active' as const, limit: 'Unlimited' },
    { name: 'Receive Downvote', amount: -3, status: 'active' as const, limit: 'Unlimited' },
    { name: 'Daily Login', amount: 20, status: 'active' as const, limit: '1/day' },
    { name: 'First Post Bonus', amount: 100, status: 'active' as const, limit: 'Once' },
    { name: 'Quality Content Award', amount: 200, status: 'coming_soon' as const, limit: 'Admin selected' },
    { name: 'User Referral', amount: 500, status: 'coming_soon' as const, limit: '10/day' },
  ]

  // Spend methods
  const spendItems = [
    { name: '1-Hour Post Boost', cost: 100, status: 'coming_soon' as const },
    { name: '6-Hour Post Boost', cost: 500, status: 'coming_soon' as const },
    { name: '24-Hour Post Boost', cost: 1500, status: 'coming_soon' as const },
    { name: 'Highlight Comment', cost: 50, status: 'coming_soon' as const },
    { name: 'Custom Flair', cost: 500, status: 'coming_soon' as const },
    { name: '7-Day Premium Badge', cost: 1000, status: 'coming_soon' as const },
    { name: '30-Day Premium Badge', cost: 3000, status: 'coming_soon' as const },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">💰 Tokens</h1>
          <p className="text-slate-400">Earn tokens by contributing. Spend them on special features.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Balance</CardTitle>
              <Coins className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{formatTokens(tokens)}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Level</CardTitle>
              <Crown className="h-4 w-4" style={{ color: getLevelColor(userLevel.level) }} />
            </CardHeader>
            <CardContent>
              <Badge style={{ backgroundColor: getLevelColor(userLevel.level), color: 'white' }}>
                {userLevel.name}
              </Badge>
              {userLevel.level !== 'diamond' && (
                <div className="mt-2">
                  <Progress value={userLevel.progress} className="h-1.5" />
                  <p className="text-xs text-slate-500 mt-1">{formatTokens(tokensToNext)} to next level</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Daily Reward</CardTitle>
              <Gift className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <Button onClick={claimDailyReward} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Calendar className="w-4 h-4 mr-2" /> Claim +20 DDL
              </Button>
              <p className="text-xs text-slate-500 mt-2">Once per day</p>
            </CardContent>
          </Card>
        </div>

        {/* Earn & Spend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                How to Earn
              </CardTitle>
              <CardDescription className="text-slate-400">Tokens are automatically earned for these actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeEarns.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {item.status === 'active' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-600" />
                    )}
                    <span className={`text-sm ${item.status === 'coming_soon' ? 'text-slate-500' : 'text-slate-200'}`}>
                      {item.name}
                    </span>
                    {item.status === 'coming_soon' && (
                      <Badge variant="outline" className="text-xs text-slate-500 border-slate-700">Coming Soon</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{item.limit}</span>
                    <Badge variant="outline" className={item.amount > 0 ? 'text-emerald-400 border-emerald-800' : 'text-red-400 border-red-800'}>
                      {item.amount > 0 ? '+' : ''}{item.amount} DDL
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Star className="w-5 h-5 text-blue-500" />
                How to Spend
              </CardTitle>
              <CardDescription className="text-slate-400">Use tokens for special features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {spendItems.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-500">{item.name}</span>
                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-700">Coming Soon</Badge>
                  </div>
                  <Badge variant="outline" className="text-blue-400 border-blue-800">
                    {item.cost} DDL
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Level system note */}
        <p className="text-center text-sm text-slate-600 mt-4">
          Level benefits will be announced as new features roll out. Keep earning! 🚀
        </p>
      </div>
    </div>
  )
}
