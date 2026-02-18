import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn()
      }))
    }
  }))
}))

// Mock image processing utilities
jest.mock('@/lib/utils/imageProcessor', () => ({
  processImage: jest.fn(),
  validateImage: jest.fn()
}))

// Mock auth store
jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      user: { id: 'test-user-id' }
    }))
  }
}))

describe('POST /api/uploads/image', () => {
  let mockSupabase: any
  let mockProcessImage: any
  let mockValidateImage: any

  beforeEach(() => {
    const { createServerClient } = require('@/lib/supabase/server')
    const { processImage, validateImage } = require('@/lib/utils/imageProcessor')

    mockSupabase = createServerClient()
    mockProcessImage = processImage
    mockValidateImage = validateImage
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Success Cases', () => {
    it('should upload image successfully with valid file', async () => {
      // Arrange
      const processedImageBuffer = Buffer.from('processed-image-data')
      const uploadedFile = {
        data: { path: 'test/image.webp' },
        error: null
      }
      const publicUrl = {
        data: { publicUrl: 'https://example.com/test/image.webp' }
      }

      mockValidateImage.mockReturnValueOnce({ valid: true })
      mockProcessImage.mockResolvedValueOnce({
        buffer: processedImageBuffer,
        format: 'webp',
        width: 800,
        height: 600,
        size: 50000
      })
      mockSupabase.storage.from().upload.mockResolvedValueOnce(uploadedFile)
      mockSupabase.storage.from().getPublicUrl.mockReturnValueOnce(publicUrl)

      const formData = new FormData()
      const imageBlob = new Blob(['test-image-data'], { type: 'image/jpeg' })
      formData.append('image', imageBlob, 'test.jpg')

      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        image: {
          url: 'https://example.com/test/image.webp',
          path: 'test/image.webp',
          format: 'webp',
          width: 800,
          height: 600,
          size: 50000
        }
      })
      expect(mockValidateImage).toHaveBeenCalledWith(expect.any(Buffer))
      expect(mockProcessImage).toHaveBeenCalledWith(expect.any(Buffer), { format: 'webp', quality: 80 })
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('images')
    })

    it('should handle PNG image upload', async () => {
      // Arrange
      const processedImageBuffer = Buffer.from('processed-png-data')

      mockValidateImage.mockReturnValueOnce({ valid: true })
      mockProcessImage.mockResolvedValueOnce({
        buffer: processedImageBuffer,
        format: 'webp',
        width: 1200,
        height: 800,
        size: 75000
      })
      mockSupabase.storage.from().upload.mockResolvedValueOnce({
        data: { path: 'test/image2.webp' },
        error: null
      })
      mockSupabase.storage.from().getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/test/image2.webp' }
      })

      const formData = new FormData()
      const imageBlob = new Blob(['test-png-data'], { type: 'image/png' })
      formData.append('image', imageBlob, 'test.png')

      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockProcessImage).toHaveBeenCalledWith(expect.any(Buffer), { format: 'webp', quality: 80 })
    })

    it('should upload with custom quality parameter', async () => {
      // Arrange
      mockValidateImage.mockReturnValueOnce({ valid: true })
      mockProcessImage.mockResolvedValueOnce({
        buffer: Buffer.from('high-quality-image'),
        format: 'webp',
        width: 1920,
        height: 1080,
        size: 120000
      })
      mockSupabase.storage.from().upload.mockResolvedValueOnce({
        data: { path: 'test/hq-image.webp' },
        error: null
      })
      mockSupabase.storage.from().getPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/test/hq-image.webp' }
      })

      const formData = new FormData()
      const imageBlob = new Blob(['high-quality-data'], { type: 'image/jpeg' })
      formData.append('image', imageBlob, 'hq.jpg')

      const request = new NextRequest('http://localhost:3000/api/uploads/image?quality=95', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockProcessImage).toHaveBeenCalledWith(expect.any(Buffer), { format: 'webp', quality: 95 })
    })
  })

  describe('Validation Errors', () => {
    it('should return 400 for missing image file', async () => {
      // Arrange
      const formData = new FormData()

      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('이미지 파일이 필요합니다')
    })

    it('should return 400 for invalid image format', async () => {
      // Arrange
      mockValidateImage.mockReturnValueOnce({
        valid: false,
        error: '지원하지 않는 이미지 형식입니다'
      })

      const formData = new FormData()
      const invalidBlob = new Blob(['invalid-data'], { type: 'text/plain' })
      formData.append('image', invalidBlob, 'test.txt')

      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('지원하지 않는 이미지 형식입니다')
    })

    it('should return 400 for image too large', async () => {
      // Arrange
      mockValidateImage.mockReturnValueOnce({
        valid: false,
        error: '파일 크기가 10MB를 초과합니다'
      })

      const formData = new FormData()
      const largeBlob = new Blob(['x'.repeat(11 * 1024 * 1024)], { type: 'image/jpeg' })
      formData.append('image', largeBlob, 'large.jpg')

      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('파일 크기가 10MB를 초과합니다')
    })

    it('should return 400 for corrupted image', async () => {
      // Arrange
      mockValidateImage.mockReturnValueOnce({ valid: true })
      mockProcessImage.mockRejectedValueOnce(new Error('이미지 처리 중 오류가 발생했습니다'))

      const formData = new FormData()
      const corruptedBlob = new Blob(['corrupted-image-data'], { type: 'image/jpeg' })
      formData.append('image', corruptedBlob, 'corrupted.jpg')

      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('이미지 처리 중 오류가 발생했습니다')
    })

    it('should return 400 for invalid quality parameter', async () => {
      // Arrange
      const formData = new FormData()
      const imageBlob = new Blob(['test-data'], { type: 'image/jpeg' })
      formData.append('image', imageBlob, 'test.jpg')

      const request = new NextRequest('http://localhost:3000/api/uploads/image?quality=150', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('품질은 1-100 사이의 값이어야 합니다')
    })
  })

  describe('Storage Errors', () => {
    it('should return 500 for storage upload failure', async () => {
      // Arrange
      mockValidateImage.mockReturnValueOnce({ valid: true })
      mockProcessImage.mockResolvedValueOnce({
        buffer: Buffer.from('processed-data'),
        format: 'webp',
        width: 800,
        height: 600,
        size: 50000
      })
      mockSupabase.storage.from().upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage upload failed' }
      })

      const formData = new FormData()
      const imageBlob = new Blob(['test-data'], { type: 'image/jpeg' })
      formData.append('image', imageBlob, 'test.jpg')

      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(500)
    })

    it('should return 500 for storage quota exceeded', async () => {
      // Arrange
      mockValidateImage.mockReturnValueOnce({ valid: true })
      mockProcessImage.mockResolvedValueOnce({
        buffer: Buffer.from('processed-data'),
        format: 'webp',
        width: 800,
        height: 600,
        size: 50000
      })
      mockSupabase.storage.from().upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage quota exceeded', code: 'STORAGE_QUOTA_EXCEEDED' }
      })

      const formData = new FormData()
      const imageBlob = new Blob(['test-data'], { type: 'image/jpeg' })
      formData.append('image', imageBlob, 'test.jpg')

      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(responseData.error).toContain('저장소 용량이 부족합니다')
    })
  })

  describe('Authentication Errors', () => {
    it('should return 401 for unauthenticated user', async () => {
      // Arrange
      const { useAuthStore } = require('@/stores/authStore')
      useAuthStore.getState.mockReturnValueOnce({ user: null })

      const formData = new FormData()
      const imageBlob = new Blob(['test-data'], { type: 'image/jpeg' })
      formData.append('image', imageBlob, 'test.jpg')

      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('Request Format Errors', () => {
    it('should return 400 for non-multipart request', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: JSON.stringify({ data: 'not-form-data' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('multipart/form-data 형식이 필요합니다')
    })

    it('should return 400 for empty request body', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/uploads/image', {
        method: 'POST',
        body: null
      })

      // Act
      const response = await POST(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toContain('요청 본문이 비어있습니다')
    })
  })

  describe('Concurrent Upload Limits', () => {
    it('should return 429 when upload limit exceeded', async () => {
      // Arrange - Mock rate limiting
      mockValidateImage.mockReturnValueOnce({ valid: true })

      // Simulate multiple concurrent uploads from same user
      const uploads = Array.from({ length: 11 }, async (_, i) => {
        const formData = new FormData()
        const imageBlob = new Blob([`test-data-${i}`], { type: 'image/jpeg' })
        formData.append('image', imageBlob, `test${i}.jpg`)

        const request = new NextRequest('http://localhost:3000/api/uploads/image', {
          method: 'POST',
          body: formData
        })

        return POST(request)
      })

      // Act
      const responses = await Promise.all(uploads)
      const lastResponse = responses[10]

      // Assert
      expect(lastResponse.status).toBe(429)
      const responseData = await lastResponse.json()
      expect(responseData.error).toContain('동시 업로드 한도를 초과했습니다')
    })
  })
})