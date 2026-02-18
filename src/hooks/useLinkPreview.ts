// T019: Implementation of useLinkPreview hook
// Following TDD GREEN phase - making tests pass

import { useState, useCallback, useRef, useEffect } from 'react'
import type { LinkPreviewData } from '../types/forms'

export interface UseLinkPreviewOptions {
  autoPreview?: boolean
  debounceMs?: number
  cacheTTL?: number
  maxRetries?: number
}

export interface UseLinkPreviewReturn {
  preview: LinkPreviewData | null
  loading: boolean
  error: string | null
  url: string
  detectUrls: (text: string) => string[]
  generatePreview: (url: string) => Promise<void>
  clearPreview: () => void
  updatePreview: (updates: Partial<LinkPreviewData>) => void
  abort: () => void
  onTextChange: (text: string) => void
  clearCache: () => void
}

interface CacheEntry {
  data: LinkPreviewData
  timestamp: number
}

const DEFAULT_DEBOUNCE_MS = 500
const DEFAULT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const DEFAULT_MAX_RETRIES = 2

// URL detection regex
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g

export function useLinkPreview(options: UseLinkPreviewOptions = {}): UseLinkPreviewReturn {
  const {
    autoPreview = false,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    cacheTTL = DEFAULT_CACHE_TTL,
    maxRetries = DEFAULT_MAX_RETRIES
  } = options

  const [preview, setPreview] = useState<LinkPreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [url, setUrl] = useState('')

  const cache = useRef<Map<string, CacheEntry>>(new Map())
  const abortController = useRef<AbortController | null>(null)
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  const detectUrls = useCallback((text: string): string[] => {
    const matches = text.match(URL_REGEX)
    if (!matches) return []

    // Remove duplicates and return
    return Array.from(new Set(matches))
  }, [])

  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }

  const isCacheValid = (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < cacheTTL
  }

  const generatePreviewWithRetry = async (targetUrl: string, retryCount = 0): Promise<LinkPreviewData> => {
    try {
      abortController.current = new AbortController()

      const response = await fetch('/api/link-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: targetUrl }),
        signal: abortController.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      return {
        url: targetUrl,
        title: data.title,
        description: data.description,
        image: data.image,
        siteName: data.siteName,
        favicon: data.favicon
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      if (errorMessage.includes('Aborted')) {
        throw err
      }

      if (retryCount < maxRetries && !errorMessage.includes('404')) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return generatePreviewWithRetry(targetUrl, retryCount + 1)
      }

      throw new Error(errorMessage)
    }
  }

  const generatePreview = useCallback(async (targetUrl: string) => {
    if (!isValidUrl(targetUrl)) {
      setError('Invalid URL format')
      return
    }

    // Check cache first
    const cacheKey = targetUrl
    const cached = cache.current.get(cacheKey)
    if (cached && isCacheValid(cached)) {
      setPreview(cached.data)
      setUrl(targetUrl)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setUrl(targetUrl)

    try {
      const previewData = await generatePreviewWithRetry(targetUrl)

      // Cache the result
      cache.current.set(cacheKey, {
        data: previewData,
        timestamp: Date.now()
      })

      setPreview(previewData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview'
      setError(errorMessage)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [maxRetries, cacheTTL])

  const clearPreview = useCallback(() => {
    setPreview(null)
    setError(null)
    setUrl('')
  }, [])

  const updatePreview = useCallback((updates: Partial<LinkPreviewData>) => {
    setPreview(prev => {
      if (!prev) return null
      return { ...prev, ...updates }
    })
  }, [])

  const abort = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
    setLoading(false)
  }, [])

  const clearCache = useCallback(() => {
    cache.current.clear()
  }, [])

  const onTextChange = useCallback((text: string) => {
    if (!autoPreview) return

    // Clear existing debounce
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      const urls = detectUrls(text)
      if (urls.length > 0) {
        // Generate preview for the first URL found
        generatePreview(urls[0])
      } else {
        clearPreview()
      }
    }, debounceMs)
  }, [autoPreview, debounceMs, detectUrls, generatePreview, clearPreview])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])

  return {
    preview,
    loading,
    error,
    url,
    detectUrls,
    generatePreview,
    clearPreview,
    updatePreview,
    abort,
    onTextChange,
    clearCache
  }
}