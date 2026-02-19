import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock cheerio to resolve ES modules issue
const mock$ = jest.fn((selector: string) => {
  if (selector.includes('og:title') || selector.includes('title')) {
    return {
      attr: jest.fn(() => 'Sample Website Title'),
      text: jest.fn(() => 'Sample Website Title'),
      length: 1
    }
  }
  if (selector.includes('og:description') || selector.includes('description')) {
    return {
      attr: jest.fn(() => 'Sample description'),
      text: jest.fn(() => 'Sample description'),
      length: 1
    }
  }
  if (selector.includes('og:image') || selector.includes('image')) {
    return {
      attr: jest.fn(() => 'https://example.com/image.jpg'),
      text: jest.fn(() => ''),
      length: 1
    }
  }
  if (selector.includes('og:site_name') || selector.includes('site')) {
    return {
      attr: jest.fn(() => 'Example.com'),
      text: jest.fn(() => 'Example.com'),
      length: 1
    }
  }
  return {
    attr: jest.fn(() => null),
    text: jest.fn(() => ''),
    length: 0
  }
})

jest.mock('cheerio', () => ({
  __esModule: true,
  default: {
    load: jest.fn(() => mock$)
  },
  load: jest.fn(() => mock$)
}))

// Mock link preview utilities
jest.mock('@/lib/utils/linkPreview', () => ({
  fetchLinkPreview: jest.fn(),
  validateUrl: jest.fn(),
  sanitizePreview: jest.fn()
}))

// Mock Supabase for caching
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      upsert: jest.fn()
    }))
  }))
}))

describe.skip('POST /api/link-preview', () => {
  let mockFetchLinkPreview: any
  let mockValidateUrl: any
  let mockSanitizePreview: any
  let mockSupabase: any

  beforeEach(() => {
    const { fetchLinkPreview, validateUrl, sanitizePreview } = require('@/lib/utils/linkPreview')
    const { createServerClient } = require('@/lib/supabase/server')

    mockFetchLinkPreview = fetchLinkPreview
    mockValidateUrl = validateUrl
    mockSanitizePreview = sanitizePreview
    mockSupabase = createServerClient()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Success Cases', () => {
    it('should generate link preview for valid URL', async () => {
      // Arrange
      const mockPreview = {
        title: 'Example Site',
        description: 'This is an example website',
        image: 'https://example.com/image.jpg',
        url: 'https://example.com',
        siteName: 'Example'
      }

      mockValidateUrl.mockReturnValueOnce({ valid: true })
      mockFetchLinkPreview.mockResolvedValueOnce(mockPreview)
      mockSanitizePreview.mockReturnValueOnce(mockPreview)

      // Mock cache miss
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // Not found
      })

      // Mock cache save
      mockSupabase.from().upsert.mockResolvedValueOnce({
        data: [mockPreview],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        preview: mockPreview
      })
      expect(mockValidateUrl).toHaveBeenCalledWith('https://example.com')
      expect(mockFetchLinkPreview).toHaveBeenCalledWith('https://example.com')
      expect(mockSanitizePreview).toHaveBeenCalledWith(mockPreview)
    })

    it('should return cached preview if available', async () => {
      // Arrange
      const cachedPreview = {
        title: 'Cached Example',
        description: 'This is from cache',
        image: 'https://example.com/cached.jpg',
        url: 'https://example.com',
        siteName: 'Example',
        cached_at: new Date().toISOString()
      }

      mockValidateUrl.mockReturnValueOnce({ valid: true })

      // Mock cache hit
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: cachedPreview,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        preview: cachedPreview
      })
      expect(mockFetchLinkPreview).not.toHaveBeenCalled()
    })

    it('should handle YouTube URL with video metadata', async () => {
      // Arrange
      const youtubePreview = {
        title: 'Example YouTube Video',
        description: 'Video description',
        image: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
        url: 'https://www.youtube.com/watch?v=abc123',
        siteName: 'YouTube',
        type: 'video',
        duration: 300,
        author: 'Channel Name'
      }

      mockValidateUrl.mockReturnValueOnce({ valid: true })
      mockFetchLinkPreview.mockResolvedValueOnce(youtubePreview)
      mockSanitizePreview.mockReturnValueOnce(youtubePreview)

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })
      mockSupabase.from().upsert.mockResolvedValueOnce({
        data: [youtubePreview],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://www.youtube.com/watch?v=abc123'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.preview.type).toBe('video')
      expect(responseData.preview.duration).toBe(300)
      expect(responseData.preview.author).toBe('Channel Name')
    })

    it('should handle Twitter URL with tweet metadata', async () => {
      // Arrange
      const twitterPreview = {
        title: '@user tweet',
        description: 'This is a tweet content',
        image: 'https://pbs.twimg.com/media/example.jpg',
        url: 'https://twitter.com/user/status/123456789',
        siteName: 'Twitter',
        type: 'tweet',
        author: '@user',
        publishedTime: new Date().toISOString()
      }

      mockValidateUrl.mockReturnValueOnce({ valid: true })
      mockFetchLinkPreview.mockResolvedValueOnce(twitterPreview)
      mockSanitizePreview.mockReturnValueOnce(twitterPreview)

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })
      mockSupabase.from().upsert.mockResolvedValueOnce({
        data: [twitterPreview],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://twitter.com/user/status/123456789'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.preview.type).toBe('tweet')
      expect(responseData.preview.author).toBe('@user')
    })

    it('should handle refresh parameter to bypass cache', async () => {
      // Arrange
      const freshPreview = {
        title: 'Fresh Preview',
        description: 'This is fresh content',
        image: 'https://example.com/fresh.jpg',
        url: 'https://example.com',
        siteName: 'Example'
      }

      mockValidateUrl.mockReturnValueOnce({ valid: true })
      mockFetchLinkPreview.mockResolvedValueOnce(freshPreview)
      mockSanitizePreview.mockReturnValueOnce(freshPreview)
      mockSupabase.from().upsert.mockResolvedValueOnce({
        data: [freshPreview],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview?refresh=true', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com'
        })
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockFetchLinkPreview).toHaveBeenCalledWith('https://example.com')
      // Should not check cache when refresh=true
      expect(mockSupabase.from().select).not.toHaveBeenCalled()
    })
  })

  describe('Validation Errors', () => {
    it('should return 400 for missing URL', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({})
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('URL이 필요합니다')
    })

    it('should return 400 for invalid URL format', async () => {
      // Arrange
      mockValidateUrl.mockReturnValueOnce({
        valid: false,
        error: '올바르지 않은 URL 형식입니다'
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'invalid-url'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('올바르지 않은 URL 형식입니다')
    })

    it('should return 400 for blocked domain', async () => {
      // Arrange
      mockValidateUrl.mockReturnValueOnce({
        valid: false,
        error: '차단된 도메인입니다'
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://malicious-site.com'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('차단된 도메인입니다')
    })

    it('should return 400 for private IP addresses', async () => {
      // Arrange
      mockValidateUrl.mockReturnValueOnce({
        valid: false,
        error: '내부 네트워크 주소는 허용되지 않습니다'
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'http://192.168.1.1'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('내부 네트워크 주소는 허용되지 않습니다')
    })
  })

  describe('Fetch Errors', () => {
    it('should return 404 for URL not found', async () => {
      // Arrange
      mockValidateUrl.mockReturnValueOnce({ valid: true })
      mockFetchLinkPreview.mockRejectedValueOnce(new Error('404: Not Found'))

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com/nonexistent'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(responseData.error).toContain('페이지를 찾을 수 없습니다')
    })

    it('should return 408 for request timeout', async () => {
      // Arrange
      mockValidateUrl.mockReturnValueOnce({ valid: true })
      mockFetchLinkPreview.mockRejectedValueOnce(new Error('Request timeout'))

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://slow-site.com'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(408)
      expect(responseData.error).toContain('요청 시간이 초과되었습니다')
    })

    it('should return 403 for access denied', async () => {
      // Arrange
      mockValidateUrl.mockReturnValueOnce({ valid: true })
      mockFetchLinkPreview.mockRejectedValueOnce(new Error('403: Forbidden'))

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://private-site.com'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(responseData.error).toContain('접근이 거부되었습니다')
    })

    it('should handle malformed HTML gracefully', async () => {
      // Arrange
      const fallbackPreview = {
        title: 'example.com',
        description: '',
        image: null,
        url: 'https://example.com',
        siteName: 'example.com'
      }

      mockValidateUrl.mockReturnValueOnce({ valid: true })
      mockFetchLinkPreview.mockResolvedValueOnce(fallbackPreview)
      mockSanitizePreview.mockReturnValueOnce(fallbackPreview)

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })
      mockSupabase.from().upsert.mockResolvedValueOnce({
        data: [fallbackPreview],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.preview.title).toBe('example.com')
      expect(responseData.preview.description).toBe('')
    })
  })

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // Arrange - Simulate rate limit check
      mockValidateUrl.mockReturnValueOnce({ valid: true })

      // Simulate multiple requests quickly
      const requests = Array.from({ length: 31 }, () => {
        return new NextRequest('http://localhost:3000/api/link-preview', {
          method: 'POST',
          body: JSON.stringify({
            url: 'https://example.com'
          })
        })
      })

      // Act
      const responses = await Promise.all(requests.map(req => POST(req)))
      const lastResponse = responses[30]

      // Assert
      expect(lastResponse.status).toBe(429)
      const responseData = await lastResponse.json()
      expect(responseData.error).toContain('요청 한도를 초과했습니다')
    })
  })

  describe('Request Format Errors', () => {
    it('should return 400 for invalid JSON', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: 'invalid json'
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(400)
    })

    it('should return 400 for empty body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: ''
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(400)
    })

    it('should return 405 for GET request', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'GET'
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(405)
    })
  })

  describe('Cache Performance', () => {
    it('should handle cache database errors gracefully', async () => {
      // Arrange
      const preview = {
        title: 'Test Site',
        description: 'Test description',
        image: 'https://example.com/image.jpg',
        url: 'https://example.com',
        siteName: 'Example'
      }

      mockValidateUrl.mockReturnValueOnce({ valid: true })
      mockFetchLinkPreview.mockResolvedValueOnce(preview)
      mockSanitizePreview.mockReturnValueOnce(preview)

      // Mock cache error
      mockSupabase.from().select().eq().single.mockRejectedValueOnce(new Error('Cache error'))
      mockSupabase.from().upsert.mockRejectedValueOnce(new Error('Cache save error'))

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com'
        })
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.preview).toEqual(preview)
      // Should still fetch and return preview despite cache errors
    })
  })
})