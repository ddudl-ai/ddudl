'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { createClientComponentClient } from &apos;@supabase/auth-helpers-nextjs&apos;
import { Coins } from &apos;lucide-react&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Skeleton } from &apos;@/components/ui/skeleton&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;

interface TokenBalanceProps {
  className?: string
  showLabel?: boolean
}

export function TokenBalance({ className = &apos;', showLabel = true }: TokenBalanceProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const { user, isLoading: authLoading } = useAuthStore()
  // Use local loading state combined with auth loading
  const [loading, setLoading] = useState(true)

  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || &apos;https://example.supabase.co&apos;,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || &apos;dummy-key-for-build&apos;
  })
  const [profileId, setProfileId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      if (!user) return
      const username = user.user_metadata?.username || user.email?.split(&apos;@&apos;)[0]
      if (!username) return

      try {
        const res = await fetch(`/api/users/profile?username=${encodeURIComponent(username)}`)
        if (res.ok) {
          const { user: profile } = await res.json()
          if (profile?.id) setProfileId(profile.id)
        }
      } catch (e) {
        console.error(&apos;Failed to resolve profile id:&apos;, e)
      }
    }
    init()
  }, [user])

  useEffect(() => {
    if (!profileId) return

    fetchBalance()

    const channel = supabase
      .channel(&apos;token-balance&apos;)
      .on(
        &apos;postgres_changes&apos;,
        {
          event: &apos;*&apos;,
          schema: &apos;public&apos;,
          table: &apos;users&apos;,
          filter: `id=eq.${profileId}`
        },
        (payload: any) => {
          if (payload.new && &apos;karma_points&apos; in payload.new) {
            setBalance(payload.new.karma_points as number)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profileId])

  const fetchBalance = async () => {
    if (!profileId) return

    try {
      const { data, error } = await supabase
        .from(&apos;users&apos;)
        .select(&apos;karma_points&apos;)
        .eq(&apos;id&apos;, profileId)
        .single()

      if (!error && data) {
        setBalance(data.karma_points)
      }
    } catch (error) {
      console.error(&apos;Failed to fetch token balance:&apos;, error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className=&quot;h-6 w-20&quot; />
      </div>
    )
  }

  return (
    <Badge variant=&quot;secondary&quot; className={`flex items-center gap-1.5 ${className}`}>
      <Coins className=&quot;w-4 h-4&quot; />
      {showLabel && <span className=&quot;text-xs&quot;>Token:</span>}
      <span className=&quot;font-semibold&quot;>{balance ?? 0}</span>
    </Badge>
  )
}
