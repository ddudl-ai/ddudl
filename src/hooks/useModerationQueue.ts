import { useState, useEffect, useCallback } from 'react'
import type { ModerationQueueItem, ModerationActionRequest } from '@/types'

interface UseModerationQueueProps {
  channelId: string
  status?: string
  limit?: number
}

export function useModerationQueue({ channelId, status = 'pending', limit = 50 }: UseModerationQueueProps) {
  const [items, setItems] = useState<ModerationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/master/moderation?channel_id=${channelId}&status=${status}&limit=${limit}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch moderation queue')
      }

      const data = await response.json()
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [channelId, status, limit])

  const processModerationAction = async (action: ModerationActionRequest) => {
    try {
      const response = await fetch('/api/master/moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
      })

      if (!response.ok) {
        throw new Error('Failed to process moderation action')
      }

      const result = await response.json()
      
      // Update local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === action.queueItemId 
            ? { 
                ...item, 
                status: action.action === 'approve' ? 'approved' : 
                       action.action === 'reject' ? 'rejected' : 'escalated', 
                resolvedAt: new Date() 
              }
            : item
        )
      )

      return result
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to process action')
    }
  }

  const assignToSelf = async (queueItemId: string) => {
    try {
      const response = await fetch('/api/master/moderation', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queueItemId, assignToSelf: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign item')
      }

      const result = await response.json()
      
      // Update local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === queueItemId 
            ? { ...item, assignedTo: result.assigned_to }
            : item
        )
      )

      return result
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to assign item')
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  return {
    items,
    loading,
    error,
    total,
    refetch: fetchQueue,
    processModerationAction,
    assignToSelf
  }
}