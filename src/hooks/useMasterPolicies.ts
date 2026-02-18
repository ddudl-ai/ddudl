import { useState, useEffect, useCallback } from 'react'
import type { ModerationSettings, ChannelPolicy, PolicyConflict, CreatePolicyRequest, UpdateModerationSettingsRequest } from '@/types'

interface UseMasterPoliciesProps {
  channelId: string
}

interface PoliciesData {
  settings: ModerationSettings | null
  policies: ChannelPolicy[]
  conflicts: PolicyConflict[]
  master: {
    role: string
    permissions: Record<string, boolean>
  } | null
}

export function useMasterPolicies({ channelId }: UseMasterPoliciesProps) {
  const [data, setData] = useState<PoliciesData>({
    settings: null,
    policies: [],
    conflicts: [],
    master: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/master/policies?channel_id=${channelId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch policies')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [channelId])

  const updateModerationSettings = async (settings: Partial<ModerationSettings>) => {
    try {
      const request: UpdateModerationSettingsRequest = {
        channelId,
        settings
      }

      const response = await fetch('/api/master/policies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      const updatedSettings = await response.json()
      
      setData(prev => ({
        ...prev,
        settings: updatedSettings
      }))

      return updatedSettings
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update settings')
    }
  }

  const createPolicy = async (policyData: Omit<CreatePolicyRequest, 'channelId'>) => {
    try {
      const request: CreatePolicyRequest = {
        ...policyData,
        channelId
      }

      const response = await fetch('/api/master/policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error('Failed to create policy')
      }

      const newPolicy = await response.json()
      
      setData(prev => ({
        ...prev,
        policies: [...prev.policies, newPolicy]
      }))

      return newPolicy
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create policy')
    }
  }

  const deletePolicy = async (policyId: string) => {
    try {
      const response = await fetch(`/api/master/policies?id=${policyId}&channel_id=${channelId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete policy')
      }

      setData(prev => ({
        ...prev,
        policies: prev.policies.filter(p => p.id !== policyId)
      }))

      return true
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete policy')
    }
  }

  useEffect(() => {
    fetchPolicies()
  }, [fetchPolicies])

  return {
    ...data,
    loading,
    error,
    refetch: fetchPolicies,
    updateModerationSettings,
    createPolicy,
    deletePolicy
  }
}