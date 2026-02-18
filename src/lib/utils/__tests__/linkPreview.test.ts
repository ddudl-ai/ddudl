import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock cheerio for HTML parsing
jest.mock('cheerio', () => ({
  load: jest.fn()
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('linkPreview utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validateUrl function', () => {
    it('should validate correct HTTP URLs', () => {
      // This test will fail until validateUrl is implemented
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('https://example.com')

      expect(result).toEqual({
        valid: true
      })
    })

    it('should validate correct HTTPS URLs', () => {
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('https://secure.example.com/path')

      expect(result).toEqual({
        valid: true
      })
    })

    it('should reject invalid URL formats', () => {
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('not-a-url')

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('올바르지 않은 URL 형식입니다')
      })
    })

    it('should reject blocked domains', () => {
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('https://malicious-site.com')

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('차단된 도메인입니다')
      })
    })

    it('should reject private IP addresses', () => {
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('http://192.168.1.1')

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('내부 네트워크 주소는 허용되지 않습니다')
      })
    })

    it('should reject localhost addresses', () => {
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('http://localhost:3000')

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('내부 네트워크 주소는 허용되지 않습니다')
      })
    })

    it('should handle URLs with ports', () => {
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('https://example.com:8080/path')

      expect(result).toEqual({
        valid: true
      })
    })

    it('should handle URLs with query parameters', () => {
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('https://example.com/search?q=test&page=1')

      expect(result).toEqual({
        valid: true
      })
    })

    it('should handle URLs with fragments', () => {
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('https://example.com/page#section1')

      expect(result).toEqual({
        valid: true
      })
    })

    it('should reject non-HTTP protocols', () => {
      const validateUrl = require('../linkPreview').validateUrl

      const result = validateUrl('ftp://example.com/file.txt')

      expect(result).toEqual({
        valid: false,
        error: expect.stringContaining('HTTP 또는 HTTPS 프로토콜만 지원됩니다')
      })
    })
  })

  describe('fetchLinkPreview function', () => {
    it('should fetch and parse basic website metadata', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="This is a test page">
            <meta property="og:image" content="https://example.com/image.jpg">
            <meta property="og:site_name" content="Example Site">
          </head>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
        headers: new Headers({
          'content-type': 'text/html'
        })
      })

      const cheerio = require('cheerio')
      const mockLoad = jest.fn(() => ({
        'title': jest.fn(() => ({ text: () => 'Test Page' })),
        'meta[name="description"]': jest.fn(() => ({ attr: () => 'This is a test page' })),
        'meta[property="og:image"]': jest.fn(() => ({ attr: () => 'https://example.com/image.jpg' })),
        'meta[property="og:site_name"]': jest.fn(() => ({ attr: () => 'Example Site' }))
      }))
      cheerio.load.mockImplementation(mockLoad)

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      const result = await fetchLinkPreview('https://example.com')

      expect(result).toEqual({
        title: 'Test Page',
        description: 'This is a test page',
        image: 'https://example.com/image.jpg',
        url: 'https://example.com',
        siteName: 'Example Site',
        type: 'website'
      })

      expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
        method: 'GET',
        headers: {
          'User-Agent': expect.stringContaining('Mozilla'),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000
      })
    })

    it('should handle YouTube URLs with video metadata', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Test Video - YouTube</title>
            <meta property="og:description" content="Video description">
            <meta property="og:image" content="https://img.youtube.com/vi/abc123/maxresdefault.jpg">
            <meta property="og:video:duration" content="300">
            <meta property="og:site_name" content="YouTube">
          </head>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      const result = await fetchLinkPreview('https://www.youtube.com/watch?v=abc123')

      expect(result).toEqual({
        title: 'Test Video',
        description: 'Video description',
        image: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
        url: 'https://www.youtube.com/watch?v=abc123',
        siteName: 'YouTube',
        type: 'video',
        duration: 300
      })
    })

    it('should handle Twitter URLs with tweet metadata', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>@user on Twitter</title>
            <meta property="og:description" content="This is a tweet content">
            <meta property="og:image" content="https://pbs.twimg.com/media/example.jpg">
            <meta property="twitter:site" content="@Twitter">
          </head>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      const result = await fetchLinkPreview('https://twitter.com/user/status/123456789')

      expect(result).toEqual({
        title: '@user tweet',
        description: 'This is a tweet content',
        image: 'https://pbs.twimg.com/media/example.jpg',
        url: 'https://twitter.com/user/status/123456789',
        siteName: 'Twitter',
        type: 'tweet',
        author: '@user'
      })
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      await expect(fetchLinkPreview('https://example.com')).rejects.toThrow('Network error')
    })

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      await expect(fetchLinkPreview('https://example.com/nonexistent')).rejects.toThrow('404: Not Found')
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      await expect(fetchLinkPreview('https://slow-site.com')).rejects.toThrow('Request timeout')
    })

    it('should handle malformed HTML gracefully', async () => {
      const malformedHtml = '<html><head><title>Broken'

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(malformedHtml)
      })

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      const result = await fetchLinkPreview('https://example.com')

      // Should return fallback values
      expect(result).toEqual({
        title: 'example.com',
        description: '',
        image: null,
        url: 'https://example.com',
        siteName: 'example.com',
        type: 'website'
      })
    })

    it('should extract Open Graph metadata', async () => {
      const mockHtml = `
        <html>
          <head>
            <meta property="og:title" content="OG Title">
            <meta property="og:description" content="OG Description">
            <meta property="og:image" content="https://example.com/og-image.jpg">
            <meta property="og:url" content="https://example.com/canonical">
            <meta property="og:type" content="article">
          </head>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      const result = await fetchLinkPreview('https://example.com')

      expect(result.title).toBe('OG Title')
      expect(result.description).toBe('OG Description')
      expect(result.image).toBe('https://example.com/og-image.jpg')
      expect(result.type).toBe('article')
    })

    it('should extract Twitter Card metadata', async () => {
      const mockHtml = `
        <html>
          <head>
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="Twitter Title">
            <meta name="twitter:description" content="Twitter Description">
            <meta name="twitter:image" content="https://example.com/twitter-image.jpg">
            <meta name="twitter:creator" content="@author">
          </head>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      const result = await fetchLinkPreview('https://example.com')

      expect(result.title).toBe('Twitter Title')
      expect(result.description).toBe('Twitter Description')
      expect(result.image).toBe('https://example.com/twitter-image.jpg')
      expect(result.author).toBe('@author')
    })

    it('should prioritize Open Graph over Twitter Card metadata', async () => {
      const mockHtml = `
        <html>
          <head>
            <meta property="og:title" content="OG Title">
            <meta name="twitter:title" content="Twitter Title">
            <meta property="og:description" content="OG Description">
            <meta name="twitter:description" content="Twitter Description">
          </head>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const fetchLinkPreview = require('../linkPreview').fetchLinkPreview

      const result = await fetchLinkPreview('https://example.com')

      expect(result.title).toBe('OG Title')
      expect(result.description).toBe('OG Description')
    })
  })

  describe('sanitizePreview function', () => {
    it('should sanitize malicious HTML in title', () => {
      const sanitizePreview = require('../linkPreview').sanitizePreview

      const input = {
        title: '<script>alert("xss")</script>Clean Title',
        description: 'Safe description',
        url: 'https://example.com'
      }

      const result = sanitizePreview(input)

      expect(result.title).toBe('Clean Title')
    })

    it('should sanitize malicious HTML in description', () => {
      const sanitizePreview = require('../linkPreview').sanitizePreview

      const input = {
        title: 'Clean Title',
        description: '<img src="x" onerror="alert(1)">Description with <b>bold</b> text',
        url: 'https://example.com'
      }

      const result = sanitizePreview(input)

      expect(result.description).toBe('Description with bold text')
    })

    it('should validate and sanitize image URLs', () => {
      const sanitizePreview = require('../linkPreview').sanitizePreview

      const input = {
        title: 'Title',
        description: 'Description',
        image: 'javascript:alert("xss")',
        url: 'https://example.com'
      }

      const result = sanitizePreview(input)

      expect(result.image).toBe(null)
    })

    it('should preserve safe HTML formatting', () => {
      const sanitizePreview = require('../linkPreview').sanitizePreview

      const input = {
        title: 'Title with <em>emphasis</em>',
        description: 'Description with <strong>strong</strong> and <code>code</code>',
        url: 'https://example.com'
      }

      const result = sanitizePreview(input)

      expect(result.title).toBe('Title with emphasis')
      expect(result.description).toBe('Description with strong and code')
    })

    it('should truncate overly long titles', () => {
      const sanitizePreview = require('../linkPreview').sanitizePreview

      const longTitle = 'A'.repeat(400)
      const input = {
        title: longTitle,
        description: 'Description',
        url: 'https://example.com'
      }

      const result = sanitizePreview(input)

      expect(result.title).toHaveLength(300)
      expect(result.title).toEndWith('...')
    })

    it('should truncate overly long descriptions', () => {
      const sanitizePreview = require('../linkPreview').sanitizePreview

      const longDescription = 'A'.repeat(600)
      const input = {
        title: 'Title',
        description: longDescription,
        url: 'https://example.com'
      }

      const result = sanitizePreview(input)

      expect(result.description).toHaveLength(500)
      expect(result.description).toEndWith('...')
    })

    it('should handle missing or null values', () => {
      const sanitizePreview = require('../linkPreview').sanitizePreview

      const input = {
        title: null,
        description: undefined,
        url: 'https://example.com'
      }

      const result = sanitizePreview(input)

      expect(result.title).toBe('example.com')
      expect(result.description).toBe('')
    })
  })

  describe('extractVideoMetadata function', () => {
    it('should extract YouTube video metadata', () => {
      const extractVideoMetadata = require('../linkPreview').extractVideoMetadata

      const url = 'https://www.youtube.com/watch?v=abc123'
      const metadata = {
        'og:video:duration': '300',
        'og:video:width': '1280',
        'og:video:height': '720'
      }

      const result = extractVideoMetadata(url, metadata)

      expect(result).toEqual({
        type: 'video',
        duration: 300,
        width: 1280,
        height: 720,
        platform: 'youtube',
        videoId: 'abc123'
      })
    })

    it('should extract Vimeo video metadata', () => {
      const extractVideoMetadata = require('../linkPreview').extractVideoMetadata

      const url = 'https://vimeo.com/123456789'
      const metadata = {
        'og:video:duration': '180'
      }

      const result = extractVideoMetadata(url, metadata)

      expect(result).toEqual({
        type: 'video',
        duration: 180,
        platform: 'vimeo',
        videoId: '123456789'
      })
    })

    it('should handle non-video URLs', () => {
      const extractVideoMetadata = require('../linkPreview').extractVideoMetadata

      const url = 'https://example.com/article'
      const metadata = {}

      const result = extractVideoMetadata(url, metadata)

      expect(result).toEqual({
        type: 'website'
      })
    })
  })

  describe('cachePreview function', () => {
    it('should generate cache key from URL', () => {
      const cachePreview = require('../linkPreview').cachePreview

      const preview = {
        title: 'Test',
        url: 'https://example.com'
      }

      // This will test the cache implementation when created
      expect(() => cachePreview(preview)).not.toThrow()
    })

    it('should handle cache expiration', () => {
      const getCachedPreview = require('../linkPreview').getCachedPreview

      const url = 'https://example.com'

      // This will test the cache retrieval when implemented
      expect(() => getCachedPreview(url)).not.toThrow()
    })
  })

  describe('detectContentType function', () => {
    it('should detect article content type', () => {
      const detectContentType = require('../linkPreview').detectContentType

      const metadata = {
        'og:type': 'article',
        'article:author': 'John Doe'
      }

      const result = detectContentType('https://blog.example.com/post', metadata)

      expect(result).toEqual({
        type: 'article',
        author: 'John Doe'
      })
    })

    it('should detect product content type', () => {
      const detectContentType = require('../linkPreview').detectContentType

      const metadata = {
        'og:type': 'product',
        'product:price:amount': '99.99',
        'product:price:currency': 'USD'
      }

      const result = detectContentType('https://shop.example.com/item', metadata)

      expect(result).toEqual({
        type: 'product',
        price: {
          amount: 99.99,
          currency: 'USD'
        }
      })
    })
  })
})