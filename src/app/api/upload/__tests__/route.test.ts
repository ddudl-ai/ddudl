// Contract test for POST /api/upload with file validation

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { createMockFile, mockFormData, cleanupMocks } from '@/__tests__/utils/upload-mocks'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'posts/2025/9/test-image.webp' },
          error: null
        }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://storage.supabase.co/v1/object/public/post-images/posts/2025/9/test-image.webp' }
        }))
      }))
    }
  }
}))

// Mock Sharp for image processing
jest.mock('sharp', () => {
  const mockSharp = {
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image-data'))
  }
  return jest.fn(() => mockSharp)
})

describe('POST /api/upload - Contract Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFormData()
  })

  afterEach(() => {
    cleanupMocks()
  })

  describe('Successful Upload Scenarios', () => {
    test('should handle single image upload successfully', async () => {
      // Arrange
      const mockFile = createMockFile('test-image.jpg', 'image-content', 'image/jpeg', 1024 * 1024)
      const formData = new FormData()
      formData.append('files', mockFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        success: true,
        files: expect.arrayContaining([
          expect.stringMatching(/^https:\/\/storage\.supabase\.co.*\.webp$/)
        ]),
        isImages: [true],
        path: expect.any(String),
        baseurl: expect.any(String),
        error: null,
        msg: expect.stringContaining('성공')
      })
    })

    test('should handle multiple image uploads', async () => {
      // Arrange
      const file1 = createMockFile('image1.png', 'content1', 'image/png', 2 * 1024 * 1024)
      const file2 = createMockFile('image2.jpg', 'content2', 'image/jpeg', 3 * 1024 * 1024)

      const formData = new FormData()
      formData.append('files', file1)
      formData.append('files', file2)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseBody.success).toBe(true)
      expect(responseBody.files).toHaveLength(2)
      expect(responseBody.isImages).toEqual([true, true])
      expect(responseBody.files.every((url: string) => url.includes('storage.supabase.co'))).toBe(true)
    })

    test('should convert AVIF to WebP format', async () => {
      // Arrange
      const avifFile = createMockFile('image.avif', 'avif-content', 'image/avif', 2 * 1024 * 1024)
      const formData = new FormData()
      formData.append('files', avifFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseBody.success).toBe(true)
      expect(responseBody.files[0]).toMatch(/\.webp$/)
    })
  })

  describe('Validation Error Scenarios', () => {
    test('should reject request with no files', async () => {
      // Arrange
      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseBody).toEqual({
        error: {
          message: '업로드할 파일이 없습니다.'
        }
      })
    })

    test('should reject oversized files (>10MB)', async () => {
      // Arrange
      const oversizedFile = createMockFile(
        'large-image.jpg',
        'large-content',
        'image/jpeg',
        11 * 1024 * 1024 // 11MB
      )
      const formData = new FormData()
      formData.append('files', oversizedFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseBody).toEqual({
        error: {
          message: expect.stringMatching(/파일 크기.*10MB/)
        }
      })
    })

    test('should reject unsupported file formats', async () => {
      // Arrange
      const unsupportedFile = createMockFile(
        'document.pdf',
        'pdf-content',
        'application/pdf',
        1024 * 1024
      )
      const formData = new FormData()
      formData.append('files', unsupportedFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseBody).toEqual({
        error: {
          message: expect.stringMatching(/지원하지 않는.*형식/)
        }
      })
    })

    test('should reject too many files (>10)', async () => {
      // Arrange
      const formData = new FormData()
      for (let i = 0; i < 11; i++) {
        const file = createMockFile(`image-${i}.jpg`, 'content', 'image/jpeg', 1024 * 1024)
        formData.append('files', file)
      }

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseBody.error.message).toMatch(/파일.*개수/)
    })

    test('should validate image file extensions', async () => {
      // Arrange - file with wrong extension
      const suspiciousFile = createMockFile(
        'malicious.exe',
        'executable-content',
        'image/jpeg', // MIME type doesn't match extension
        1024 * 1024
      )
      const formData = new FormData()
      formData.append('files', suspiciousFile)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseBody.error.message).toMatch(/파일.*확장자/)
    })
  })

  describe('Server Error Scenarios', () => {
    test('should handle Supabase Storage upload failure', async () => {
      // Arrange
      const mockFile = createMockFile('test-image.jpg', 'content', 'image/jpeg', 1024 * 1024)
      const formData = new FormData()
      formData.append('files', mockFile)

      // Mock Supabase upload failure
      const { supabase } = require('@/lib/supabase')
      supabase.storage.from().upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage connection failed' }
      })

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(responseBody).toEqual({
        error: {
          message: expect.stringMatching(/업로드 실패/)
        }
      })
    })

    test('should handle Sharp image processing failure', async () => {
      // Arrange
      const mockFile = createMockFile('corrupted.jpg', 'invalid-image', 'image/jpeg', 1024 * 1024)
      const formData = new FormData()
      formData.append('files', mockFile)

      // Mock Sharp processing failure
      const Sharp = require('sharp')
      Sharp().toBuffer.mockRejectedValueOnce(new Error('Invalid image format'))

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(responseBody).toEqual({
        error: {
          message: expect.stringMatching(/이미지 처리 실패/)
        }
      })
    })
  })

  describe('Request Method Validation', () => {
    test('should reject non-POST requests', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'GET'
      })

      // Act
      const response = await POST(request) // This should fail since it's not actually POST

      // Assert
      // This test verifies that only POST method is accepted
      // The actual implementation should check request method
      expect(response.status).not.toBe(200)
    })
  })

  describe('Content-Type Validation', () => {
    test('should require multipart/form-data content type', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: JSON.stringify({ files: ['not-a-file'] }),
        headers: {
          'content-type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const responseBody = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseBody.error.message).toMatch(/multipart\/form-data/)
    })
  })
})

// These tests must FAIL initially as per TDD requirements
// The actual /api/upload route implementation needs to be created/fixed to make these pass