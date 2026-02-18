// Contract test for POST /api/link-preview - Phase 3.2 TDD Setup
// CRITICAL: This test MUST FAIL before implementation exists

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { LinkPreviewResponse, ValidationErrorResponse } from '@/types/forms'

describe('Contract: POST /api/link-preview', () => {
  describe('Request Contract', () => {
    it('should generate preview for valid URL', async () => {
      const requestBody = {
        url: 'https://example.com/article'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData: LinkPreviewResponse = await response.json()
      expect(responseData.title).toBeDefined()
      expect(responseData.description).toBeDefined()
      expect(responseData.image).toBeDefined()
      expect(responseData.siteName).toBeDefined()
      expect(responseData.favicon).toBeDefined()
      expect(responseData.title).toBe('Sample Website Title')
      expect(responseData.siteName).toBe('Example.com')
    })

    it('should generate preview for YouTube URL', async () => {
      const requestBody = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData: LinkPreviewResponse = await response.json()
      expect(responseData.title).toBe('Sample YouTube Video')
      expect(responseData.siteName).toBe('YouTube')
      expect(responseData.image).toContain('youtube.com')
      expect(responseData.favicon).toContain('youtube.com/favicon.ico')
      expect(responseData.description).toContain('YouTube video')
    })

    it('should generate preview for YouTube short URL', async () => {
      const requestBody = {
        url: 'https://youtu.be/dQw4w9WgXcQ'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData: LinkPreviewResponse = await response.json()
      expect(responseData.title).toBe('Sample YouTube Video')
      expect(responseData.siteName).toBe('YouTube')
    })

    it('should handle HTTPS URLs', async () => {
      const requestBody = {
        url: 'https://secure-site.com/page'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData: LinkPreviewResponse = await response.json()
      expect(responseData.title).toBeDefined()
      expect(responseData.description).toBeDefined()
    })

    it('should handle HTTP URLs', async () => {
      const requestBody = {
        url: 'http://legacy-site.com/page'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData: LinkPreviewResponse = await response.json()
      expect(responseData.title).toBeDefined()
    })

    it('should handle URLs with query parameters', async () => {
      const requestBody = {
        url: 'https://example.com/search?q=test&category=news'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData: LinkPreviewResponse = await response.json()
      expect(responseData.title).toBeDefined()
    })

    it('should handle URLs with fragments', async () => {
      const requestBody = {
        url: 'https://example.com/article#section-1'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData: LinkPreviewResponse = await response.json()
      expect(responseData.title).toBeDefined()
    })
  })

  describe('Validation Contract', () => {
    it('should reject request with missing URL', async () => {
      const requestBody = {}

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBe('URL is required')
      expect(errorData.code).toBe('URL_REQUIRED')
    })

    it('should reject request with invalid URL format', async () => {
      const requestBody = {
        url: 'invalid-url'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBe('Invalid URL format')
      expect(errorData.code).toBe('INVALID_URL')
    })

    it('should reject empty URL', async () => {
      const requestBody = {
        url: ''
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBe('URL is required')
      expect(errorData.code).toBe('URL_REQUIRED')
    })

    it('should reject malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"url": invalid json'
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBeDefined()
      expect(errorData.code).toBe('INVALID_JSON')
    })

    it('should handle request timeout', async () => {
      const requestBody = {
        url: 'https://example.com/timeout-test'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(408)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBe('Request timeout')
      expect(errorData.code).toBe('TIMEOUT')
    })

    it('should handle URL not found', async () => {
      const requestBody = {
        url: 'https://example.com/404-page'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(404)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBe('URL not accessible')
      expect(errorData.code).toBe('NOT_FOUND')
    })

    it('should reject URLs with unsupported protocols', async () => {
      const requestBody = {
        url: 'ftp://example.com/file.txt'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBe('Invalid URL format')
      expect(errorData.code).toBe('INVALID_URL')
    })
  })

  describe('Response Contract', () => {
    it('should return correct response structure on success', async () => {
      const requestBody = {
        url: 'https://example.com/test-response'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('application/json')

      const responseData: LinkPreviewResponse = await response.json()

      // Verify response structure matches interface
      expect(responseData).toHaveProperty('title')
      expect(responseData).toHaveProperty('description')
      expect(responseData).toHaveProperty('image')
      expect(responseData).toHaveProperty('siteName')
      expect(responseData).toHaveProperty('favicon')

      // Verify types
      expect(typeof responseData.title).toBe('string')
      expect(typeof responseData.description).toBe('string')
      expect(typeof responseData.image).toBe('string')
      expect(typeof responseData.siteName).toBe('string')
      expect(typeof responseData.favicon).toBe('string')

      // Verify constraints
      expect(responseData.title.length).toBeGreaterThan(0)
      expect(responseData.description.length).toBeGreaterThan(0)
      expect(responseData.image).toMatch(/^https?:\/\//)
      expect(responseData.favicon).toMatch(/^https?:\/\//)
      expect(responseData.siteName.length).toBeGreaterThan(0)
    })

    it('should return correct error structure on validation failure', async () => {
      const requestBody = {
        url: 'invalid-url'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(response.headers.get('Content-Type')).toContain('application/json')

      const errorData: ValidationErrorResponse = await response.json()

      // Verify error structure matches interface
      expect(errorData).toHaveProperty('error')
      expect(errorData).toHaveProperty('code')

      // Verify types
      expect(typeof errorData.error).toBe('string')
      expect(typeof errorData.code).toBe('string')
    })

    it('should handle special characters in URL', async () => {
      const requestBody = {
        url: 'https://example.com/article-한글-제목'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData: LinkPreviewResponse = await response.json()
      expect(responseData.title).toBeDefined()
      expect(responseData.description).toBeDefined()
    })

    it('should provide consistent response format across different sites', async () => {
      const urls = [
        'https://example.com/page1',
        'https://different-site.com/article',
        'https://third-site.net/content'
      ]

      for (const url of urls) {
        const requestBody = { url }
        const request = new NextRequest('http://localhost:3000/api/link-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        const response = await POST(request)
        expect(response.status).toBe(200)

        const responseData: LinkPreviewResponse = await response.json()

        // All responses should have the same structure
        expect(responseData).toHaveProperty('title')
        expect(responseData).toHaveProperty('description')
        expect(responseData).toHaveProperty('image')
        expect(responseData).toHaveProperty('siteName')
        expect(responseData).toHaveProperty('favicon')
      }
    })
  })

  describe('Error Handling Contract', () => {
    it('should handle network errors gracefully', async () => {
      const requestBody = {
        url: 'https://unreachable-domain-12345.com'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      // Should handle network errors with appropriate status code
      expect(response.status).toBeGreaterThanOrEqual(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBeDefined()
      expect(errorData.code).toBeDefined()
    })

    it('should handle server errors from target site', async () => {
      const requestBody = {
        url: 'https://example.com/server-error'
      }

      const request = new NextRequest('http://localhost:3000/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      // Should handle server errors appropriately
      expect([404, 500, 502, 503]).toContain(response.status)

      if (response.status >= 400) {
        const errorData: ValidationErrorResponse = await response.json()
        expect(errorData.error).toBeDefined()
        expect(errorData.code).toBeDefined()
      }
    })
  })
})