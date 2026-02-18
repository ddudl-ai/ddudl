import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useClipboardPaste } from '../useClipboardPaste'

// Mock imageProcessor utilities
jest.mock('@/lib/utils/imageProcessor', () => ({
  getImageFromPasteEvent: jest.fn(),
  formatFileSize: jest.fn((size: number) => `${size} bytes`)
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('useClipboardPaste Hook Tests', () => {
  const mockOnImagePaste = jest.fn()
  const mockOnError = jest.fn()
  const mockOnUploadStart = jest.fn()
  const mockOnUploadEnd = jest.fn()

  const defaultOptions = {
    onImagePaste: mockOnImagePaste,
    onError: mockOnError,
    onUploadStart: mockOnUploadStart,
    onUploadEnd: mockOnUploadEnd,
    enabled: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful fetch response by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        url: 'https://example.com/uploaded-image.webp',
        processedSize: 50000,
        compressionRatio: 30
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should initialize hook with default options', () => {
      const { result } = renderHook(() => useClipboardPaste({}))

      expect(result.current.checkClipboard).toBeInstanceOf(Function)
    })

    it('should attach paste event listener when enabled', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useClipboardPaste(defaultOptions))

      expect(addEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function))
    })

    it('should not attach event listener when disabled', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')

      renderHook(() => useClipboardPaste({ ...defaultOptions, enabled: false }))

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('paste', expect.any(Function))
    })
  })

  describe('Image Paste Handling', () => {
    it('should handle successful image paste', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')
      const mockImageFile = new File(['image-data'], 'test.jpg', { type: 'image/jpeg' })

      getImageFromPasteEvent.mockReturnValue(mockImageFile)

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockOnUploadStart).toHaveBeenCalledWith('test.jpg')
      expect(mockFetch).toHaveBeenCalledWith('/api/uploads/image', {
        method: 'POST',
        body: expect.any(FormData)
      })
      expect(mockOnImagePaste).toHaveBeenCalledWith(
        'https://example.com/uploaded-image.webp',
        'test.jpg',
        50000
      )
      expect(mockOnUploadEnd).toHaveBeenCalled()
      expect(mockPasteEvent.preventDefault).toHaveBeenCalled()
    })

    it('should ignore paste events on input elements', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: { tagName: 'INPUT' }
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(getImageFromPasteEvent).not.toHaveBeenCalled()
      expect(mockOnUploadStart).not.toHaveBeenCalled()
      expect(mockPasteEvent.preventDefault).not.toHaveBeenCalled()
    })

    it('should ignore paste events on textarea elements', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: { tagName: 'TEXTAREA' }
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(getImageFromPasteEvent).not.toHaveBeenCalled()
    })

    it('should ignore non-image paste events', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')

      getImageFromPasteEvent.mockReturnValue(null)

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockOnUploadStart).not.toHaveBeenCalled()
      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockPasteEvent.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('Upload Handling', () => {
    it('should handle upload success with all response data', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')
      const mockImageFile = new File(['image-data'], 'photo.png', { type: 'image/png' })

      getImageFromPasteEvent.mockReturnValue(mockImageFile)

      const mockResponse = {
        url: 'https://cdn.example.com/optimized.webp',
        processedSize: 75000,
        compressionRatio: 45
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      })

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockOnImagePaste).toHaveBeenCalledWith(
        'https://cdn.example.com/optimized.webp',
        'photo.png',
        75000
      )
    })

    it('should fallback to original file size when processedSize is not available', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')
      const mockImageFile = new File(['image-data'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockImageFile, 'size', { value: 100000 })

      getImageFromPasteEvent.mockReturnValue(mockImageFile)

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          url: 'https://example.com/uploaded.webp'
          // No processedSize
        })
      })

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockOnImagePaste).toHaveBeenCalledWith(
        'https://example.com/uploaded.webp',
        'large.jpg',
        100000
      )
    })

    it('should handle upload failure with error response', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')
      const mockImageFile = new File(['image-data'], 'test.jpg', { type: 'image/jpeg' })

      getImageFromPasteEvent.mockReturnValue(mockImageFile)

      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'File too large'
        })
      })

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockOnError).toHaveBeenCalledWith('File too large')
      expect(mockOnImagePaste).not.toHaveBeenCalled()
      expect(mockOnUploadEnd).toHaveBeenCalled()
    })

    it('should handle network error during upload', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')
      const mockImageFile = new File(['image-data'], 'test.jpg', { type: 'image/jpeg' })

      getImageFromPasteEvent.mockReturnValue(mockImageFile)

      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockOnError).toHaveBeenCalledWith('Network error')
      expect(mockOnUploadEnd).toHaveBeenCalled()
    })

    it('should handle malformed error response', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')
      const mockImageFile = new File(['image-data'], 'test.jpg', { type: 'image/jpeg' })

      getImageFromPasteEvent.mockReturnValue(mockImageFile)

      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      })

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockOnError).toHaveBeenCalledWith('Upload failed')
      expect(mockOnUploadEnd).toHaveBeenCalled()
    })
  })

  describe('Configuration Options', () => {
    it('should respect enabled flag', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')

      const { result } = renderHook(() => useClipboardPaste({
        ...defaultOptions,
        enabled: false
      }))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(getImageFromPasteEvent).not.toHaveBeenCalled()
      expect(mockOnUploadStart).not.toHaveBeenCalled()
    })

    it('should handle missing callback functions gracefully', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')
      const mockImageFile = new File(['image-data'], 'test.jpg', { type: 'image/jpeg' })

      getImageFromPasteEvent.mockReturnValue(mockImageFile)

      const { result } = renderHook(() => useClipboardPaste({
        enabled: true
        // No callbacks provided
      }))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      // Should not throw an error
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should pass custom configuration options', () => {
      const customOptions = {
        enabled: true,
        maxWidth: 2048,
        maxHeight: 1536,
        quality: 0.9
      }

      const { result } = renderHook(() => useClipboardPaste(customOptions))

      expect(result.current.checkClipboard).toBeInstanceOf(Function)
      // Configuration is passed through useCallback dependency array
    })
  })

  describe('Event Handling', () => {
    it('should handle real paste event through document listener', () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')

      getImageFromPasteEvent.mockReturnValue(null)

      renderHook(() => useClipboardPaste(defaultOptions))

      // Simulate a real paste event
      const pasteEvent = new Event('paste') as ClipboardEvent
      Object.defineProperty(pasteEvent, 'target', {
        value: document.body,
        writable: false
      })

      act(() => {
        document.dispatchEvent(pasteEvent)
      })

      expect(getImageFromPasteEvent).toHaveBeenCalledWith(pasteEvent)
    })

    it('should properly cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() => useClipboardPaste(defaultOptions))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function))
    })
  })

  describe('FormData Creation', () => {
    it('should create FormData with correct file field', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')
      const mockImageFile = new File(['image-data'], 'test.jpg', { type: 'image/jpeg' })

      getImageFromPasteEvent.mockReturnValue(mockImageFile)

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/uploads/image', {
        method: 'POST',
        body: expect.any(FormData)
      })

      // Verify FormData contains the file
      const call = mockFetch.mock.calls[0]
      const formData = call[1].body as FormData
      expect(formData.get('file')).toBe(mockImageFile)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle generic error when image processing fails', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')

      getImageFromPasteEvent.mockImplementation(() => {
        throw new Error('Image processing failed')
      })

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockOnError).toHaveBeenCalledWith('Image processing failed')
      expect(mockOnUploadEnd).toHaveBeenCalled()
    })

    it('should handle non-Error objects thrown during processing', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')

      getImageFromPasteEvent.mockImplementation(() => {
        throw 'String error'
      })

      const { result } = renderHook(() => useClipboardPaste(defaultOptions))

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(mockOnError).toHaveBeenCalledWith('이미지 처리에 실패했습니다')
      expect(mockOnUploadEnd).toHaveBeenCalled()
    })
  })

  describe('Hook Updates', () => {
    it('should update event listeners when enabled state changes', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const { rerender } = renderHook(
        ({ enabled }) => useClipboardPaste({ ...defaultOptions, enabled }),
        { initialProps: { enabled: true } }
      )

      expect(addEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function))

      // Disable the hook
      rerender({ enabled: false })

      expect(removeEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function))
    })

    it('should update callback references when they change', async () => {
      const { getImageFromPasteEvent } = require('@/lib/utils/imageProcessor')
      const mockImageFile = new File(['image-data'], 'test.jpg', { type: 'image/jpeg' })

      getImageFromPasteEvent.mockReturnValue(mockImageFile)

      const newOnImagePaste = jest.fn()

      const { result, rerender } = renderHook(
        ({ onImagePaste }) => useClipboardPaste({ enabled: true, onImagePaste }),
        { initialProps: { onImagePaste: mockOnImagePaste } }
      )

      // Update callback
      rerender({ onImagePaste: newOnImagePaste })

      const mockPasteEvent = {
        preventDefault: jest.fn(),
        target: document.body
      } as unknown as ClipboardEvent

      await act(async () => {
        await result.current.checkClipboard(mockPasteEvent)
      })

      expect(newOnImagePaste).toHaveBeenCalled()
      expect(mockOnImagePaste).not.toHaveBeenCalled()
    })
  })
})