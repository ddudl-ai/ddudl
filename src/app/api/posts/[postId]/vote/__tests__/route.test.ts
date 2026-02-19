import { POST, GET } from '../route'
import { NextRequest } from 'next/server'
import { mockSupabaseClient } from '@/lib/test/mocks'

// Mock the Supabase clients
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabaseClient,
}))

describe('/api/posts/[postId]/vote', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default successful responses
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
  })

  describe('POST /api/posts/[postId]/vote', () => {
    const createRequest = (body: any) => {
      return {
        json: jest.fn().mockResolvedValue(body),
      } as unknown as NextRequest
    }

    const createParams = (postId: string) => Promise.resolve({ postId })

    const mockAuthenticatedUser = () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      })
    }

    const mockUnauthenticatedUser = () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })
    }

    describe('Authentication', () => {
      it('should require authentication', async () => {
        mockUnauthenticatedUser()

        const request = createRequest({ voteType: 'up' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(401)
        expect(result.error).toBe('Not authenticated')
      })
    })

    describe('Input validation', () => {
      it('should reject invalid vote types', async () => {
        mockAuthenticatedUser()

        const request = createRequest({ voteType: 'invalid' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('Invalid vote type')
      })

      it('should reject missing vote type', async () => {
        mockAuthenticatedUser()

        const request = createRequest({})
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('Invalid vote type')
      })
    })

    describe('New vote creation', () => {
      it('should create a new upvote', async () => {
        mockAuthenticatedUser()

        // No existing vote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        })

        // Current post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 2 },
          error: null,
        })

        // Updated post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 6, downvotes: 2 },
          error: null,
        })

        // Current vote after update
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'up' },
          error: null,
        })

        const request = createRequest({ voteType: 'up' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.success).toBe(true)
        expect(result.upvotes).toBe(6)
        expect(result.downvotes).toBe(2)
        expect(result.userVote).toBe('up')

        // Verify new vote was inserted
        expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
          post_id: 'post-123',
          user_id: 'user-123',
          vote_type: 'up',
        })

        // Verify post vote count was updated
        expect(mockSupabaseClient.update).toHaveBeenCalledWith({
          upvotes: 6,
          downvotes: 2,
          updated_at: expect.any(String),
        })
      })

      it('should create a new downvote', async () => {
        mockAuthenticatedUser()

        // No existing vote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        // Current post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 2 },
          error: null,
        })

        // Updated post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 3 },
          error: null,
        })

        // Current vote after update
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'down' },
          error: null,
        })

        const request = createRequest({ voteType: 'down' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.upvotes).toBe(5)
        expect(result.downvotes).toBe(3)
        expect(result.userVote).toBe('down')

        // Verify new vote was inserted
        expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
          post_id: 'post-123',
          user_id: 'user-123',
          vote_type: 'down',
        })
      })
    })

    describe('Vote removal', () => {
      it('should remove existing upvote', async () => {
        mockAuthenticatedUser()

        // Existing upvote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'up' },
          error: null,
        })

        // Current post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 6, downvotes: 2 },
          error: null,
        })

        // Updated post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 2 },
          error: null,
        })

        // No vote after removal
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        const request = createRequest({ voteType: 'remove' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.upvotes).toBe(5)
        expect(result.downvotes).toBe(2)
        expect(result.userVote).toBe(null)

        // Verify vote was deleted
        expect(mockSupabaseClient.delete).toHaveBeenCalled()
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('post_id', 'post-123')
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123')
      })

      it('should remove existing downvote', async () => {
        mockAuthenticatedUser()

        // Existing downvote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'down' },
          error: null,
        })

        // Current post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 3 },
          error: null,
        })

        // Updated post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 2 },
          error: null,
        })

        // No vote after removal
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        const request = createRequest({ voteType: 'remove' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(result.upvotes).toBe(5)
        expect(result.downvotes).toBe(2)
        expect(result.userVote).toBe(null)
      })

      it('should handle remove request when no vote exists', async () => {
        mockAuthenticatedUser()

        // No existing vote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        // Current post data (no change expected)
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 2 },
          error: null,
        })

        // No vote after removal
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        const request = createRequest({ voteType: 'remove' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.userVote).toBe(null)

        // Should not delete anything since no vote existed
        expect(mockSupabaseClient.delete).not.toHaveBeenCalled()
        // Should not update post counts since nothing changed
        expect(mockSupabaseClient.update).not.toHaveBeenCalled()
      })
    })

    describe('Vote changes', () => {
      it('should change upvote to downvote', async () => {
        mockAuthenticatedUser()

        // Existing upvote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'up' },
          error: null,
        })

        // Current post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 6, downvotes: 2 },
          error: null,
        })

        // Updated post data (upvote removed, downvote added)
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 3 },
          error: null,
        })

        // Current vote after update
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'down' },
          error: null,
        })

        const request = createRequest({ voteType: 'down' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.upvotes).toBe(5)
        expect(result.downvotes).toBe(3)
        expect(result.userVote).toBe('down')

        // Verify vote was updated (not deleted and re-inserted)
        expect(mockSupabaseClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            vote_type: 'down',
            updated_at: expect.any(String),
          })
        )
        expect(mockSupabaseClient.delete).not.toHaveBeenCalled()
        expect(mockSupabaseClient.insert).not.toHaveBeenCalled()
      })

      it('should change downvote to upvote', async () => {
        mockAuthenticatedUser()

        // Existing downvote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'down' },
          error: null,
        })

        // Current post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 3 },
          error: null,
        })

        // Updated post data (downvote removed, upvote added)
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 6, downvotes: 2 },
          error: null,
        })

        // Current vote after update
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'up' },
          error: null,
        })

        const request = createRequest({ voteType: 'up' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.upvotes).toBe(6)
        expect(result.downvotes).toBe(2)
        expect(result.userVote).toBe('up')
      })
    })

    describe('Duplicate vote handling', () => {
      it('should remove vote when same vote type is submitted', async () => {
        mockAuthenticatedUser()

        // Existing upvote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'up' },
          error: null,
        })

        // Current post data
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 6, downvotes: 2 },
          error: null,
        })

        // Updated post data (upvote removed)
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 5, downvotes: 2 },
          error: null,
        })

        // No vote after removal
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        const request = createRequest({ voteType: 'up' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.upvotes).toBe(5)
        expect(result.userVote).toBe(null)

        // Verify vote was deleted (not updated)
        expect(mockSupabaseClient.delete).toHaveBeenCalled()
      })
    })

    describe('Edge cases and error handling', () => {
      it('should prevent negative vote counts', async () => {
        mockAuthenticatedUser()

        // Existing upvote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { vote_type: 'up' },
          error: null,
        })

        // Current post data with 0 upvotes
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 0, downvotes: 2 },
          error: null,
        })

        // Simulate removal of upvote when count is already 0
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { upvotes: 0, downvotes: 2 },
          error: null,
        })

        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        const request = createRequest({ voteType: 'remove' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.upvotes).toBe(0) // Should not go negative

        // Verify Math.max(0, ...) is applied in update
        expect(mockSupabaseClient.update).toHaveBeenCalledWith({
          upvotes: 0, // Math.max(0, 0 + (-1)) = 0
          downvotes: 2,
          updated_at: expect.any(String),
        })
      })

      it('should handle missing post data gracefully', async () => {
        mockAuthenticatedUser()

        // No existing vote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        // Post not found
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        // Updated post data (fallback)
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        // No vote
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })

        const request = createRequest({ voteType: 'up' })
        const params = createParams('nonexistent-post')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.upvotes).toBe(0) // Fallback to 0
        expect(result.downvotes).toBe(0)
      })

      it('should handle database errors', async () => {
        mockAuthenticatedUser()

        // Database error on existing vote lookup
        mockSupabaseClient.single.mockRejectedValueOnce(new Error('Database error'))

        const request = createRequest({ voteType: 'up' })
        const params = createParams('post-123')
        const response = await POST(request, { params })
        const result = await response.json()

        expect(response.status).toBe(500)
        expect(result.error).toBe('Internal server error')
      })
    })
  })

  describe('GET /api/posts/[postId]/vote', () => {
    const createParams = (postId: string) => Promise.resolve({ postId })

    it('should return vote data for authenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      // Post vote counts
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { upvotes: 10, downvotes: 3 },
        error: null,
      })

      // User's current vote
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { vote_type: 'up' },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/vote')
      const params = createParams('post-123')
      const response = await GET(request, { params })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.upvotes).toBe(10)
      expect(result.downvotes).toBe(3)
      expect(result.userVote).toBe('up')
    })

    it('should return vote data for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      // Post vote counts
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { upvotes: 10, downvotes: 3 },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/vote')
      const params = createParams('post-123')
      const response = await GET(request, { params })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.upvotes).toBe(10)
      expect(result.downvotes).toBe(3)
      expect(result.userVote).toBe(null)

      // Should not query for user vote when not authenticated
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('posts')
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('post_votes')
    })

    it('should return null for user with no vote', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      // Post vote counts
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { upvotes: 10, downvotes: 3 },
        error: null,
      })

      // No user vote found
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/vote')
      const params = createParams('post-123')
      const response = await GET(request, { params })
      const result = await response.json()

      expect(result.userVote).toBe(null)
    })

    it('should handle missing post gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      // Post not found
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })

      // No user vote
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })

      const request = new NextRequest('http://localhost:3000/api/posts/nonexistent/vote')
      const params = createParams('nonexistent')
      const response = await GET(request, { params })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.upvotes).toBe(0) // Fallback
      expect(result.downvotes).toBe(0)
      expect(result.userVote).toBe(null)
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValueOnce(new Error('Auth error'))

      const request = new NextRequest('http://localhost:3000/api/posts/post-123/vote')
      const params = createParams('post-123')
      const response = await GET(request, { params })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Internal server error')
    })
  })
})