// T010: Unit test for useImageUpload hook - TDD Phase
// This test MUST FAIL before implementation

import { renderHook, act, waitFor } from '@testing-library/react'
import { useImageUpload } from '../useImageUpload'

describe('useImageUpload', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useImageUpload())

      expect(result.current.images).toEqual([])
      expect(result.current.uploading).toBe(false)
      expect(result.current.uploadProgress).toBe(0)
      expect(result.current.error).toBeNull()
    })

    it('should respect maxImages configuration', () => {
      const { result } = renderHook(() => useImageUpload({ maxImages: 3 }))

      expect(result.current.maxImages).toBe(3)
      expect(result.current.canAddMore).toBe(true)
    })
  })

  describe('File Validation', () => {
    it('should validate file type', async () => {
      const { result } = renderHook(() => useImageUpload())

      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      await act(async () => {
        const uploadResult = await result.current.uploadImage(invalidFile)
        expect(uploadResult.success).toBe(false)
        expect(uploadResult.error).toContain('Invalid file type')
      })
    })

    it('should validate file size', async () => {
      const { result } = renderHook(() => useImageUpload({ maxFileSize: 1024 })) // 1KB

      const largeFile = new File(
        [new ArrayBuffer(2048)], // 2KB
        'large.jpg',
        { type: 'image/jpeg' }
      )

      await act(async () => {
        const uploadResult = await result.current.uploadImage(largeFile)
        expect(uploadResult.success).toBe(false)
        expect(uploadResult.error).toContain('File too large')
      })
    })

    it('should accept valid image files', async () => {
      const { result } = renderHook(() => useImageUpload())

      const validFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: 'https://example.com/image.webp',
          processedSize: 1000,
          originalSize: 2000,
          compressionRatio: 50,
          format: 'webp'
        })
      })

      await act(async () => {
        const uploadResult = await result.current.uploadImage(validFile)
        expect(uploadResult.success).toBe(true)
        expect(uploadResult.url).toBe('https://example.com/image.webp')
      })
    })
  })

  describe('Upload Process', () => {
    it('should handle upload progress', async () => {
      const { result } = renderHook(() => useImageUpload())

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })

      ;(global.fetch as jest.Mock).mockImplementation(() => {
        // Simulate progress updates via hook's onProgress callback
        setTimeout(() => result.current.onProgress?.(25), 0)
        setTimeout(() => result.current.onProgress?.(50), 0)

        return Promise.resolve({
          ok: true,
          json: async () => ({
            url: 'https://example.com/image.webp',
            processedSize: 1000
          })
        })
      })

      await act(async () => {
        await result.current.uploadImage(file)
      })

      // After upload, uploadProgress should be 100 (set at completion)
      await waitFor(() => {
        expect(result.current.uploadProgress).toBeGreaterThan(0)
      })
    })

    it('should set uploading state during upload', async () => {
      const { result } = renderHook(() => useImageUpload())

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })

      let resolveFetch!: (val: any) => void
      ;(global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => {
          resolveFetch = resolve
        })
      )

      // Start upload without awaiting it (void discards the promise)
      await act(async () => {
        void result.current.uploadImage(file)
      })

      // After act flushes, setUploading(true) should be committed
      expect(result.current.uploading).toBe(true)

      // Resolve the pending fetch
      await act(async () => {
        resolveFetch({
          ok: true,
          json: async () => ({ success: true, files: ['https://example.com/image.webp'] })
        })
      })

      expect(result.current.uploading).toBe(false)
    })

    it('should handle upload errors', async () => {
      const { result } = renderHook(() => useImageUpload({ maxRetries: 0 }))

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Upload failed' })
      })

      await act(async () => {
        const uploadResult = await result.current.uploadImage(file)
        expect(uploadResult.success).toBe(false)
        expect(uploadResult.error).toContain('Upload failed')
      })

      expect(result.current.error).toContain('Upload failed')
      expect(result.current.uploading).toBe(false)
    })

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useImageUpload({ maxRetries: 0 }))

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        const uploadResult = await result.current.uploadImage(file)
        expect(uploadResult.success).toBe(false)
        expect(uploadResult.error).toContain('Network error')
      })

      expect(result.current.error).toContain('Network error')
    })
  })

  describe('Image Management', () => {
    it('should add uploaded image to state', async () => {
      const { result } = renderHook(() => useImageUpload())

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: 'https://example.com/image1.webp',
          processedSize: 1000
        })
      })

      await act(async () => {
        await result.current.uploadImage(file)
      })

      expect(result.current.images).toHaveLength(1)
      expect(result.current.images[0]).toMatchObject({
        url: 'https://example.com/image1.webp',
        status: 'uploaded'
      })
    })

    it('should enforce maxImages limit', async () => {
      const { result } = renderHook(() => useImageUpload({ maxImages: 2 }))

      const file1 = new File(['image1'], 'test1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['image2'], 'test2.jpg', { type: 'image/jpeg' })
      const file3 = new File(['image3'], 'test3.jpg', { type: 'image/jpeg' })

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image1.webp' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image2.webp' })
        })

      await act(async () => {
        await result.current.uploadImage(file1)
        await result.current.uploadImage(file2)
      })

      expect(result.current.images).toHaveLength(2)
      expect(result.current.canAddMore).toBe(false)

      await act(async () => {
        const uploadResult = await result.current.uploadImage(file3)
        expect(uploadResult.success).toBe(false)
        expect(uploadResult.error).toContain('Maximum number of images')
      })

      expect(result.current.images).toHaveLength(2)
    })

    it('should remove image from state', async () => {
      const { result } = renderHook(() => useImageUpload())

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: 'https://example.com/image1.webp',
          processedSize: 1000
        })
      })

      await act(async () => {
        await result.current.uploadImage(file)
      })

      expect(result.current.images).toHaveLength(1)

      act(() => {
        result.current.removeImage('https://example.com/image1.webp')
      })

      expect(result.current.images).toHaveLength(0)
    })

    it('should reorder images', async () => {
      const { result } = renderHook(() => useImageUpload())

      // Upload two images
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image1.webp' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image2.webp' })
        })

      await act(async () => {
        await result.current.uploadImage(new File(['1'], '1.jpg', { type: 'image/jpeg' }))
        await result.current.uploadImage(new File(['2'], '2.jpg', { type: 'image/jpeg' }))
      })

      expect(result.current.images[0].url).toBe('https://example.com/image1.webp')
      expect(result.current.images[1].url).toBe('https://example.com/image2.webp')

      act(() => {
        result.current.reorderImages(1, 0) // Move second image to first position
      })

      expect(result.current.images[0].url).toBe('https://example.com/image2.webp')
      expect(result.current.images[1].url).toBe('https://example.com/image1.webp')
    })

    it('should clear all images', async () => {
      const { result } = renderHook(() => useImageUpload())

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image1.webp' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image2.webp' })
        })

      await act(async () => {
        await result.current.uploadImage(new File(['1'], '1.jpg', { type: 'image/jpeg' }))
        await result.current.uploadImage(new File(['2'], '2.jpg', { type: 'image/jpeg' }))
      })

      expect(result.current.images).toHaveLength(2)

      act(() => {
        result.current.clearImages()
      })

      expect(result.current.images).toHaveLength(0)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Abort Upload', () => {
    it('should support aborting upload', async () => {
      const { result } = renderHook(() => useImageUpload())

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })

      let abortSignal: AbortSignal | undefined

      ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
        abortSignal = options?.signal
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (abortSignal?.aborted) {
              reject(new Error('Aborted'))
            } else {
              resolve({
                ok: true,
                json: async () => ({ url: 'https://example.com/image.webp' })
              })
            }
          }, 1000)
        })
      })

      let uploadPromise: Promise<any>

      act(() => {
        uploadPromise = result.current.uploadImage(file)
      })

      act(() => {
        result.current.abortUpload()
      })

      await act(async () => {
        const uploadResult = await uploadPromise
        expect(uploadResult.success).toBe(false)
        expect(uploadResult.error).toContain('Aborted')
      })
    })
  })

  describe('Batch Upload', () => {
    it('should support batch upload', async () => {
      const { result } = renderHook(() => useImageUpload())

      const files = [
        new File(['1'], '1.jpg', { type: 'image/jpeg' }),
        new File(['2'], '2.jpg', { type: 'image/jpeg' }),
        new File(['3'], '3.jpg', { type: 'image/jpeg' })
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image1.webp' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image2.webp' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image3.webp' })
        })

      await act(async () => {
        const results = await result.current.uploadBatch(files)
        expect(results).toHaveLength(3)
        expect(results.every(r => r.success)).toBe(true)
      })

      expect(result.current.images).toHaveLength(3)
    })

    it('should handle partial batch failure', async () => {
      const { result } = renderHook(() => useImageUpload({ maxRetries: 0 }))

      const files = [
        new File(['1'], '1.jpg', { type: 'image/jpeg' }),
        new File(['2'], '2.jpg', { type: 'image/jpeg' }),
        new File(['3'], '3.jpg', { type: 'image/jpeg' })
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image1.webp' })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Upload failed' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/image3.webp' })
        })

      await act(async () => {
        const results = await result.current.uploadBatch(files)
        expect(results).toHaveLength(3)
        expect(results[0].success).toBe(true)
        expect(results[1].success).toBe(false)
        expect(results[2].success).toBe(true)
      })

      expect(result.current.images).toHaveLength(2)
    })
  })

  describe('Retry Logic', () => {
    it('should retry failed uploads', async () => {
      const { result } = renderHook(() => useImageUpload({ maxRetries: 2 }))

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      let attempts = 0

      ;(global.fetch as jest.Mock).mockImplementation(() => {
        attempts++
        if (attempts < 2) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ url: 'https://example.com/image.webp' })
        })
      })

      await act(async () => {
        const uploadResult = await result.current.uploadImage(file)
        expect(uploadResult.success).toBe(true)
        expect(uploadResult.url).toBe('https://example.com/image.webp')
      })

      expect(attempts).toBe(2)
    })

    it('should fail after max retries', async () => {
      const { result } = renderHook(() => useImageUpload({ maxRetries: 2 }))

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      let attempts = 0

      ;(global.fetch as jest.Mock).mockImplementation(() => {
        attempts++
        return Promise.reject(new Error('Network error'))
      })

      await act(async () => {
        const uploadResult = await result.current.uploadImage(file)
        expect(uploadResult.success).toBe(false)
        expect(uploadResult.error).toContain('Network error')
      })

      expect(attempts).toBe(3) // Initial + 2 retries
    })
  })
})