import { POST } from '../route'
import { NextRequest } from 'next/server'
import { mockSupabaseClient, mockComments, mockUsers } from '@/lib/test/mocks'

// Mock the admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabaseClient,
}))

const mockAuthGetUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: { getUser: mockAuthGetUser },
  }),
}))

// Mock fetch for token rewards
global.fetch = jest.fn()

describe('/api/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockAuthGetUser.mockResolvedValue({ data: { user: null } })

    // Default successful responses
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => '',
    })
  })

  describe('POST /api/comments', () => {
    const validCommentData = {
      content: '좋은 게시물이네요!',
      postId: 'post-123',
      authorName: 'testuser',
      captchaVerified: true,
      parentId: null,
    }

    const createRequest = (body: any, headers: Record<string, string> = {}) => {
      return {
        json: jest.fn().mockResolvedValue(body),
        headers: {
          get: jest.fn().mockImplementation((key: string) => headers[key] || null),
        },
      } as unknown as NextRequest
    }

    it('should create a comment successfully', async () => {
      // Mock user lookup - user exists
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockUsers[0],
        error: null,
      })

      // Mock post data lookup
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { channel_id: 'channel-123', allow_guest_comments: true },
        error: null,
      })

      // Mock membership check - not a member
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      })

      // Mock channel member count
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { member_count: 100 },
        error: null,
      })

      // Mock comment creation
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          ...mockComments[0],
          content: validCommentData.content,
        },
        error: null,
      })

      // Mock token reward API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      })

      const request = createRequest(validCommentData)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.comment).toBeDefined()
      expect(result.comment.content).toBe(validCommentData.content)

      // Verify comment creation
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('comments')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: validCommentData.content,
          post_id: validCommentData.postId,
          author_id: mockUsers[0].id,
          parent_id: null,
          upvotes: 0,
          downvotes: 0,
        })
      )
    })

    it('should reject guest comments when not allowed', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
        .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: false }, error: null }) // post data

      const request = createRequest(validCommentData)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Guest comments are not allowed for this post')
    })

    it('should create a nested comment with parentId', async () => {
      const nestedCommentData = {
        ...validCommentData,
        parentId: 'parent-comment-123',
      }

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
        .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null }) // post data
        .mockResolvedValueOnce({ data: { id: 'membership-id' }, error: null }) // membership check (already member)
        .mockResolvedValueOnce({ data: mockComments[1], error: null }) // comment creation

      const request = createRequest(nestedCommentData)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_id: 'parent-comment-123',
        })
      )
    })

    it('should create anonymous user with masked IP', async () => {
      const anonymousData = {
        ...validCommentData,
        authorName: 'ddudl이',
      }

      // Mock user lookup - user doesn't exist
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })

      // Mock user creation
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'new-user-id' },
        error: null,
      })

      // Mock other operations
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null }) // post data
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // membership check
        .mockResolvedValueOnce({ data: { member_count: 100 }, error: null }) // member count
        .mockResolvedValueOnce({ data: mockComments[0], error: null }) // comment creation

      const request = createRequest(anonymousData, { 'x-forwarded-for': '192.168.1.100' })
      await POST(request)

      // Verify anonymous user creation with masked IP
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'ddudl이 (192.168.*.*)',
          email_hash: expect.stringMatching(/temp_\d+_.*/),
        })
      )
    })

    it('should require CAPTCHA for anonymous users', async () => {
      const anonymousDataNoCaptcha = {
        ...validCommentData,
        authorName: 'ddudl이',
        captchaVerified: false,
      }

      const request = createRequest(anonymousDataNoCaptcha)
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Anonymous users must complete CAPTCHA')
    })

    describe('Input validation', () => {
      it('should reject missing required fields', async () => {
        const incompleteData = {
          content: '댓글 내용',
          // missing postId, authorName
        }

        const request = createRequest(incompleteData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('Missing required fields')
      })

      it('should reject short usernames', async () => {
        const shortUsernameData = {
          ...validCommentData,
          authorName: 'ab', // Too short
        }

        const request = createRequest(shortUsernameData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('Username must be at least 3 characters')
      })
    })

    describe('IP address handling for anonymous users', () => {
      const setupAnonymousUser = () => {
        const anonymousData = { ...validCommentData, authorName: 'ddudl이' }
        
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // user lookup
          .mockResolvedValueOnce({ data: { id: 'user-id' }, error: null }) // user creation
          .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null }) // post data
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // membership
          .mockResolvedValueOnce({ data: { member_count: 100 }, error: null }) // member count
          .mockResolvedValueOnce({ data: mockComments[0], error: null }) // comment

        return anonymousData
      }

      it('should handle IPv4 addresses correctly', async () => {
        const anonymousData = setupAnonymousUser()
        const request = createRequest(anonymousData, { 'x-forwarded-for': '203.145.67.89' })
        await POST(request)

        expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'ddudl이 (203.145.*.*)',
          })
        )
      })

      it('should handle IPv6 addresses', async () => {
        const anonymousData = setupAnonymousUser()
        const request = createRequest(anonymousData, { 
          'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334' 
        })
        await POST(request)

        expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'ddudl이 (2001:0db8:*:*)',
          })
        )
      })

      it('should handle localhost addresses', async () => {
        const anonymousData = setupAnonymousUser()
        const request = createRequest(anonymousData, { 'x-forwarded-for': '::1' })
        await POST(request)

        expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'ddudl이 (local.*.*)',
          })
        )
      })
    })

    describe('Auto-join channel functionality', () => {
      it('should auto-join user to channel when creating comment', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
          .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null }) // post data
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // membership check (not member)
          .mockResolvedValueOnce({ data: { member_count: 100 }, error: null }) // member count
          .mockResolvedValueOnce({ data: mockComments[0], error: null }) // comment creation

        const request = createRequest(validCommentData)
        await POST(request)

        // Verify auto-join
        expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: mockUsers[0].id,
            channel_id: 'channel-123',
            joined_at: expect.any(String),
          })
        )

        // Verify member count update
        expect(mockSupabaseClient.update).toHaveBeenCalledWith({
          member_count: 101,
        })
      })

      it('should skip auto-join if user is already a member', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
          .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null }) // post data
          .mockResolvedValueOnce({ data: { id: 'membership-id' }, error: null }) // membership check (already member)
          .mockResolvedValueOnce({ data: mockComments[0], error: null }) // comment creation

        const request = createRequest(validCommentData)
        await POST(request)

        // Should not call insert for membership (only for comment)
        expect(mockSupabaseClient.insert).toHaveBeenCalledTimes(1) // Only for comment
        expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            content: validCommentData.content,
          })
        )
      })

      it('should handle auto-join errors gracefully', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
          .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null }) // post data
          .mockRejectedValueOnce(new Error('Membership error')) // membership check fails

        // Should still continue with comment creation
        mockSupabaseClient.single.mockResolvedValueOnce({ 
          data: mockComments[0], 
          error: null 
        })

        const request = createRequest(validCommentData)
        const response = await POST(request)

        expect(response.status).toBe(200) // Should still succeed
      })
    })

    describe('Error handling', () => {
      it('should handle user creation failure', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // user lookup
          .mockResolvedValueOnce({ data: null, error: { message: 'User creation failed' } }) // user creation

        const request = createRequest(validCommentData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(500)
        expect(result.error).toBe('Failed to create user')
      })

      it('should handle comment creation failure', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
          .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null }) // post data
          .mockResolvedValueOnce({ data: { id: 'membership-id' }, error: null }) // membership
          .mockResolvedValueOnce({ data: null, error: { message: 'Comment creation failed' } }) // comment creation

        const request = createRequest(validCommentData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(500)
        expect(result.error).toBe('Failed to create comment')
      })

      it('should handle token reward failure gracefully', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockUsers[0], error: null })
          .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null })
          .mockResolvedValueOnce({ data: { id: 'membership-id' }, error: null })
          .mockResolvedValueOnce({ data: mockComments[0], error: null })

        // Token reward fails
        ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Token API error'))

        const request = createRequest(validCommentData)
        const response = await POST(request)

        expect(response.status).toBe(200) // Should still succeed
      })

      it('should handle missing post data gracefully', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
          .mockResolvedValueOnce({ data: null, error: null }) // post data (no channel_id)
          .mockResolvedValueOnce({ data: mockComments[0], error: null }) // comment creation

        const request = createRequest(validCommentData)
        const response = await POST(request)

        expect(response.status).toBe(200) // Should still succeed
        // Should not attempt auto-join when no channel_id
        expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('channel_members')
      })

      it('should handle unexpected errors in main flow', async () => {
        // Simulate unexpected error during user lookup
        mockSupabaseClient.single.mockRejectedValueOnce(new Error('Database connection error'))

        const request = createRequest(validCommentData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(500)
        expect(result.error).toBe('Internal server error')
      })
    })

    describe('Token reward integration', () => {
      it('should award tokens for comment creation', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockUsers[0], error: null })
          .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null })
          .mockResolvedValueOnce({ data: { id: 'membership-id' }, error: null })
          .mockResolvedValueOnce({ data: mockComments[0], error: null })

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
          text: async () => '',
        })

        const request = createRequest(validCommentData)
        await POST(request)

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/tokens/earn',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: mockUsers[0].id,
              action: 'comment_create',
              metadata: {
                commentId: mockComments[0].id,
                postId: validCommentData.postId,
              },
            }),
          }
        )
      })

      it('should handle token API failure without affecting comment creation', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockUsers[0], error: null })
          .mockResolvedValueOnce({ data: { channel_id: 'channel-123', allow_guest_comments: true }, error: null })
          .mockResolvedValueOnce({ data: { id: 'membership-id' }, error: null })
          .mockResolvedValueOnce({ data: mockComments[0], error: null })

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          json: async () => ({}),
          text: async () => 'error',
        })

        const request = createRequest(validCommentData)
        const response = await POST(request)

        expect(response.status).toBe(200) // Comment creation should still succeed
      })
    })
  })

  // Phase C: 엣지 케이스 테스트 추가
  describe('Edge Cases - POST /api/comments', () => {
    it('should reject comments without postId', async () => {
      const request = createRequest({
        content: 'test comment',
        authorName: 'testuser',
        captchaVerified: true
        // postId is missing
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('postId')
    })

    it('should reject empty comment content', async () => {
      const request = createRequest({
        content: '',
        postId: 'post-123',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)
    })

    it('should reject comments with only whitespace content', async () => {
      const request = createRequest({
        content: '   \n\t   ',
        postId: 'post-123',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)
    })

    it('should handle extremely long comments (>5000 chars)', async () => {
      const longContent = 'a'.repeat(5001)
      const request = createRequest({
        content: longContent,
        postId: 'post-123',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('length')
    })

    it('should sanitize HTML injection attempts', async () => {
      const maliciousContent = '<script>alert(\"XSS\")</script><img src=x onerror=alert(1)>Harmless content'
      
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'comment-123', content: 'Sanitized content' },
        error: null,
      })

      const request = createRequest({
        content: maliciousContent,
        postId: 'post-123',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(201)

      // Verify that dangerous HTML is sanitized
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.not.stringContaining('<script>')
        })
      )
    })

    it('should handle SQL injection attempts', async () => {
      const sqlInjection = '\'; DROP TABLE comments; SELECT * FROM users WHERE \'1\'=\'1'
      
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'comment-123' },
        error: null,
      })

      const request = createRequest({
        content: sqlInjection,
        postId: 'post-123',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      // Should not crash - Supabase handles SQL injection
      expect(response.status).toBeLessThan(500)
    })

    it('should reject invalid UUID for postId', async () => {
      const request = createRequest({
        content: 'test comment',
        postId: 'invalid-uuid-format',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('UUID')
    })

    it('should reject invalid UUID for parentId', async () => {
      const request = createRequest({
        content: 'test comment',
        postId: 'valid-uuid-12345678-1234-1234-1234-123456789abc',
        parentId: 'invalid-parent-id',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('parentId')
    })

    it('should handle null/undefined inputs gracefully', async () => {
      const request1 = createRequest({
        content: null,
        postId: 'post-123',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response1 = await POST(request1 as NextRequest)
      expect(response1.status).toBe(400)

      const request2 = createRequest({
        content: 'test comment',
        postId: undefined,
        authorName: 'testuser',
        captchaVerified: true
      })

      const response2 = await POST(request2 as NextRequest)
      expect(response2.status).toBe(400)
    })

    it('should handle malformed JSON in request body', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
        },
      }

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toContain('Invalid')
    })

    it('should handle database connection failures', async () => {
      mockSupabaseClient.single.mockRejectedValueOnce(new Error('Database connection failed'))

      const request = createRequest(validCommentData)
      const response = await POST(request as NextRequest)

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.error).toBe('Failed to create comment')
    })

    it('should handle non-existent post ID', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' },
      })

      const request = createRequest({
        content: 'test comment',
        postId: 'non-existent-post-id',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(404)

      const result = await response.json()
      expect(result.error).toContain('not found')
    })

    it('should enforce comment depth limits (prevent deep nesting)', async () => {
      // Test deeply nested comment (assuming max depth is 10)
      const request = createRequest({
        content: 'deeply nested comment',
        postId: 'post-123',
        parentId: 'parent-comment-id',
        authorName: 'testuser',
        captchaVerified: true,
        depth: 11 // Exceeds maximum allowed depth
      })

      const response = await POST(request as NextRequest)
      expect([400, 403]).toContain(response.status)
    })

    it('should handle concurrent comment creation on same post', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'comment-123' },
        error: null,
      })

      const requests = Array(10).fill(0).map(() => createRequest({
        content: 'concurrent comment',
        postId: 'post-123',
        authorName: 'testuser',
        captchaVerified: true
      }))

      const responses = await Promise.all(
        requests.map(req => POST(req as NextRequest))
      )

      // All requests should either succeed or fail gracefully
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500)
      })
    })

    it('should validate authorName format and length', async () => {
      // Test very long authorName
      const longAuthorName = 'a'.repeat(101)
      const request1 = createRequest({
        content: 'test comment',
        postId: 'post-123',
        authorName: longAuthorName,
        captchaVerified: true
      })

      const response1 = await POST(request1 as NextRequest)
      expect(response1.status).toBe(400)

      // Test special characters in authorName
      const request2 = createRequest({
        content: 'test comment',
        postId: 'post-123',
        authorName: '<script>alert(1)</script>',
        captchaVerified: true
      })

      const response2 = await POST(request2 as NextRequest)
      expect(response2.status).toBe(400)
    })
  })
})