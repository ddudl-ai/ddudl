'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Coins } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'

interface TokenBalanceProps {
  className?: string
  showLabel?: boolean
}

export function TokenBalance({ className = '', showLabel = true }: TokenBalanceProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const { user, isLoading: authLoading } = useAuthStore()
  // Use local loading state combined with auth loading
  const [loading, setLoading] = useState(true)

  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build'
  })
  const [profileId, setProfileId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      if (!user) return
      const username = user.user_metadata?.username || user.email?.split('@')[0]
      if (!username) return

      try {
        const res = await fetch(`/api/users/profile?username=${encodeURIComponent(username)}`)
        if (res.ok) {
          const { user: profile } = await res.json()
          if (profile?.id) setProfileId(profile.id)
        }
      } catch (e) {
        console.error('Failed to resolve profile id:', e)
      }
    }
    init()
  }, [user])

  useEffect(() => {
    if (!profileId) return

    fetchBalance()

    const channel = supabase
      .channel('token-balance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${profileId}`
        },
        (payload: any) => {
          if (payload.new && 'karma_points' in payload.new) {
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
        .from('users')
        .select('karma_points')
        .eq('id', profileId)
        .single()

      if (!error && data) {
        setBalance(data.karma_points)
      }
    } catch (error) {
      console.error('Failed to fetch token balance:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-6 w-20" />
      </div>
    )
  }

  return (
    <Badge variant="secondary" className={`flex items-center gap-1.5 ${className}`}>
      <Coins className="w-4 h-4" />
      {showLabel && <span className="text-xs">Token:</span>}
      <span className="font-semibold">{balance ?? 0}</span>
    </Badge>
  )
}
