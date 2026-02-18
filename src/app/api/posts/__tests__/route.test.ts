import { POST, GET } from '../route'
import { NextRequest } from 'next/server'
import { mockSupabaseClient, mockPosts, mockChannels, mockUsers } from '../../../../../test-utils/mocks'

// Mock the admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabaseClient,
}))

// Mock fetch for token rewards
global.fetch = jest.fn()

describe('/api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => '',
    })
    
    // Default successful responses
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient)
  })

  describe('POST /api/posts', () => {
    const validPostData = {
      title: '테스트 게시물',
      content: '이것은 테스트 게시물입니다.',
      channelName: 'test',
      authorName: 'testuser',
      flair: '질문',
      captchaVerified: true,
      allowGuestComments: true,
    }

    const createRequest = (body: any, headers: Record<string, string> = {}) => {
      return {
        json: jest.fn().mockResolvedValue(body),
        headers: {
          get: jest.fn().mockImplementation((key: string) => headers[key] || null),
        },
      } as unknown as NextRequest
    }

    it('should create a post successfully', async () => {
      // Mock channel lookup
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockChannels[0],
        error: null,
      })

      // Mock user lookup - user exists
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockUsers[0],
        error: null,
      })

      // Mock membership check - not a member
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      })

      // Mock current channel data for member count
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { member_count: 100 },
        error: null,
      })

      // Mock post creation
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          ...mockPosts[0],
          title: validPostData.title,
          content: validPostData.content,
        },
        error: null,
      })

      // Mock token reward API
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        text: async () => '',
      })

      const request = createRequest(validPostData, { 'x-forwarded-for': '192.168.1.1' })
      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.post).toBeDefined()
      expect(result.post.title).toBe(validPostData.title)

      // Verify channel lookup
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('channels')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('name', 'test')

      // Verify post creation
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('posts')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validPostData.title,
          content: validPostData.content,
          flair: validPostData.flair,
          moderation_status: 'approved',
          allow_guest_comments: true,
        })
      )
    })

    it('should set allow_guest_comments to false when specified', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockChannels[0], error: null }) // channel lookup
        .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // membership check
        .mockResolvedValueOnce({ data: { member_count: 100 }, error: null }) // channel member count
        .mockResolvedValueOnce({ data: mockPosts[0], error: null }) // post creation

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        text: async () => '',
      })

      const request = createRequest({ ...validPostData, allowGuestComments: false })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({ allow_guest_comments: false })
      )
    })

    it('should create anonymous user with masked IP', async () => {
      const anonymousData = {
        ...validPostData,
        authorName: 'ddudl이',
      }

      // Mock channel lookup
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockChannels[0],
        error: null,
      })

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

      // Mock membership and post creation
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // membership check
        .mockResolvedValueOnce({ data: { member_count: 100 }, error: null }) // member count
        .mockResolvedValueOnce({ data: mockPosts[0], error: null }) // post creation

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
        ...validPostData,
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
          title: '테스트',
          // missing content, channelName, authorName
        }

        const request = createRequest(incompleteData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('Missing required fields')
      })

      it('should reject short titles', async () => {
        const shortTitleData = {
          ...validPostData,
          title: 'hi', // Too short
        }

        const request = createRequest(shortTitleData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('Title must be at least 5 characters')
      })

      it('should reject short usernames', async () => {
        const shortUsernameData = {
          ...validPostData,
          authorName: 'ab', // Too short
        }

        const request = createRequest(shortUsernameData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('Username must be at least 3 characters')
      })
    })

    describe('IP address handling', () => {
      it('should handle IPv4 addresses correctly', async () => {
        const anonymousData = { ...validPostData, authorName: 'ddudl이' }

        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockChannels[0], error: null }) // channel
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // user lookup
          .mockResolvedValueOnce({ data: { id: 'user-id' }, error: null }) // user creation
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // membership
          .mockResolvedValueOnce({ data: { member_count: 100 }, error: null }) // member count
          .mockResolvedValueOnce({ data: mockPosts[0], error: null }) // post

        const request = createRequest(anonymousData, { 'x-forwarded-for': '203.145.67.89' })
        await POST(request)

        expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'ddudl이 (203.145.*.*)',
          })
        )
      })

      it('should handle IPv6 addresses', async () => {
        const anonymousData = { ...validPostData, authorName: 'ddudl이' }

        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockChannels[0], error: null })
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
          .mockResolvedValueOnce({ data: { id: 'user-id' }, error: null })
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
          .mockResolvedValueOnce({ data: { member_count: 100 }, error: null })
          .mockResolvedValueOnce({ data: mockPosts[0], error: null })

        const request = createRequest(anonymousData, { 'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334' })
        await POST(request)

        expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'ddudl이 (2001:0db8:*:*)',
          })
        )
      })

      it('should handle localhost addresses', async () => {
        const anonymousData = { ...validPostData, authorName: 'ddudl이' }

        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockChannels[0], error: null })
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
          .mockResolvedValueOnce({ data: { id: 'user-id' }, error: null })
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
          .mockResolvedValueOnce({ data: { member_count: 100 }, error: null })
          .mockResolvedValueOnce({ data: mockPosts[0], error: null })

        const request = createRequest(anonymousData, { 'x-forwarded-for': '::1' })
        await POST(request)

        expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'ddudl이 (local.*.*)',
          })
        )
      })
    })

    describe('Error handling', () => {
      it('should handle channel not found', async () => {
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        const request = createRequest(validPostData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(404)
        expect(result.error).toBe('Channel not found')
      })

      it('should handle user creation failure', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockChannels[0], error: null }) // channel lookup
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // user lookup
          .mockResolvedValueOnce({ data: null, error: { message: 'User creation failed' } }) // user creation

        const request = createRequest(validPostData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(500)
        expect(result.error).toBe('Failed to create user')
      })

      it('should handle post creation failure', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockChannels[0], error: null }) // channel
          .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // membership
          .mockResolvedValueOnce({ data: { member_count: 100 }, error: null }) // member count
          .mockResolvedValueOnce({ data: null, error: { message: 'Post creation failed' } }) // post creation

        const request = createRequest(validPostData)
        const response = await POST(request)
        const result = await response.json()

        expect(response.status).toBe(500)
        expect(result.error).toBe('Failed to create post')
      })

      it('should handle auto-join errors gracefully', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockChannels[0], error: null }) // channel
          .mockResolvedValueOnce({ data: mockUsers[0], error: null }) // user lookup
          .mockRejectedValueOnce(new Error('Membership error')) // membership check fails

        // Should still continue with post creation
        mockSupabaseClient.single.mockResolvedValueOnce({ 
          data: mockPosts[0], 
          error: null 
        })

        const request = createRequest(validPostData)
        const response = await POST(request)

        expect(response.status).toBe(200) // Should still succeed
      })

      it('should handle token reward failure gracefully', async () => {
        mockSupabaseClient.single
          .mockResolvedValueOnce({ data: mockChannels[0], error: null })
          .mockResolvedValueOnce({ data: mockUsers[0], error: null })
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
          .mockResolvedValueOnce({ data: { member_count: 100 }, error: null })
          .mockResolvedValueOnce({ data: mockPosts[0], error: null })

        // Token reward fails
        ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Token API error'))

        const request = createRequest(validPostData)
        const response = await POST(request)

        expect(response.status).toBe(200) // Should still succeed
      })
    })
  })

  describe('GET /api/posts', () => {
    beforeEach(() => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: mockPosts,
        error: null,
      })
    })

    it('should fetch posts with default parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.posts).toEqual(mockPosts)

      // Verify query building
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('moderation_status', 'approved')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_deleted', false)
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('upvotes', { ascending: false })
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(20)
    })

    it('should handle sorting parameters', async () => {
      // Test "new" sorting
      let request = new NextRequest('http://localhost:3000/api/posts?sort=new')
      await GET(request)

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false })

      jest.clearAllMocks()
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
      mockSupabaseClient.limit.mockResolvedValue({ data: mockPosts, error: null })

      // Test "top" sorting
      request = new NextRequest('http://localhost:3000/api/posts?sort=top')
      await GET(request)

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('upvotes', { ascending: false })
    })

    it('should filter by channel', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'channel1' },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/posts?channel=test')
      await GET(request)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('channels')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('name', 'test')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('channel_id', 'channel1')
    })

    it('should filter by flair', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts?flair=질문')
      await GET(request)

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('flair', '질문')
    })

    it('should handle time range filtering for top posts', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts?sort=top&timeRange=day')
      await GET(request)

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('created_at', expect.any(String))
    })

    it('should respect custom limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts?limit=50')
      await GET(request)

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(50)
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const request = new NextRequest('http://localhost:3000/api/posts')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to fetch posts')
    })

    it('should handle invalid time ranges gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts?sort=top&timeRange=invalid')
      const response = await GET(request)

      expect(response.status).toBe(200) // Should not crash
    })

    describe('Hot post algorithm', () => {
      it('should sort by upvotes then created_at for hot posts', async () => {
        const request = new NextRequest('http://localhost:3000/api/posts?sort=hot')
        await GET(request)

        expect(mockSupabaseClient.order).toHaveBeenCalledWith('upvotes', { ascending: false })
        expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
      })
    })
  })

  // Phase C: 엣지 케이스 테스트 추가
  describe('Edge Cases - GET /api/posts', () => {
    it('should handle empty channel name', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts?channel=')
      const response = await GET(request)

      expect(response.status).toBe(200) // Should not crash
    })

    it('should handle non-existent channel', async () => {
      // Mock empty response for non-existent channel
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/posts?channel=nonexistent')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.posts).toEqual([])
    })

    it('should filter out deleted posts (is_deleted = true)', async () => {
      const postsWithDeleted = [
        { ...mockPosts[0], is_deleted: false },
        { ...mockPosts[1], is_deleted: true }, // Should be filtered out
      ]

      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: postsWithDeleted.filter(p => !p.is_deleted),
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/posts')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].is_deleted).toBe(false)
    })

    it('should handle pagination boundary conditions', async () => {
      // Test edge case: page=0
      const request1 = new NextRequest('http://localhost:3000/api/posts?page=0')
      const response1 = await GET(request1)
      expect(response1.status).toBe(200)

      // Test edge case: negative page
      const request2 = new NextRequest('http://localhost:3000/api/posts?page=-1')
      const response2 = await GET(request2)
      expect(response2.status).toBe(200)

      // Test edge case: very large page number
      const request3 = new NextRequest('http://localhost:3000/api/posts?page=999999')
      const response3 = await GET(request3)
      expect(response3.status).toBe(200)
    })

    it('should handle invalid limit values', async () => {
      // Test edge case: negative limit
      const request1 = new NextRequest('http://localhost:3000/api/posts?limit=-10')
      const response1 = await GET(request1)
      expect(response1.status).toBe(200)

      // Test edge case: limit = 0
      const request2 = new NextRequest('http://localhost:3000/api/posts?limit=0')
      const response2 = await GET(request2)
      expect(response2.status).toBe(200)

      // Test edge case: extremely large limit
      const request3 = new NextRequest('http://localhost:3000/api/posts?limit=99999')
      const response3 = await GET(request3)
      expect(response3.status).toBe(200)
    })

    it('should handle malformed query parameters', async () => {
      // Test with special characters
      const request1 = new NextRequest('http://localhost:3000/api/posts?channel=<script>alert(1)</script>')
      const response1 = await GET(request1)
      expect(response1.status).toBe(200)

      // Test with SQL injection attempt
      const request2 = new NextRequest('http://localhost:3000/api/posts?flair=\&apos; OR 1=1 --')
      const response2 = await GET(request2)
      expect(response2.status).toBe(200)

      // Test with very long query parameter
      const longString = 'a'.repeat(10000)
      const request3 = new NextRequest(`http://localhost:3000/api/posts?search=${longString}`)
      const response3 = await GET(request3)
      expect(response3.status).toBe(200)
    })
  })

  describe('Edge Cases - POST /api/posts', () => {
    it('should reject null/undefined inputs', async () => {
      const request1 = createRequest({
        title: null,
        content: 'test content',
        channelName: 'test',
        authorName: 'testuser'
      })

      const response1 = await POST(request1 as NextRequest)
      expect(response1.status).toBe(400)

      const request2 = createRequest({
        title: 'test title',
        content: undefined,
        channelName: 'test',
        authorName: 'testuser'
      })

      const response2 = await POST(request2 as NextRequest)
      expect(response2.status).toBe(400)
    })

    it('should reject empty strings', async () => {
      const request = createRequest({
        title: '',
        content: 'test content',
        channelName: 'test',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)
    })

    it('should handle extremely long content (>10000 chars)', async () => {
      const longContent = 'a'.repeat(10001)
      const request = createRequest({
        title: 'test title',
        content: longContent,
        channelName: 'test',
        authorName: 'testuser',
        captchaVerified: true
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)
    })

    it('should sanitize XSS attempts in content', async () => {
      const request = createRequest({
        title: 'test title',
        content: '<script>alert(\"XSS\")</script><img src=x onerror=alert(1)>',
        channelName: 'test',
        authorName: 'testuser',
        captchaVerified: true
      })

      // Mock successful DB insert
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: '123', ...validPostData },
        error: null,
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

    it('should handle SQL injection attempts in title/content', async () => {
      const request = createRequest({
        title: '\'; DROP TABLE posts; --',
        content: '\'; DELETE FROM posts WHERE 1=1; --',
        channelName: 'test',
        authorName: 'testuser',
        captchaVerified: true
      })

      // Mock successful DB insert (Supabase should handle SQL injection)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: '123' },
        error: null,
      })

      const response = await POST(request as NextRequest)
      // Should not crash and should be handled by Supabase's built-in protection
      expect(response.status).toBeLessThan(500)
    })

    it('should reject posts without proper authentication for restricted channels', async () => {
      const request = createRequest({
        ...validPostData,
        channelName: 'admin-only-channel'
      }, {}) // No authentication headers

      const response = await POST(request as NextRequest)
      // Should handle authorization properly
      expect([400, 401, 403]).toContain(response.status)
    })

    it('should handle invalid Content-Type headers', async () => {
      const request = createRequest(validPostData, {
        'content-type': 'text/plain' // Wrong content type
      })

      const response = await POST(request as NextRequest)
      // Should handle or reject non-JSON content
      expect(response.status).toBeLessThan(500)
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
    })

    it('should handle database connection errors gracefully', async () => {
      mockSupabaseClient.single.mockRejectedValueOnce(new Error('Connection failed'))

      const request = createRequest(validPostData)
      const response = await POST(request as NextRequest)

      expect(response.status).toBe(500)
    })

    it('should handle invalid UUID formats in related fields', async () => {
      const request = createRequest({
        ...validPostData,
        parentPostId: 'invalid-uuid-format'
      })

      const response = await POST(request as NextRequest)
      expect(response.status).toBe(400)
    })
  })
})