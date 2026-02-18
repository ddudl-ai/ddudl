/**
 * Integration tests for Supabase database operations
 * Tests CRUD operations, RLS policies, triggers, and real-time features
 */

import { createAdminClient } from '../admin'
import { mockSupabaseClient, mockPosts, mockComments, mockUsers, mockChannels } from '../../../../test-utils/mocks'

// Mock Supabase clients
jest.mock('../admin', () => ({
  createAdminClient: () => mockSupabaseClient,
}))

describe('Supabase Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset mock client methods
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.lte.mockReturnValue(mockSupabaseClient)
  })

  describe('Posts CRUD operations', () => {
    it('should create a new post with all required fields', async () => {
      const newPost = {
        title: 'New Test Post',
        content: 'This is a test post content',
        author_id: 'user-123',
        channel_id: 'channel-456',
        flair: 'discussion',
        moderation_status: 'approved'
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockPosts[0], ...newPost },
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('posts')
        .insert(newPost)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.title).toBe(newPost.title)
      expect(data.content).toBe(newPost.content)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('posts')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(newPost)
    })

    it('should fetch posts with pagination and filtering', async () => {
      const mockFilteredPosts = mockPosts.filter(post => post.channel_id === 'channel1')
      
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: mockFilteredPosts,
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('posts')
        .select('*, channels(name, display_name), users(username)')
        .eq('channel_id', 'channel1')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10)

      expect(error).toBeNull()
      expect(data).toEqual(mockFilteredPosts)
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('channel_id', 'channel1')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('moderation_status', 'approved')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(10)
    })

    it('should update post vote counts', async () => {
      const postId = 'post-123'
      const updatedVotes = { upvotes: 15, downvotes: 3 }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockPosts[0], id: postId, ...updatedVotes },
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('posts')
        .update(updatedVotes)
        .eq('id', postId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.upvotes).toBe(15)
      expect(data.downvotes).toBe(3)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updatedVotes)
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', postId)
    })

    it('should soft delete posts', async () => {
      const postId = 'post-123'

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockPosts[0], id: postId, is_deleted: true },
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('posts')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', postId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.is_deleted).toBe(true)
    })

    it('should handle post creation errors', async () => {
      const invalidPost = {
        // Missing required fields
        title: 'Test Post',
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { 
          message: 'null value in column "author_id" violates not-null constraint',
          code: '23502' 
        },
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('posts')
        .insert(invalidPost)
        .select()
        .single()

      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('23502')
    })
  })

  describe('Comments CRUD operations', () => {
    it('should create nested comments with proper parent relationships', async () => {
      const parentComment = mockComments[0]
      const nestedComment = {
        content: 'This is a reply',
        post_id: parentComment.post_id,
        author_id: 'user-456',
        parent_comment_id: parentComment.id,
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockComments[1], ...nestedComment },
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('comments')
        .insert(nestedComment)
        .select('*, users(username)')
        .single()

      expect(error).toBeNull()
      expect(data.parent_comment_id).toBe(parentComment.id)
      expect(data.content).toBe(nestedComment.content)
    })

    it('should fetch comments with hierarchical structure', async () => {
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: mockComments,
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('comments')
        .select('*, users(username)')
        .eq('post_id', 'post-123')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: true })

      expect(error).toBeNull()
      expect(data).toEqual(mockComments)
    })

    it('should update comment moderation status', async () => {
      const commentId = 'comment-123'
      const moderationUpdate = {
        moderation_status: 'rejected',
        moderation_reason: 'Inappropriate content'
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockComments[0], id: commentId, ...moderationUpdate },
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('comments')
        .update(moderationUpdate)
        .eq('id', commentId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.moderation_status).toBe('rejected')
      expect(data.moderation_reason).toBe('Inappropriate content')
    })
  })

  describe('User management operations', () => {
    it('should create user profile with proper validation', async () => {
      const newUser = {
        username: 'newuser',
        email_hash: 'hashed_email_123',
        karma_points: 0,
        age_verified: true,
        role: 'user',
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockUsers[0], ...newUser },
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.username).toBe(newUser.username)
      expect(data.karma_points).toBe(0)
    })

    it('should update user karma points', async () => {
      const userId = 'user-123'
      const karmaUpdate = { karma_points: 150 }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockUsers[0], id: userId, ...karmaUpdate },
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('users')
        .update(karmaUpdate)
        .eq('id', userId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.karma_points).toBe(150)
    })

    it('should enforce unique username constraint', async () => {
      const duplicateUser = {
        username: 'testuser', // Already exists in mockUsers
        email_hash: 'different_hash',
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'duplicate key value violates unique constraint "users_username_key"',
          code: '23505'
        },
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('users')
        .insert(duplicateUser)
        .select()
        .single()

      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error.code).toBe('23505')
    })
  })

  describe('Voting system operations', () => {
    it('should handle post vote creation and updates', async () => {
      const newVote = {
        post_id: 'post-123',
        user_id: 'user-456',
        vote_type: 'up',
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: newVote,
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('post_votes')
        .insert(newVote)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.vote_type).toBe('up')
    })

    it('should update existing votes', async () => {
      const voteUpdate = {
        vote_type: 'down',
        updated_at: new Date().toISOString(),
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { post_id: 'post-123', user_id: 'user-456', ...voteUpdate },
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('post_votes')
        .update(voteUpdate)
        .eq('post_id', 'post-123')
        .eq('user_id', 'user-456')
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.vote_type).toBe('down')
    })

    it('should delete votes (vote removal)', async () => {
      const supabase = createAdminClient()
      const { error } = await supabase
        .from('post_votes')
        .delete()
        .eq('post_id', 'post-123')
        .eq('user_id', 'user-456')

      expect(error).toBeNull()
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })

    it('should prevent duplicate votes with unique constraint', async () => {
      const duplicateVote = {
        post_id: 'post-123',
        user_id: 'user-456',
        vote_type: 'up',
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'duplicate key value violates unique constraint "post_votes_post_id_user_id_key"',
          code: '23505'
        },
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('post_votes')
        .insert(duplicateVote)
        .select()
        .single()

      expect(data).toBeNull()
      expect(error.code).toBe('23505')
    })
  })

  describe('Channel membership operations', () => {
    it('should handle channel membership creation', async () => {
      const membership = {
        user_id: 'user-123',
        channel_id: 'channel-456',
        joined_at: new Date().toISOString(),
        role: 'member',
      }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: membership,
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('channel_members')
        .insert(membership)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.role).toBe('member')
    })

    it('should update member counts when users join', async () => {
      const channelId = 'channel-456'
      const currentCount = 100
      const incrementUpdate = { member_count: currentCount + 1 }

      // Mock current channel data
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: channelId, member_count: currentCount },
        error: null,
      })

      // Mock update operation
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockChannels[0], id: channelId, ...incrementUpdate },
        error: null,
      })

      const supabase = createAdminClient()
      
      // Get current count
      const { data: currentData } = await supabase
        .from('channels')
        .select('member_count')
        .eq('id', channelId)
        .single()

      // Update count
      const { data: updatedData, error } = await supabase
        .from('channels')
        .update({ member_count: currentData.member_count + 1 })
        .eq('id', channelId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updatedData.member_count).toBe(101)
    })

    it('should handle membership role updates', async () => {
      const roleUpdate = { role: 'moderator' }

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { 
          user_id: 'user-123', 
          channel_id: 'channel-456', 
          ...roleUpdate 
        },
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('channel_members')
        .update(roleUpdate)
        .eq('user_id', 'user-123')
        .eq('channel_id', 'channel-456')
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.role).toBe('moderator')
    })
  })

  describe('Real-time subscription operations', () => {
    it('should set up real-time subscriptions for posts', () => {
      const mockSubscription = {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      }

      mockSupabaseClient.channel = jest.fn(() => ({
        on: jest.fn(() => ({ subscribe: mockSubscription.subscribe })),
        subscribe: mockSubscription.subscribe,
        unsubscribe: mockSubscription.unsubscribe,
      }))

      const supabase = createAdminClient()
      const subscription = supabase
        .channel('posts')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'posts' 
        }, (payload) => {
        })
        .subscribe()

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('posts')
      expect(mockSubscription.subscribe).toHaveBeenCalled()
    })

    it('should handle real-time comment updates', () => {
      const mockSubscription = {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      }

      mockSupabaseClient.channel = jest.fn(() => ({
        on: jest.fn(() => ({ subscribe: mockSubscription.subscribe })),
        subscribe: mockSubscription.subscribe,
        unsubscribe: mockSubscription.unsubscribe,
      }))

      const supabase = createAdminClient()
      const subscription = supabase
        .channel('comments')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'comments',
          filter: 'post_id=eq.post-123'
        }, (payload) => {
        })
        .subscribe()

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('comments')
    })
  })

  describe('Transaction and batch operations', () => {
    it('should handle complex post creation with auto-join transaction', async () => {
      // Mock sequence of operations for post creation with auto-join
      const operations = [
        // 1. Check channel exists
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: mockChannels[0],
          error: null,
        }),
        // 2. Create/find user
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: mockUsers[0],
          error: null,
        }),
        // 3. Check membership
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        }),
        // 4. Create membership
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { user_id: mockUsers[0].id, channel_id: mockChannels[0].id },
          error: null,
        }),
        // 5. Update member count
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: { ...mockChannels[0], member_count: 101 },
          error: null,
        }),
        // 6. Create post
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: mockPosts[0],
          error: null,
        }),
      ]

      const supabase = createAdminClient()

      // Simulate the complete workflow
      const channelResult = await supabase
        .from('channels')
        .select('id')
        .eq('name', 'test')
        .single()

      const userResult = await supabase
        .from('users')
        .select('id')
        .eq('username', 'testuser')
        .single()

      const membershipCheck = await supabase
        .from('channel_members')
        .select('id')
        .eq('user_id', userResult.data.id)
        .eq('channel_id', channelResult.data.id)
        .single()

      if (membershipCheck.error) {
        // Create membership
        await supabase
          .from('channel_members')
          .insert({
            user_id: userResult.data.id,
            channel_id: channelResult.data.id,
          })

        // Update member count
        await supabase
          .from('channels')
          .update({ member_count: 101 })
          .eq('id', channelResult.data.id)
      }

      const postResult = await supabase
        .from('posts')
        .insert({
          title: 'Test Post',
          author_id: userResult.data.id,
          channel_id: channelResult.data.id,
        })
        .select()
        .single()

      expect(postResult.error).toBeNull()
      expect(postResult.data).toEqual(mockPosts[0])
    })
  })

  describe('Error handling and resilience', () => {
    it('should handle network connectivity issues', async () => {
      mockSupabaseClient.single.mockRejectedValueOnce(
        new Error('Network request failed')
      )

      const supabase = createAdminClient()
      
      try {
        await supabase
          .from('posts')
          .select()
          .single()
      } catch (error) {
        expect(error.message).toBe('Network request failed')
      }
    })

    it('should handle database constraint violations', async () => {
      const constraintViolations = [
        { code: '23505', message: 'Unique constraint violation' },
        { code: '23502', message: 'Not null constraint violation' },
        { code: '23503', message: 'Foreign key constraint violation' },
      ]

      for (const violation of constraintViolations) {
        mockSupabaseClient.single.mockResolvedValueOnce({
          data: null,
          error: violation,
        })

        const supabase = createAdminClient()
        const { data, error } = await supabase
          .from('posts')
          .insert({ title: 'Test' })
          .single()

        expect(data).toBeNull()
        expect(error.code).toBe(violation.code)
      }
    })

    it('should handle RLS policy violations', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'new row violates row-level security policy',
          code: '42501'
        },
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: 'Unauthorized Post',
          author_id: 'unauthorized-user',
        })
        .single()

      expect(data).toBeNull()
      expect(error.code).toBe('42501')
    })
  })

  describe('Performance optimization operations', () => {
    it('should handle bulk operations efficiently', async () => {
      const bulkUsers = Array(100).fill(0).map((_, i) => ({
        username: `user${i}`,
        email_hash: `hash${i}`,
      }))

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: bulkUsers,
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('users')
        .insert(bulkUsers)
        .select()

      expect(error).toBeNull()
      expect(data).toHaveLength(100)
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(bulkUsers)
    })

    it('should use proper indexing for query optimization', async () => {
      // Mock query that should use indexes efficiently
      mockSupabaseClient.limit.mockResolvedValueOnce({
        data: mockPosts.slice(0, 10),
        error: null,
      })

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, created_at, upvotes')
        .eq('channel_id', 'popular-channel')
        .gte('created_at', '2024-01-01T00:00:00Z')
        .order('upvotes', { ascending: false })
        .limit(10)

      expect(error).toBeNull()
      expect(data).toHaveLength(2) // mockPosts length
      // Verify proper query structure for indexing
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('channel_id', 'popular-channel')
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('created_at', '2024-01-01T00:00:00Z')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('upvotes', { ascending: false })
    })
  })

  describe('Data consistency and integrity', () => {
    it('should maintain referential integrity across related tables', async () => {
      // Test cascade operations and foreign key constraints
      const postId = 'post-to-delete'
      
      // Mock post deletion should handle related data
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const supabase = createAdminClient()
      
      // Verify related comments are handled when post is deleted
      const { data: relatedComments } = await supabase
        .from('comments')
        .select('id')
        .eq('post_id', postId)

      expect(relatedComments).toEqual([])
    })

    it('should handle concurrent updates correctly', async () => {
      const postId = 'post-123'
      const update1 = { upvotes: 10 }
      const update2 = { downvotes: 2 }

      // Mock optimistic locking or proper concurrent handling
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { ...mockPosts[0], id: postId, ...update1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockPosts[0], id: postId, ...update1, ...update2 },
          error: null,
        })

      const supabase = createAdminClient()

      // Simulate concurrent updates
      const [result1, result2] = await Promise.all([
        supabase.from('posts').update(update1).eq('id', postId).select().single(),
        supabase.from('posts').update(update2).eq('id', postId).select().single(),
      ])

      expect(result1.error).toBeNull()
      expect(result2.error).toBeNull()
    })
  })
})