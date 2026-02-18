import {
  processImage,
  getImageFromPasteEvent,
  extractImageFiles,
  isImageFile,
  formatFileSize,
  uploadProcessedImage,
  ImageProcessOptions,
  ProcessedImage
} from '../imageProcessor'

// Mock HTML5 Canvas API
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(),
  toBlob: jest.fn(),
}

const mockContext = {
  imageSmoothingEnabled: false,
  imageSmoothingQuality: 'low',
  drawImage: jest.fn(),
}

const mockImage = {
  width: 0,
  height: 0,
  src: '',
  onload: null as any,
  onerror: null as any,
}

// Mock DOM APIs
Object.defineProperty(global, 'Image', {
  writable: true,
  value: jest.fn(() => mockImage),
})

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: jest.fn((tagName) => {
    if (tagName === 'canvas') {
      return mockCanvas
    }
    return {}
  }),
})

Object.defineProperty(global, 'URL', {
  writable: true,
  value: {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn(),
  },
})

// Mock fetch
global.fetch = jest.fn()

describe('imageProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset mock objects
    mockCanvas.getContext.mockReturnValue(mockContext)
    mockCanvas.toBlob.mockImplementation((callback) => {
      const mockBlob = new Blob(['mock-image-data'], { type: 'image/webp' })
      Object.defineProperty(mockBlob, 'size', { value: 50000 })
      callback(mockBlob)
    })

    // Reset image mock
    mockImage.width = 1920
    mockImage.height = 1080
    mockImage.onload = null
    mockImage.onerror = null
  })

  describe('processImage', () => {
    const createMockFile = (name: string, size: number = 100000, type: string = 'image/jpeg') => {
      const file = new File(['mock-image-data'], name, { type })
      Object.defineProperty(file, 'size', { value: size })
      return file
    }

    it('should process image with default options', async () => {
      const mockFile = createMockFile('test.jpg')

      const promise = processImage(mockFile)

      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload()
        }
      }, 0)

      const result = await promise

      expect(result.file).toBeInstanceOf(File)
      expect(result.file.name).toBe('test-processed.webp')
      expect(result.file.type).toBe('image/webp')
      expect(result.originalSize).toBe(100000)
      expect(result.processedSize).toBe(50000)
      expect(result.compressionRatio).toBe(50) // (100000 - 50000) / 100000 * 100
      expect(result.width).toBe(1920)
      expect(result.height).toBe(1080)

      expect(mockContext.imageSmoothingEnabled).toBe(true)
      expect(mockContext.imageSmoothingQuality).toBe('high')
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 1920, 1080)
    })

    it('should process image with custom options', async () => {
      const mockFile = createMockFile('test.png')
      const options: ImageProcessOptions = {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.7,
        format: 'jpeg'
      }

      // Mock large image that needs resizing
      mockImage.width = 2400
      mockImage.height = 1800

      const promise = processImage(mockFile, options)

      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload()
        }
      }, 0)

      const result = await promise

      expect(result.file.name).toBe('test-processed.jpeg')
      expect(result.file.type).toBe('image/jpeg')
      // Should be resized to fit within 800x600 while maintaining aspect ratio
      expect(result.width).toBe(800) // Limited by maxWidth
      expect(result.height).toBe(600) // Calculated based on aspect ratio
    })

    it('should handle image resize calculations correctly', async () => {
      const testCases = [
        // [originalWidth, originalHeight, maxWidth, maxHeight, expectedWidth, expectedHeight]
        [2000, 1000, 800, 600, 800, 400], // Wide image, limited by width
        [1000, 2000, 800, 600, 300, 600], // Tall image, limited by height
        [400, 300, 800, 600, 400, 300],   // Small image, no resize needed
        [1600, 1200, 800, 600, 800, 600], // Both dimensions need scaling
      ]

      for (const [origW, origH, maxW, maxH, expW, expH] of testCases) {
        mockImage.width = origW
        mockImage.height = origH

        const mockFile = createMockFile('test.jpg')
        const options = { maxWidth: maxW, maxHeight: maxH }

        const promise = processImage(mockFile, options)

        setTimeout(() => {
          if (mockImage.onload) {
            mockImage.onload()
          }
        }, 0)

        const result = await promise
        expect(result.width).toBe(expW)
        expect(result.height).toBe(expH)
      }
    })

    it('should handle image load errors', async () => {
      const mockFile = createMockFile('test.jpg')

      const promise = processImage(mockFile)

      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror()
        }
      }, 0)

      await expect(promise).rejects.toThrow('Failed to load image')
    })

    it('should handle canvas context unavailable', async () => {
      mockCanvas.getContext.mockReturnValue(null)

      const mockFile = createMockFile('test.jpg')

      await expect(processImage(mockFile)).rejects.toThrow('Canvas context not available')
    })

    it('should handle toBlob failure', async () => {
      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(null) // Simulate blob creation failure
      })

      const mockFile = createMockFile('test.jpg')
      const promise = processImage(mockFile)

      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload()
        }
      }, 0)

      await expect(promise).rejects.toThrow('Image processing failed')
    })
  })

  describe('getImageFromPasteEvent', () => {
    const createMockClipboardEvent = (items: any[]) => {
      return {
        clipboardData: {
          items: items.map((item, index) => ({
            ...item,
            getAsFile: jest.fn(() => item.file || null)
          }))
        }
      } as ClipboardEvent
    }

    it('should extract image from clipboard event', () => {
      const mockFile = new File(['image-data'], 'image.png', { type: 'image/png' })
      const event = createMockClipboardEvent([
        { type: 'text/plain', file: null },
        { type: 'image/png', file: mockFile }
      ])

      const result = getImageFromPasteEvent(event)

      expect(result).toBeInstanceOf(File)
      expect(result?.type).toBe('image/png')
      expect(result?.name).toMatch(/clipboard-\d+\.png/)
    })

    it('should return null when no images in clipboard', () => {
      const event = createMockClipboardEvent([
        { type: 'text/plain', file: null },
        { type: 'text/html', file: null }
      ])

      const result = getImageFromPasteEvent(event)

      expect(result).toBeNull()
    })

    it('should return null when no clipboard data', () => {
      const event = { clipboardData: null } as ClipboardEvent

      const result = getImageFromPasteEvent(event)

      expect(result).toBeNull()
    })

    it('should return null when image item returns null file', () => {
      const event = createMockClipboardEvent([
        { type: 'image/jpeg', file: null }
      ])

      const result = getImageFromPasteEvent(event)

      expect(result).toBeNull()
    })
  })

  describe('extractImageFiles', () => {
    it('should extract only image files from FileList', () => {
      const files = [
        new File(['data'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['data'], 'document.pdf', { type: 'application/pdf' }),
        new File(['data'], 'image2.png', { type: 'image/png' }),
        new File(['data'], 'video.mp4', { type: 'video/mp4' }),
      ]

      const result = extractImageFiles(files)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('image1.jpg')
      expect(result[1].name).toBe('image2.png')
    })

    it('should handle empty file list', () => {
      const result = extractImageFiles([])

      expect(result).toHaveLength(0)
    })

    it('should handle FileList with no images', () => {
      const files = [
        new File(['data'], 'document.pdf', { type: 'application/pdf' }),
        new File(['data'], 'video.mp4', { type: 'video/mp4' }),
      ]

      const result = extractImageFiles(files)

      expect(result).toHaveLength(0)
    })
  })

  describe('isImageFile', () => {
    it('should return true for image files', () => {
      const imageTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/svg+xml'
      ]

      imageTypes.forEach(type => {
        const file = new File(['data'], 'test', { type })
        expect(isImageFile(file)).toBe(true)
      })
    })

    it('should return false for non-image files', () => {
      const nonImageTypes = [
        'text/plain',
        'application/pdf',
        'video/mp4',
        'audio/mp3',
        'application/json'
      ]

      nonImageTypes.forEach(type => {
        const file = new File(['data'], 'test', { type })
        expect(isImageFile(file)).toBe(false)
      })
    })
  })

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      const testCases = [
        [0, '0 B'],
        [123, '123 B'],
        [1024, '1 KB'],
        [1536, '1.5 KB'],
        [1048576, '1 MB'],
        [1572864, '1.5 MB'],
        [1073741824, '1 GB'],
        [1610612736, '1.5 GB'],
      ]

      testCases.forEach(([bytes, expected]) => {
        expect(formatFileSize(bytes)).toBe(expected)
      })
    })

    it('should handle very large files', () => {
      const result = formatFileSize(1.5 * 1024 * 1024 * 1024 * 1024) // 1.5 TB
      expect(result).toMatch(/\d+(\.\d+)? GB/) // Should cap at GB in this implementation
    })
  })

  describe('uploadProcessedImage', () => {
    const createMockProcessedImage = (): ProcessedImage => ({
      file: new File(['processed-data'], 'test-processed.webp', { type: 'image/webp' }),
      originalSize: 100000,
      processedSize: 50000,
      compressionRatio: 50,
      width: 800,
      height: 600,
    })

    it('should upload processed image successfully', async () => {
      const mockProcessedImage = createMockProcessedImage()
      const expectedResult = {
        url: 'https://example.com/uploads/test-processed.webp',
        fileName: 'test-processed.webp',
        size: 50000,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: expectedResult.url }),
      })

      const result = await uploadProcessedImage(mockProcessedImage)

      expect(result).toEqual(expectedResult)

      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/uploads/image', {
        method: 'POST',
        body: expect.any(FormData),
      })

      // Verify FormData contents
      const formData = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData
      expect(formData.get('file')).toBe(mockProcessedImage.file)
      expect(formData.get('folder')).toBe('posts')
    })

    it('should handle upload errors', async () => {
      const mockProcessedImage = createMockProcessedImage()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Upload failed' }),
      })

      await expect(uploadProcessedImage(mockProcessedImage)).rejects.toThrow('Upload failed')
    })

    it('should handle upload errors with message field', async () => {
      const mockProcessedImage = createMockProcessedImage()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'File too large' }),
      })

      await expect(uploadProcessedImage(mockProcessedImage)).rejects.toThrow('File too large')
    })

    it('should handle upload errors without specific error message', async () => {
      const mockProcessedImage = createMockProcessedImage()

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      await expect(uploadProcessedImage(mockProcessedImage)).rejects.toThrow('Upload failed')
    })

    it('should handle network errors', async () => {
      const mockProcessedImage = createMockProcessedImage()

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(uploadProcessedImage(mockProcessedImage)).rejects.toThrow('Network error')
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete image processing workflow', async () => {
      // Create a mock file
      const originalFile = new File(['large-image-data'], 'vacation-photo.jpg', {
        type: 'image/jpeg'
      })
      Object.defineProperty(originalFile, 'size', { value: 2000000 }) // 2MB

      // Mock large image
      mockImage.width = 4000
      mockImage.height = 3000

      // Mock smaller compressed result
      mockCanvas.toBlob.mockImplementation((callback) => {
        const mockBlob = new Blob(['compressed-data'], { type: 'image/webp' })
        Object.defineProperty(mockBlob, 'size', { value: 800000 }) // 800KB
        callback(mockBlob)
      })

      // Mock successful upload
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://cdn.example.com/vacation-photo-processed.webp' }),
      })

      // Process the image
      const processPromise = processImage(originalFile, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        format: 'webp'
      })

      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload()
        }
      }, 0)

      const processedImage = await processPromise

      // Verify processing results
      expect(processedImage.originalSize).toBe(2000000)
      expect(processedImage.processedSize).toBe(800000)
      expect(processedImage.compressionRatio).toBe(60) // 60% compression
      expect(processedImage.width).toBe(1440) // Aspect ratio maintained
      expect(processedImage.height).toBe(1080)

      // Upload the processed image
      const uploadResult = await uploadProcessedImage(processedImage)

      expect(uploadResult.url).toBe('https://cdn.example.com/vacation-photo-processed.webp')
      expect(uploadResult.fileName).toBe('vacation-photo-processed.webp')
      expect(uploadResult.size).toBe(800000)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle zero-sized images', () => {
      mockImage.width = 0
      mockImage.height = 0

      const mockFile = new File(['data'], 'empty.jpg', { type: 'image/jpeg' })
      const promise = processImage(mockFile)

      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload()
        }
      }, 0)

      return expect(promise).resolves.toMatchObject({
        width: 0,
        height: 0,
      })
    })

    it('should handle very small max dimensions', async () => {
      mockImage.width = 1000
      mockImage.height = 800

      const mockFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      const options = { maxWidth: 10, maxHeight: 10 }

      const promise = processImage(mockFile, options)

      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload()
        }
      }, 0)

      const result = await promise

      expect(result.width).toBe(10)
      expect(result.height).toBe(8) // Maintains aspect ratio
    })
  })
})