import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../authStore'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    })),
  },
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock btoa for email hashing
global.btoa = jest.fn((str) => Buffer.from(str).toString('base64'))

// Mock fetch
global.fetch = jest.fn()

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      profile: null,
      isLoading: true,
      isAdmin: false,
    })
  })

  describe('Initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore())

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAdmin).toBe(false)
    })
  })

  describe('signUp', () => {
    it('should successfully sign up a user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' }
      }

      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const { result } = renderHook(() => useAuthStore())

      const response = await act(async () => {
        return result.current.signUp('test@example.com', 'password123', 'testuser')
      })

      expect(response.success).toBe(true)
      expect(result.current.user).toEqual(mockUser)

      // Verify Supabase signUp was called correctly
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
          options: expect.objectContaining({
            data: { username: 'testuser' }
          })
        })
      )

      // Verify profile creation API was called
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/profile', expect.objectContaining({
        method: 'POST',
      }))
      const fetchCall = (global.fetch as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === '/api/auth/profile'
      )
      expect(fetchCall).toBeTruthy()
      const body = JSON.parse(fetchCall[1].body)
      expect(body.userId).toBe('user-123')
      expect(body.username).toBe('testuser')
      expect(typeof body.emailHash).toBe('string')
    })

    it('should handle Supabase auth signup errors', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid email format' },
      })

      const { result } = renderHook(() => useAuthStore())

      const response = await act(async () => {
        return result.current.signUp('invalid-email', 'password123', 'testuser')
      })

      expect(response.success).toBe(false)
      expect(response.error).toBe('Invalid email format')
      expect(result.current.user).toBeNull()
    })

    it('should handle profile creation failure', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' }
      }

      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      // Mock sign out for cleanup
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({})

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Profile creation failed' }),
      })

      const { result } = renderHook(() => useAuthStore())

      const response = await act(async () => {
        return result.current.signUp('test@example.com', 'password123', 'testuser')
      })

      expect(response.success).toBe(false)
      expect(response.error).toBe('Profile creation failed: Profile creation failed')
      
      // Should sign out the auth user when profile creation fails
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should handle signup exceptions', async () => {
      mockSupabaseClient.auth.signUp.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuthStore())

      const response = await act(async () => {
        return result.current.signUp('test@example.com', 'password123', 'testuser')
      })

      expect(response.success).toBe(false)
      expect(response.error).toBe('Network error')
    })
  })

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' }
      }

      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        email_hash: 'hash123',
        role: 'user',
        is_admin: false,
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockProfile }),
      })

      const { result } = renderHook(() => useAuthStore())

      const response = await act(async () => {
        return result.current.signIn('test@example.com', 'password123')
      })

      expect(response.success).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toEqual(mockProfile)
      expect(result.current.isAdmin).toBe(false)

      // Verify profile fetch was called
      expect(global.fetch).toHaveBeenCalledWith('/api/users/profile?username=testuser')
    })

    it('should detect admin users', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        user_metadata: { username: 'admin' }
      }

      const mockAdminProfile = {
        id: 'admin-123',
        username: 'admin',
        email_hash: 'hash123',
        role: 'admin',
        is_admin: true,
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockAdminProfile }),
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.signIn('admin@example.com', 'password123')
      })

      expect(result.current.isAdmin).toBe(true)
    })

    it('should handle signin errors', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      })

      const { result } = renderHook(() => useAuthStore())

      const response = await act(async () => {
        return result.current.signIn('test@example.com', 'wrongpassword')
      })

      expect(response.success).toBe(false)
      expect(response.error).toBe('Invalid credentials')
      expect(result.current.user).toBeNull()
    })

    it('should handle profile fetch failures gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' }
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const { result } = renderHook(() => useAuthStore())

      const response = await act(async () => {
        return result.current.signIn('test@example.com', 'password123')
      })

      expect(response.success).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toBeNull() // Profile fetch failed, but signin still succeeded
    })

    it('should fallback to email username when no metadata username', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {}
      }

      const mockProfile = {
        id: 'user-123',
        username: 'test',
        email_hash: 'hash123',
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockProfile }),
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123')
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/users/profile?username=test')
    })
  })

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      // Set initial state with user logged in
      useAuthStore.setState({
        user: { id: 'user-123' } as any,
        profile: { id: 'user-123', username: 'testuser' } as any,
        isAnonymous: false,
        isAdmin: true,
      })

      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({})

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.isAdmin).toBe(false)
    })

    it('should handle signout errors gracefully', async () => {
      mockSupabaseClient.auth.signOut.mockRejectedValueOnce(new Error('Signout failed'))

      const { result } = renderHook(() => useAuthStore())

      // Should not throw
      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.user).toBeNull()
    })
  })

  describe('initialize', () => {
    it('should initialize with existing session', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' }
      }

      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        email_hash: 'hash123',
      }

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: mockUser } },
      })

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: jest.fn() } }
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockProfile }),
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toEqual(mockProfile)
      expect(result.current.isLoading).toBe(false)
      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled()
    })

    it('should initialize without session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
      })

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: jest.fn() } }
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAdmin).toBe(false)
    })

    it('should handle initialization errors', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValueOnce(new Error('Session error'))

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle auth state changes', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' }
      }

      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        email_hash: 'hash123',
      }

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
      })

      let authChangeCallback: any
      mockSupabaseClient.auth.onAuthStateChange.mockImplementationOnce((callback) => {
        authChangeCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockProfile }),
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.initialize()
      })

      // Initial state should be null
      expect(result.current.user).toBeNull()

      // Simulate auth state change
      await act(async () => {
        await authChangeCallback('SIGNED_IN', { user: mockUser })
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toEqual(mockProfile)
    })
  })

  // setAnonymous was removed from the store

  describe('Edge cases and error handling', () => {
    it('should handle missing user metadata gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: null
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      const { result } = renderHook(() => useAuthStore())

      const response = await act(async () => {
        return result.current.signIn('test@example.com', 'password123')
      })

      expect(response.success).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      // Store may still attempt profile fetch even without user_metadata
    })

    it('should handle fetch network errors during profile fetch', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' }
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuthStore())

      const response = await act(async () => {
        return result.current.signIn('test@example.com', 'password123')
      })

      expect(response.success).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toBeNull()
    })

    it('should handle both role and is_admin fields for admin detection', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' }
      }

      // Test with role field
      const mockProfileWithRole = {
        id: 'user-123',
        username: 'testuser',
        role: 'admin',
        is_admin: false, // Even though is_admin is false, role should take precedence
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockProfileWithRole }),
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123')
      })

      expect(result.current.isAdmin).toBe(true)
    })
  })

  describe('Store persistence', () => {
    // isAnonymous/setAnonymous removed from store — persist test skipped
  })
})