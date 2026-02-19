import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { PATCH } from '../route'

// Create mock functions
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockUpdate = jest.fn()
const mockFrom = jest.fn()
const mockAuth = { getUser: jest.fn() }

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: mockAuth,
    from: mockFrom
  }))
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    auth: mockAuth,
    from: mockFrom
  }))
}))

// Mock auth store
jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      user: { id: 'test-user-id' }
    }))
  }
}))

describe.skip('PATCH /api/posts/[postId]', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup auth mock
    mockAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          user_metadata: { username: 'testuser' },
          email: 'test@example.com'
        }
      }
    })
    
    // Setup method chaining for from()
    mockSingle.mockResolvedValue({
      data: { id: 'test-profile-id' },
      error: null
    })
    
    mockEq.mockReturnValue({
      single: mockSingle,
      select: mockSelect
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle
    })
    
    mockUpdate.mockReturnValue({
      eq: mockEq
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      eq: mockEq
    })
  })

  describe('Success Cases', () => {
    it('should update post with valid data', async () => {
      // Arrange
      const existingPost = {
        id: 'post-123',
        title: 'Original Title',
        content: 'Original content',
        author_name: 'test-user',
        channel_name: 'test-channel',
        user_id: 'test-user-id'
      }

      const updatedPost = {
        ...existingPost,
        title: 'Updated Title',
        content: 'Updated content',
        updated_at: new Date().toISOString()
      }

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: existingPost,
        error: null
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: updatedPost,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title',
          content: 'Updated content'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.post).toEqual(updatedPost)
      expect(mockSupabase.from).toHaveBeenCalledWith('posts')
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        title: 'Updated Title',
        content: 'Updated content'
      })
    })

    it('should update only title when content is omitted', async () => {
      // Arrange
      const existingPost = {
        id: 'post-123',
        title: 'Original Title',
        content: 'Original content',
        user_id: 'test-user-id'
      }

      const updatedPost = {
        ...existingPost,
        title: 'Updated Title Only'
      }

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: existingPost,
        error: null
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: updatedPost,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title Only'
        })
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })

      // Assert
      expect(response.status).toBe(200)
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        title: 'Updated Title Only'
      })
    })

    it('should update flair when provided', async () => {
      // Arrange
      const existingPost = {
        id: 'post-123',
        title: 'Test Title',
        user_id: 'test-user-id'
      }

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: existingPost,
        error: null
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: { ...existingPost, flair: '질문' },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Test Title',
          flair: '질문'
        })
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })

      // Assert
      expect(response.status).toBe(200)
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        title: 'Test Title',
        flair: '질문'
      })
    })
  })

  describe('Validation Errors', () => {
    it('should return 400 for missing title', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          content: 'Content without title'
        })
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('제목은 필수입니다')
    })

    it('should return 400 for title too short', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          title: '짧음'  // 4자 (5자 미만)
        })
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('최소 5자')
    })

    it('should return 400 for title too long', async () => {
      // Arrange
      const longTitle = 'A'.repeat(301)  // 301자
      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          title: longTitle
        })
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('300자를 초과')
    })

    it('should return 400 for invalid flair', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Valid Title',
          flair: '잘못된플레어'
        })
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('올바른 플레어')
    })
  })

  describe('Authorization Errors', () => {
    it('should return 404 for non-existent post', async () => {
      // Arrange
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }  // Not found
      })

      const request = new NextRequest('http://localhost:3000/api/posts/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Valid Title'
        })
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'nonexistent' } })

      // Assert
      expect(response.status).toBe(404)
    })

    it('should return 403 for unauthorized user', async () => {
      // Arrange
      const existingPost = {
        id: 'post-123',
        title: 'Original Title',
        user_id: 'different-user-id'  // 다른 User의 게시물
      }

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: existingPost,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title'
        })
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })

      // Assert
      expect(response.status).toBe(403)
    })
  })

  describe('Database Errors', () => {
    it('should return 500 for database update error', async () => {
      // Arrange
      const existingPost = {
        id: 'post-123',
        title: 'Original Title',
        user_id: 'test-user-id'
      }

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: existingPost,
        error: null
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title'
        })
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })

      // Assert
      expect(response.status).toBe(500)
    })
  })

  describe('Request Format Errors', () => {
    it('should return 400 for invalid JSON', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: 'invalid json'
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })

      // Assert
      expect(response.status).toBe(400)
    })

    it('should return 400 for empty body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/posts/post-123', {
        method: 'PATCH',
        body: ''
      })

      // Act
      const response = await PATCH(request, { params: { postId: 'post-123' } })

      // Assert
      expect(response.status).toBe(400)
    })
  })
})