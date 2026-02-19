// Contract test for POST /api/posts - Phase 3.2 TDD Setup
// CRITICAL: This test MUST FAIL before implementation exists

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { CreatePostRequest, CreatePostResponse, ValidationErrorResponse } from '@/types/forms'

// Mock Supabase Admin Client
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockIn = jest.fn()

const mockSupabase = {
  from: mockFrom,
}

mockFrom.mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
})

mockSelect.mockReturnValue({
  eq: mockEq,
  in: mockIn,
  single: mockSingle,
})

mockEq.mockReturnValue({
  single: mockSingle,
})

mockInsert.mockReturnValue({
  select: mockSelect,
})

mockIn.mockReturnValue({
  // for GET
})

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabase,
}))

describe('Contract: POST /api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful mocks
    mockFrom.mockImplementation((table) => {
      if (table === 'channels') return { select: mockSelect, update: mockUpdate }
      if (table === 'users') return { select: mockSelect, insert: mockInsert }
      if (table === 'posts') return { insert: mockInsert }
      if (table === 'channel_members') return { select: mockSelect, insert: mockInsert }
      return { select: mockSelect }
    })

    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
    
    // Mock channel lookup
    mockSingle.mockImplementation(() => Promise.resolve({ 
      data: { id: 'test-channel-id', member_count: 10 }, 
      error: null 
    }))

    // Mock User lookup
    // If we want to simulate user needed creation, we can adjust.
    // For now, assume user exists or is created successfully.
    
    // Mock Post Insert
    mockInsert.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({
          data: {
             id: 'new-post-id',
             channel_id: 'test-channel-id',
             channel_id: 'test-channel-id',
             created_at: new Date().toISOString(),
             // ... other fields matching input ...
             // BUT route.ts returns ...post, channelName
          },
          error: null
        })
      })
    })

     // Need to return data matching the structure route.ts expects from DB
     // User: { id: 'user-id' }
     // Channel: { id: 'test-channel-id' }
  })

  describe('Request Contract', () => {
    it('should accept valid post creation request', async () => {
      const validRequest: CreatePostRequest = {
        title: 'Valid Test Post Title',
        content: 'This is valid test post content that meets minimum requirements.',
        authorName: 'TestUser',
        channelName: 'test-channel',
        flair: '일반',
        images: [],
        allowGuestComments: true,
        captchaToken: 'valid-captcha-token'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest)
      })

      // Override mock for this test to return data with correct values
      mockInsert.mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'new-post-id',
              title: validRequest.title,
              content: validRequest.content,
              author_id: 'user-id',
              channel_id: 'test-channel-id',
              flair: validRequest.flair,
              allow_guest_comments: validRequest.allowGuestComments,
              created_at: new Date().toISOString(),
              images: validRequest.images
            },
            error: null
          })
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData: CreatePostResponse = await response.json()
      expect(responseData.post).toBeDefined()
      expect(responseData.post.id).toBeDefined()
      expect(responseData.post.title).toBe(validRequest.title)
      expect(responseData.post.content).toBe(validRequest.content)
      expect(responseData.post.authorName).toBe(validRequest.authorName)
      expect(responseData.post.channelName).toBe(validRequest.channelName)
      expect(responseData.post.flair).toBe(validRequest.flair)
      expect(responseData.post.images).toEqual(validRequest.images)
      expect(responseData.post.allowGuestComments).toBe(validRequest.allowGuestComments)
      expect(responseData.post.createdAt).toBeDefined()
    })

    it.skip('should accept anonymous user post with valid captcha', async () => {
      const anonymousRequest: CreatePostRequest = {
        title: 'Anonymous Post Title',
        content: 'Content from anonymous user with captcha verification.',
        authorName: 'ddudl이1234',
        channelName: 'test-channel',
        flair: '일반',
        images: [],
        allowGuestComments: true,
        captchaToken: 'valid-captcha-token'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anonymousRequest)
      })

      // Override for anonymous
      mockInsert.mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'anon-post-id',
              title: anonymousRequest.title,
              author_id: null,
              channel_id: 'test-channel-id',
              created_at: new Date().toISOString(),
            },
            error: null
          })
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(201)

      const responseData: CreatePostResponse = await response.json()
      // Server adds IP mask to anonymous users
      expect(responseData.post.authorName).toContain('ddudl이')
      expect(responseData.post.authorName).toMatch(/ddudl이 \(.*\)/)
    })

    it('should accept post with multiple images', async () => {
      const requestWithImages: CreatePostRequest = {
        title: 'Post with Images',
        content: 'Post containing multiple uploaded images.',
        authorName: 'TestUser',
        channelName: 'test-channel',
        flair: '사진',
        images: [
          'https://example.com/image1.webp',
          'https://example.com/image2.webp'
        ],
        allowGuestComments: false,
        captchaToken: 'valid-captcha-token'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestWithImages)
      })

      // Override for images
      mockInsert.mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'img-post-id',
              title: requestWithImages.title,
              flair: requestWithImages.flair,
              allow_guest_comments: requestWithImages.allowGuestComments,
              images: requestWithImages.images,
              created_at: new Date().toISOString(),
              channel_id: 'test-channel-id'
            },
            error: null
          })
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(201)

      const responseData: CreatePostResponse = await response.json()
      expect(responseData.post.images).toHaveLength(2)
      expect(responseData.post.flair).toBe('사진')
      expect(responseData.post.allowGuestComments).toBe(false)
    })
  })

  describe('Validation Contract', () => {
    it('should reject request with missing title', async () => {
      const invalidRequest = {
        content: 'Content without title',
        authorName: 'TestUser',
        channelName: 'test-channel',
        captchaToken: 'valid-captcha-token'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBeDefined()
      expect(errorData.code).toBe('TITLE_REQUIRED')
      expect(errorData.field).toBe('title')
    })

    it('should reject request with title too short', async () => {
      const invalidRequest: CreatePostRequest = {
        title: 'Hi', // Less than 5 characters
        content: 'Valid content',
        authorName: 'TestUser',
        channelName: 'test-channel',
        captchaToken: 'valid-captcha-token'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toContain('Title must be at least 5 characters')
      expect(errorData.code).toBe('TITLE_TOO_SHORT')
    })

    it('should accept request with missing content when title is present', async () => {
      const validRequestWithoutContent: CreatePostRequest = {
        title: 'Valid Title Here',
        // content is intentionally omitted because it is optional
        authorName: 'TestUser',
        channelName: 'test-channel',
        captchaToken: 'valid-captcha-token'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequestWithoutContent)
      })

      const response = await POST(request)

      expect(response.status).toBe(201)

      const responseData: CreatePostResponse = await response.json()
      expect(responseData).toBeDefined()
    })
    it('should reject request with missing authorName', async () => {
      const invalidRequest = {
        title: 'Valid Title Here',
        content: 'Valid content here',
        channelName: 'test-channel',
        captchaToken: 'valid-captcha-token'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBeDefined()
      expect(errorData.code).toBe('AUTHOR_REQUIRED')
      expect(errorData.field).toBe('authorName')
    })

    it.skip('should reject anonymous user request without captcha', async () => {
      const requestWithoutCaptcha: CreatePostRequest = {
        title: 'Anonymous Post Without Captcha',
        content: 'This should be rejected',
        authorName: 'ddudl이1234',
        channelName: 'test-channel',
        // captchaToken missing for anonymous user
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestWithoutCaptcha)
      })

      const response = await POST(request)

      expect(response.status).toBe(401)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toContain('CAPTCHA verification required')
      expect(errorData.code).toBe('CAPTCHA_REQUIRED')
    })

    it('should reject request from blocked user', async () => {
      const blockedUserRequest: CreatePostRequest = {
        title: 'Post from blocked user',
        content: 'This should be rejected',
        authorName: 'blocked-user',
        channelName: 'test-channel',
        captchaToken: 'valid-captcha-token'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockedUserRequest)
      })

      const response = await POST(request)

      expect(response.status).toBe(403)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toContain('User is blocked')
      expect(errorData.code).toBe('USER_BLOCKED')
    })

    it('should reject malformed JSON request', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"title": "Invalid JSON"' // Malformed JSON
      })

      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData: ValidationErrorResponse = await response.json()
      expect(errorData.error).toBeDefined()
      expect(errorData.code).toBe('INVALID_JSON')
    })
  })

  describe('Response Contract', () => {
    it('should return correct response structure on success', async () => {
      const validRequest: CreatePostRequest = {
        title: 'Response Structure Test',
        content: 'Testing response structure compliance',
        authorName: 'TestUser',
        channelName: 'test-channel',
        flair: '질문',
        images: ['https://example.com/test.webp'],
        allowGuestComments: true,
        captchaToken: 'valid-captcha-token'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest)
      })

      mockInsert.mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'response-test-id',
              title: validRequest.title,
              content: validRequest.content,
              author_id: 'user-id',
              channel_id: 'test-channel-id',
              flair: validRequest.flair,
              images: validRequest.images,
              allow_guest_comments: validRequest.allowGuestComments,
              created_at: new Date().toISOString()
            },
            error: null
          })
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(response.headers.get('Content-Type')).toContain('application/json')

      const responseData: CreatePostResponse = await response.json()

      // Verify response structure matches interface
      expect(responseData).toHaveProperty('post')
      expect(responseData.post).toHaveProperty('id')
      expect(responseData.post).toHaveProperty('title')
      expect(responseData.post).toHaveProperty('content')
      expect(responseData.post).toHaveProperty('authorName')
      expect(responseData.post).toHaveProperty('channelName')
      expect(responseData.post).toHaveProperty('flair')
      expect(responseData.post).toHaveProperty('images')
      expect(responseData.post).toHaveProperty('allowGuestComments')
      expect(responseData.post).toHaveProperty('createdAt')

      // Verify types
      expect(typeof responseData.post.id).toBe('string')
      expect(typeof responseData.post.title).toBe('string')
      expect(typeof responseData.post.content).toBe('string')
      expect(typeof responseData.post.authorName).toBe('string')
      expect(typeof responseData.post.channelName).toBe('string')
      expect(Array.isArray(responseData.post.images)).toBe(true)
      expect(typeof responseData.post.allowGuestComments).toBe('boolean')
      expect(typeof responseData.post.createdAt).toBe('string')

      // Verify ISO date format
      expect(new Date(responseData.post.createdAt).toISOString()).toBe(responseData.post.createdAt)
    })

    it('should return correct error structure on validation failure', async () => {
      const invalidRequest = {
        title: 'Hi', // Too short
        content: 'Valid content'
      }

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(response.headers.get('Content-Type')).toContain('application/json')

      const errorData: ValidationErrorResponse = await response.json()

      // Verify error structure matches interface
      expect(errorData).toHaveProperty('error')
      // Missing required fields
      expect(errorData).toHaveProperty('code')
      expect(errorData).toHaveProperty('field')

      // Verify types
      expect(typeof errorData.error).toBe('string')
      expect(typeof errorData.code).toBe('string')
      expect(typeof errorData.field).toBe('string')
    })
  })
})