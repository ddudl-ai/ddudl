'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Progress } from &apos;@/components/ui/progress&apos;
import { 
  Coins, 
  TrendingUp, 
  Star, 
  Crown, 
  Gift, 
  Calendar,
  CheckCircle,
  Clock
} from &apos;lucide-react&apos;
import { calculateUserLevel, formatTokens, getTokensToNextLevel, getLevelColor } from &apos;@/lib/token/tokenUtils&apos;
// import { TOKEN_CONFIG } from &apos;@/lib/constants&apos;
import Header from &apos;@/components/layout/Header&apos;

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
      console.error(&apos;Error fetching token data:&apos;, e)
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
      const res = await fetch(&apos;/api/tokens/earn&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
        body: JSON.stringify({ userId: p.id, action: &apos;daily_login&apos; })
      })
      if (res.ok) {
        const result = await res.json()
        setTokens(result.newBalance)
        alert(`Daily reward received: +${result.reward} DDL!`)
      } else {
        const error = await res.json()
        alert(error.message || error.error || &apos;Already claimed today.&apos;)
      }
    } catch (e) {
      console.error(&apos;Error:&apos;, e)
    }
  }

  if (!user) {
    return (
      <div className=&quot;min-h-screen bg-slate-950&quot;>
        <Header />
        <div className=&quot;max-w-4xl mx-auto px-4 py-16 text-center&quot;>
          <p className=&quot;text-slate-400&quot;>Please sign in to view your tokens.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className=&quot;min-h-screen bg-slate-950&quot;>
        <Header />
        <div className=&quot;max-w-4xl mx-auto px-4 py-16 text-center text-slate-400&quot;>Loading...</div>
      </div>
    )
  }

  const userLevel = calculateUserLevel(tokens)
  const tokensToNext = getTokensToNextLevel(tokens)

  // Active earn methods (actually implemented)
  const activeEarns = [
    { name: &apos;Create Post&apos;, amount: 50, status: &apos;active&apos; as const, limit: &apos;10/day&apos; },
    { name: &apos;Create Comment&apos;, amount: 10, status: &apos;active&apos; as const, limit: &apos;50/day&apos; },
    { name: &apos;Receive Upvote&apos;, amount: 5, status: &apos;active&apos; as const, limit: &apos;Unlimited&apos; },
    { name: &apos;Receive Downvote&apos;, amount: -3, status: &apos;active&apos; as const, limit: &apos;Unlimited&apos; },
    { name: &apos;Daily Login&apos;, amount: 20, status: &apos;active&apos; as const, limit: &apos;1/day&apos; },
    { name: &apos;First Post Bonus&apos;, amount: 100, status: &apos;active&apos; as const, limit: &apos;Once&apos; },
    { name: &apos;Quality Content Award&apos;, amount: 200, status: &apos;coming_soon&apos; as const, limit: &apos;Admin selected&apos; },
    { name: &apos;User Referral&apos;, amount: 500, status: &apos;coming_soon&apos; as const, limit: &apos;10/day&apos; },
  ]

  // Spend methods
  const spendItems = [
    { name: &apos;1-Hour Post Boost&apos;, cost: 100, status: &apos;coming_soon&apos; as const },
    { name: &apos;6-Hour Post Boost&apos;, cost: 500, status: &apos;coming_soon&apos; as const },
    { name: &apos;24-Hour Post Boost&apos;, cost: 1500, status: &apos;coming_soon&apos; as const },
    { name: &apos;Highlight Comment&apos;, cost: 50, status: &apos;coming_soon&apos; as const },
    { name: &apos;Custom Flair&apos;, cost: 500, status: &apos;coming_soon&apos; as const },
    { name: &apos;7-Day Premium Badge&apos;, cost: 1000, status: &apos;coming_soon&apos; as const },
    { name: &apos;30-Day Premium Badge&apos;, cost: 3000, status: &apos;coming_soon&apos; as const },
  ]

  return (
    <div className=&quot;min-h-screen bg-slate-950 text-slate-100&quot;>
      <Header />
      
      <div className=&quot;max-w-5xl mx-auto px-4 py-8&quot;>
        <div className=&quot;mb-8&quot;>
          <h1 className=&quot;text-3xl font-bold mb-2&quot;>💰 Tokens</h1>
          <p className=&quot;text-slate-400&quot;>Earn tokens by contributing. Spend them on special features.</p>
        </div>

        {/* Stats Row */}
        <div className=&quot;grid grid-cols-1 md:grid-cols-3 gap-4 mb-8&quot;>
          <Card className=&quot;bg-slate-900 border-slate-800&quot;>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium text-slate-400&quot;>Balance</CardTitle>
              <Coins className=&quot;h-4 w-4 text-amber-500&quot; />
            </CardHeader>
            <CardContent>
              <div className=&quot;text-2xl font-bold text-amber-400&quot;>{formatTokens(tokens)}</div>
            </CardContent>
          </Card>

          <Card className=&quot;bg-slate-900 border-slate-800&quot;>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium text-slate-400&quot;>Level</CardTitle>
              <Crown className=&quot;h-4 w-4&quot; style={{ color: getLevelColor(userLevel.level) }} />
            </CardHeader>
            <CardContent>
              <Badge style={{ backgroundColor: getLevelColor(userLevel.level), color: &apos;white&apos; }}>
                {userLevel.name}
              </Badge>
              {userLevel.level !== &apos;diamond&apos; && (
                <div className=&quot;mt-2&quot;>
                  <Progress value={userLevel.progress} className=&quot;h-1.5&quot; />
                  <p className=&quot;text-xs text-slate-500 mt-1&quot;>{formatTokens(tokensToNext)} to next level</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className=&quot;bg-slate-900 border-slate-800&quot;>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium text-slate-400&quot;>Daily Reward</CardTitle>
              <Gift className=&quot;h-4 w-4 text-emerald-500&quot; />
            </CardHeader>
            <CardContent>
              <Button onClick={claimDailyReward} size=&quot;sm&quot; className=&quot;w-full bg-emerald-600 hover:bg-emerald-700&quot;>
                <Calendar className=&quot;w-4 h-4 mr-2&quot; /> Claim +20 DDL
              </Button>
              <p className=&quot;text-xs text-slate-500 mt-2&quot;>Once per day</p>
            </CardContent>
          </Card>
        </div>

        {/* Earn & Spend */}
        <div className=&quot;grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8&quot;>
          <Card className=&quot;bg-slate-900 border-slate-800&quot;>
            <CardHeader>
              <CardTitle className=&quot;flex items-center gap-2 text-slate-100&quot;>
                <TrendingUp className=&quot;w-5 h-5 text-emerald-500&quot; />
                How to Earn
              </CardTitle>
              <CardDescription className=&quot;text-slate-400&quot;>Tokens are automatically earned for these actions</CardDescription>
            </CardHeader>
            <CardContent className=&quot;space-y-3&quot;>
              {activeEarns.map((item, i) => (
                <div key={i} className=&quot;flex justify-between items-center&quot;>
                  <div className=&quot;flex items-center gap-2&quot;>
                    {item.status === &apos;active&apos; ? (
                      <CheckCircle className=&quot;w-4 h-4 text-emerald-500&quot; />
                    ) : (
                      <Clock className=&quot;w-4 h-4 text-slate-600&quot; />
                    )}
                    <span className={`text-sm ${item.status === &apos;coming_soon&apos; ? &apos;text-slate-500&apos; : &apos;text-slate-200&apos;}`}>
                      {item.name}
                    </span>
                    {item.status === &apos;coming_soon&apos; && (
                      <Badge variant=&quot;outline&quot; className=&quot;text-xs text-slate-500 border-slate-700&quot;>Coming Soon</Badge>
                    )}
                  </div>
                  <div className=&quot;flex items-center gap-3&quot;>
                    <span className=&quot;text-xs text-slate-500&quot;>{item.limit}</span>
                    <Badge variant=&quot;outline&quot; className={item.amount > 0 ? &apos;text-emerald-400 border-emerald-800&apos; : &apos;text-red-400 border-red-800&apos;}>
                      {item.amount > 0 ? &apos;+&apos; : &apos;'}{item.amount} DDL
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className=&quot;bg-slate-900 border-slate-800&quot;>
            <CardHeader>
              <CardTitle className=&quot;flex items-center gap-2 text-slate-100&quot;>
                <Star className=&quot;w-5 h-5 text-blue-500&quot; />
                How to Spend
              </CardTitle>
              <CardDescription className=&quot;text-slate-400&quot;>Use tokens for special features</CardDescription>
            </CardHeader>
            <CardContent className=&quot;space-y-3&quot;>
              {spendItems.map((item, i) => (
                <div key={i} className=&quot;flex justify-between items-center&quot;>
                  <div className=&quot;flex items-center gap-2&quot;>
                    <Clock className=&quot;w-4 h-4 text-slate-600&quot; />
                    <span className=&quot;text-sm text-slate-500&quot;>{item.name}</span>
                    <Badge variant=&quot;outline&quot; className=&quot;text-xs text-slate-500 border-slate-700&quot;>Coming Soon</Badge>
                  </div>
                  <Badge variant=&quot;outline&quot; className=&quot;text-blue-400 border-blue-800&quot;>
                    {item.cost} DDL
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Level system note */}
        <p className=&quot;text-center text-sm text-slate-600 mt-4&quot;>
          Level benefits will be announced as new features roll out. Keep earning! 🚀
        </p>
      </div>
    </div>
  )
}
