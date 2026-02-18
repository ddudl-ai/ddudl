import { renderHook, act, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useWritePostForm } from '../useWritePostForm'

// Mock the dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}))

// Get the fetch mock that's set up in setup.ts
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
}

const mockSearchParams = {
  get: jest.fn(),
}

const mockAuthStore = {
  user: null,
  initialize: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  ;(useAuthStore as jest.Mock).mockReturnValue(mockAuthStore)
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ post: { id: 'test-id' } }),
  })
})

describe('useWritePostForm', () => {
  const defaultOptions = {
    channelName: 'test-channel',
  }

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))
      
      expect(result.current.title).toBe('')
      expect(result.current.content).toBe('')
      expect(result.current.authorName).toBe('ddudl이')
      expect(result.current.selectedFlair).toBe('')
      expect(result.current.submitting).toBe(false)
      expect(result.current.captchaVerified).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.previewMode).toBe(false)
    })

    it('should initialize auth store on mount', () => {
      renderHook(() => useWritePostForm(defaultOptions))
      
      expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1)
    })
  })

  describe('user authentication', () => {
    it('should set author name and verify captcha for authenticated users', () => {
      const authenticatedUser = {
        user_metadata: { username: 'testuser' },
      }
      ;(useAuthStore as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: authenticatedUser,
      })

      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      expect(result.current.authorName).toBe('testuser')
      expect(result.current.captchaVerified).toBe(true)
      expect(result.current.user).toBe(authenticatedUser)
    })

    it('should use default values for anonymous users', () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      expect(result.current.authorName).toBe('ddudl이')
      expect(result.current.captchaVerified).toBe(false)
      expect(result.current.user).toBe(null)
    })
  })

  describe('form validation', () => {
    it('should disable submit when title is empty', () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      expect(result.current.isSubmitDisabled).toBe(true)
      expect(result.current.validation.isValid).toBe(false)
      expect(result.current.validation.errors).toContain('제목은 필수입니다.')
    })

    it('should disable submit when title is too short', () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.setTitle('짧음')
      })

      expect(result.current.isSubmitDisabled).toBe(true)
      expect(result.current.validation.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: '제목은 최소 5자 이상이어야 합니다' })
        ])
      )
    })

    it('should disable submit for anonymous users without captcha', () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.setTitle('유효한 제목입니다')
      })

      expect(result.current.isSubmitDisabled).toBe(true)
      expect(result.current.validation.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'CAPTCHA 인증이 필요합니다' })
        ])
      )
    })

    it('should enable submit when all conditions are met', () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.setTitle('유효한 제목입니다')
        result.current.setCaptchaVerified(true)
      })

      expect(result.current.isSubmitDisabled).toBe(false)
      expect(result.current.validation.isValid).toBe(true)
      expect(result.current.validation.errors).toHaveLength(0)
    })
  })

  describe('form submission', () => {
    it('should submit form successfully and navigate to post', async () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      // Set up valid form data
      act(() => {
        result.current.setTitle('유효한 제목입니다')
        result.current.setContent('테스트 내용')
        result.current.setCaptchaVerified(true)
      })

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.handleSubmit()
      })

      expect(submitResult.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '유효한 제목입니다',
          content: '테스트 내용',
          channelName: 'test-channel',
          authorName: 'ddudl이',
          flair: null,
          captchaVerified: true,
        }),
      })
      expect(mockRouter.push).toHaveBeenCalledWith('/test-channel/posts/test-id')
    })

    it('should handle submission errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: '서버 에러' }),
      })

      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.setTitle('유효한 제목입니다')
        result.current.setCaptchaVerified(true)
      })

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.handleSubmit()
      })

      expect(submitResult.success).toBe(false)
      expect(result.current.error).toBe('서버 에러')
    })

    it('should handle edit mode submission', async () => {
      mockSearchParams.get.mockReturnValue('edit-post-id')

      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.setTitle('수정된 제목')
        result.current.setCaptchaVerified(true)
      })

      await act(async () => {
        await result.current.handleSubmit()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/posts/edit-post-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      })
    })
  })

  describe('file handling', () => {
    it('should handle file selection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          url: 'https://example.com/image.webp',
          processedSize: 1000,
        }),
      })

      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      const mockFile = new File(['image'], 'test.png', { type: 'image/png' })
      const mockFileList = [mockFile] as unknown as FileList

      await act(async () => {
        await result.current.handleFileSelection(mockFileList)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/uploads/image', {
        method: 'POST',
        body: expect.any(FormData),
      })

      await waitFor(() => {
        expect(result.current.images).toContain('https://example.com/image.webp')
        expect(result.current.pastedImages).toHaveLength(1)
        expect(result.current.pastedImages[0]).toEqual({
          url: 'https://example.com/image.webp',
          fileName: 'test.png',
          size: 1000,
        })
      })
    })

    it('should handle file upload errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: '업로드 실패' }),
      })

      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      const mockFile = new File(['image'], 'test.png', { type: 'image/png' })
      const mockFileList = [mockFile] as unknown as FileList

      await act(async () => {
        await result.current.handleFileSelection(mockFileList)
      })

      expect(result.current.error).toBe('업로드 실패')
    })
  })

  describe('link preview generation', () => {
    it('should generate link previews for valid URLs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          title: 'Test Page',
          description: 'Test description',
          image: 'https://example.com/image.jpg',
        }),
      })

      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.setContent('https://example.com\n')
      })

      await waitFor(() => {
        expect(result.current.linkPreviews).toHaveLength(1)
        expect(result.current.linkPreviews[0]).toEqual({
          url: 'https://example.com',
          title: 'Test Page',
          description: 'Test description',
          image: 'https://example.com/image.jpg',
        })
      })
    })

    it('should handle link preview errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      })

      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.setContent('https://invalid-example.com\n')
      })

      await waitFor(() => {
        expect(result.current.linkPreviews).toHaveLength(1)
        expect(result.current.linkPreviews[0]).toEqual({
          url: 'https://invalid-example.com',
          error: true,
        })
      })
    })
  })

  describe('anonymous user detection', () => {
    it('should detect anonymous users correctly', () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      expect(result.current.isAnonymous).toBe(true)

      act(() => {
        result.current.setAuthorName('ddudl이123')
      })

      expect(result.current.isAnonymous).toBe(true)

      act(() => {
        result.current.setAuthorName('실명User')
      })

      expect(result.current.isAnonymous).toBe(false)
    })
  })

  describe('form actions', () => {
    it('should handle cancel action', () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.handleCancel()
      })

      expect(mockRouter.back).toHaveBeenCalledTimes(1)
    })

    it('should reset captcha when author name changes for anonymous users', () => {
      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.setCaptchaVerified(true)
      })

      expect(result.current.captchaVerified).toBe(true)

      act(() => {
        result.current.setAuthorName('새이름')
      })

      expect(result.current.captchaVerified).toBe(false)
    })

    it('should not reset captcha for authenticated users', () => {
      ;(useAuthStore as jest.Mock).mockReturnValue({
        ...mockAuthStore,
        user: { user_metadata: { username: 'testuser' } },
      })

      const { result } = renderHook(() => useWritePostForm(defaultOptions))

      act(() => {
        result.current.setAuthorName('새이름')
      })

      expect(result.current.captchaVerified).toBe(true)
    })
  })
})