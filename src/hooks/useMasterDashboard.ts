import { useState, useEffect, useCallback } from 'react'
import type { MasterDashboardStats } from '@/types'

interface UseMasterDashboardProps {
  channelId: string
  period?: '24h' | '7d' | '30d'
}

export function useMasterDashboard({ channelId, period = '24h' }: UseMasterDashboardProps) {
  const [stats, setStats] = useState<MasterDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/master/dashboard?channel_id=${channelId}&period=${period}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [channelId, period])

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchDashboardStats
  }
}