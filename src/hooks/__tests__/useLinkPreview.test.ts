// T011: Unit test for useLinkPreview hook - TDD Phase
// This test MUST FAIL before implementation

import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinkPreview } from '../useLinkPreview'

describe('useLinkPreview', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useLinkPreview())

      expect(result.current.preview).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.url).toBe('')
    })
  })

  describe('URL Detection', () => {
    it('should detect URLs in text', () => {
      const { result } = renderHook(() => useLinkPreview())

      const text = 'Check out this link: https://example.com/article'

      act(() => {
        const urls = result.current.detectUrls(text)
        expect(urls).toEqual(['https://example.com/article'])
      })
    })

    it('should detect multiple URLs in text', () => {
      const { result } = renderHook(() => useLinkPreview())

      const text = 'First link: https://example.com and second: https://google.com'

      act(() => {
        const urls = result.current.detectUrls(text)
        expect(urls).toEqual([
          'https://example.com',
          'https://google.com'
        ])
      })
    })

    it('should detect YouTube URLs', () => {
      const { result } = renderHook(() => useLinkPreview())

      const text = 'Watch this: https://www.youtube.com/watch?v=dQw4w9WgXcQ'

      act(() => {
        const urls = result.current.detectUrls(text)
        expect(urls).toEqual(['https://www.youtube.com/watch?v=dQw4w9WgXcQ'])
      })

      const shortUrl = 'Short link: https://youtu.be/dQw4w9WgXcQ'

      act(() => {
        const urls = result.current.detectUrls(shortUrl)
        expect(urls).toEqual(['https://youtu.be/dQw4w9WgXcQ'])
      })
    })

    it('should ignore invalid URLs', () => {
      const { result } = renderHook(() => useLinkPreview())

      const text = 'Not a URL: example.com or just text'

      act(() => {
        const urls = result.current.detectUrls(text)
        expect(urls).toEqual([])
      })
    })

    it('should handle URLs with query parameters', () => {
      const { result } = renderHook(() => useLinkPreview())

      const text = 'Search: https://example.com/search?q=test&page=1'

      act(() => {
        const urls = result.current.detectUrls(text)
        expect(urls).toEqual(['https://example.com/search?q=test&page=1'])
      })
    })
  })

  describe('Preview Generation', () => {
    it('should generate preview for valid URL', async () => {
      const { result } = renderHook(() => useLinkPreview())

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Example Article',
          description: 'This is an example article description',
          image: 'https://example.com/image.jpg',
          siteName: 'Example.com',
          favicon: 'https://example.com/favicon.ico'
        })
      })

      await act(async () => {
        await result.current.generatePreview('https://example.com/article')
      })

      expect(result.current.preview).toEqual({
        title: 'Example Article',
        description: 'This is an example article description',
        image: 'https://example.com/image.jpg',
        siteName: 'Example.com',
        favicon: 'https://example.com/favicon.ico',
        url: 'https://example.com/article'
      })
    })

    it('should set loading state during preview generation', async () => {
      const { result } = renderHook(() => useLinkPreview({ maxRetries: 0 }))

      let resolveFetch!: (val: any) => void
      ;(global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => {
          resolveFetch = resolve
        })
      )

      // Start generation without awaiting it (void discards the promise)
      await act(async () => {
        void result.current.generatePreview('https://example.com')
      })

      // After act flushes, setLoading(true) should be committed
      expect(result.current.loading).toBe(true)

      // Now resolve the pending fetch
      await act(async () => {
        resolveFetch({
          ok: true,
          json: async () => ({ title: 'Test', description: 'Test description' })
        })
      })

      expect(result.current.loading).toBe(false)
    })

    it('should handle preview generation errors', async () => {
      const { result } = renderHook(() => useLinkPreview({ maxRetries: 0 }))

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'URL not found' })
      })

      await act(async () => {
        await result.current.generatePreview('https://example.com/404')
      })

      expect(result.current.preview).toBeNull()
      expect(result.current.error).toContain('URL not found')
      expect(result.current.loading).toBe(false)
    })

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useLinkPreview({ maxRetries: 0 }))

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        await result.current.generatePreview('https://example.com')
      })

      expect(result.current.preview).toBeNull()
      expect(result.current.error).toContain('Network error')
    })

    it('should handle YouTube previews specially', async () => {
      const { result } = renderHook(() => useLinkPreview())

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'YouTube Video Title',
          description: 'YouTube video description',
          image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          siteName: 'YouTube',
          favicon: 'https://www.youtube.com/favicon.ico'
        })
      })

      await act(async () => {
        await result.current.generatePreview('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      })

      expect(result.current.preview?.siteName).toBe('YouTube')
      expect(result.current.preview?.image).toContain('youtube.com')
    })
  })

  describe('Preview Cache', () => {
    it('should cache previews', async () => {
      const { result } = renderHook(() => useLinkPreview())

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Cached Article',
          description: 'This should be cached'
        })
      })

      await act(async () => {
        await result.current.generatePreview('https://example.com/cached')
      })

      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Request same URL again
      await act(async () => {
        await result.current.generatePreview('https://example.com/cached')
      })

      // Should not fetch again
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(result.current.preview?.title).toBe('Cached Article')
    })

    it('should clear cache', async () => {
      const { result } = renderHook(() => useLinkPreview())

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            title: 'First Fetch',
            description: 'First'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            title: 'Second Fetch',
            description: 'Second'
          })
        })

      await act(async () => {
        await result.current.generatePreview('https://example.com/test')
      })

      expect(result.current.preview?.title).toBe('First Fetch')

      act(() => {
        result.current.clearCache()
      })

      await act(async () => {
        await result.current.generatePreview('https://example.com/test')
      })

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result.current.preview?.title).toBe('Second Fetch')
    })

    it('should respect cache TTL', async () => {
      jest.useFakeTimers()

      const { result } = renderHook(() => useLinkPreview({ cacheTTL: 5000 })) // 5 seconds

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            title: 'Original',
            description: 'Original description'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            title: 'Updated',
            description: 'Updated description'
          })
        })

      await act(async () => {
        await result.current.generatePreview('https://example.com/ttl')
      })

      expect(result.current.preview?.title).toBe('Original')

      // Advance time but not past TTL
      jest.advanceTimersByTime(3000)

      await act(async () => {
        await result.current.generatePreview('https://example.com/ttl')
      })

      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Advance time past TTL
      jest.advanceTimersByTime(3000)

      await act(async () => {
        await result.current.generatePreview('https://example.com/ttl')
      })

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result.current.preview?.title).toBe('Updated')

      jest.useRealTimers()
    })
  })

  describe('Preview Management', () => {
    it('should clear preview', async () => {
      const { result } = renderHook(() => useLinkPreview())

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          description: 'Test description'
        })
      })

      await act(async () => {
        await result.current.generatePreview('https://example.com')
      })

      expect(result.current.preview).not.toBeNull()

      act(() => {
        result.current.clearPreview()
      })

      expect(result.current.preview).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.url).toBe('')
    })

    it('should update preview data', async () => {
      const { result } = renderHook(() => useLinkPreview())

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Original Title',
          description: 'Original description'
        })
      })

      await act(async () => {
        await result.current.generatePreview('https://example.com')
      })

      expect(result.current.preview?.title).toBe('Original Title')

      act(() => {
        result.current.updatePreview({
          title: 'Updated Title',
          description: 'Updated description'
        })
      })

      expect(result.current.preview?.title).toBe('Updated Title')
      expect(result.current.preview?.description).toBe('Updated description')
      expect(result.current.preview?.url).toBe('https://example.com')
    })
  })

  describe('Debouncing', () => {
    it('should debounce auto-preview via onTextChange', async () => {
      jest.useFakeTimers()

      const { result } = renderHook(() => useLinkPreview({ debounceMs: 500, autoPreview: true }))

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Test',
          description: 'Test'
        })
      })

      // Trigger multiple text changes (debounced via onTextChange)
      act(() => {
        result.current.onTextChange('visit https://example.com/1')
        result.current.onTextChange('visit https://example.com/2')
        result.current.onTextChange('visit https://example.com/3')
      })

      // Fetch should not have been called yet (debounce pending)
      expect(global.fetch).not.toHaveBeenCalled()

      // Advance timers past debounce
      await act(async () => {
        jest.advanceTimersByTime(500)
        await Promise.resolve()
      })

      // Should only fetch once for the last URL
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/link-preview',
        expect.objectContaining({
          body: JSON.stringify({ url: 'https://example.com/3' })
        })
      )

      jest.useRealTimers()
    })
  })

  describe('Auto Preview', () => {
    it('should auto-generate preview when URL is detected', async () => {
      const { result } = renderHook(() => useLinkPreview({ autoPreview: true }))

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Auto Preview',
          description: 'Automatically generated'
        })
      })

      act(() => {
        result.current.onTextChange('Check this out: https://example.com/auto')
      })

      // waitFor outside act - polls until debounce fires (500ms) + fetch + state update
      await waitFor(() => expect(result.current.preview).not.toBeNull(), { timeout: 2000 })

      expect(result.current.preview?.title).toBe('Auto Preview')
    })

    it('should not auto-generate when disabled', async () => {
      const { result } = renderHook(() => useLinkPreview({ autoPreview: false }))

      act(() => {
        result.current.onTextChange('Check this out: https://example.com/no-auto')
      })

      expect(global.fetch).not.toHaveBeenCalled()
      expect(result.current.preview).toBeNull()
    })

    it('should handle multiple URLs in auto-preview mode', async () => {
      const { result } = renderHook(() => useLinkPreview({ autoPreview: true }))

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'First Link',
          description: 'First link preview'
        })
      })

      act(() => {
        result.current.onTextChange('Links: https://example.com/1 and https://example.com/2')
      })

      // waitFor outside act - polls until debounce fires (500ms) + fetch + state update
      await waitFor(() => expect(result.current.preview).not.toBeNull(), { timeout: 2000 })

      // Should preview only the first URL
      expect(result.current.preview?.title).toBe('First Link')
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Abort Functionality', () => {
    it('should abort preview generation', async () => {
      jest.useFakeTimers()

      const { result } = renderHook(() => useLinkPreview({ maxRetries: 0 }))

      let abortSignal: AbortSignal | undefined

      ;(global.fetch as jest.Mock).mockImplementation((_url, options) => {
        abortSignal = options?.signal
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (abortSignal?.aborted) {
              reject(new Error('Aborted'))
            } else {
              resolve({
                ok: true,
                json: async () => ({ title: 'Test' })
              })
            }
          }, 1000)
        })
      })

      // Start preview and abort within a single act
      await act(async () => {
        result.current.generatePreview('https://example.com')
        result.current.abort()
        jest.advanceTimersByTime(1000)
        await Promise.resolve()
        await Promise.resolve() // flush extra microtasks
      })

      jest.useRealTimers()

      expect(result.current.preview).toBeNull()
      expect(result.current.error).toContain('Aborted')
    })
  })

  describe('Error Recovery', () => {
    it('should retry on failure', async () => {
      const { result } = renderHook(() => useLinkPreview({ maxRetries: 2 }))

      let attempts = 0

      ;(global.fetch as jest.Mock).mockImplementation(() => {
        attempts++
        if (attempts < 2) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            title: 'Success after retry',
            description: 'Finally worked'
          })
        })
      })

      await act(async () => {
        await result.current.generatePreview('https://example.com/retry')
      })

      expect(attempts).toBe(2)
      expect(result.current.preview?.title).toBe('Success after retry')
      expect(result.current.error).toBeNull()
    })

    it('should fail after max retries', async () => {
      const { result } = renderHook(() => useLinkPreview({ maxRetries: 2 }))

      let attempts = 0

      ;(global.fetch as jest.Mock).mockImplementation(() => {
        attempts++
        return Promise.reject(new Error('Persistent error'))
      })

      await act(async () => {
        await result.current.generatePreview('https://example.com/fail')
      })

      expect(attempts).toBe(3) // Initial + 2 retries
      expect(result.current.preview).toBeNull()
      expect(result.current.error).toContain('Persistent error')
    })
  })
})