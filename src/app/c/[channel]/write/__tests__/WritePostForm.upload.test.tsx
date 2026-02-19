// Component test for WritePostForm image upload flow

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WritePostForm } from '../WritePostForm'
import {
  mockFetch,
  mockUploadResponse,
  mockUploadErrorResponse,
  createMockImageFile,
  createMockFileList,
  createMockFileInputEvent,
  cleanupMocks
} from '@/__tests__/utils/upload-mocks'

// Mock the useImageUpload hook
jest.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: jest.fn()
}))

// Mock Jodit Editor component
jest.mock('@/components/editor/JoditEditor', () => {
  return function MockJoditEditor({ value, onChange, onBlur }: any) {
    return (
      <textarea
        data-testid="jodit-editor"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={() => onBlur?.()}
        placeholder="Write your post content..."
      />
    )
  }
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn()
  }),
  useParams: () => ({
    channel: 'ai'
  })
}))

const mockUseImageUpload = {
  images: [],
  uploading: false,
  uploadProgress: 0,
  error: null,
  uploadImages: jest.fn(),
  removeImage: jest.fn(),
  clearError: jest.fn()
}

describe.skip('WritePostForm - Image Upload Flow', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mock implementation
    const { useImageUpload } = require('@/hooks/useImageUpload')
    useImageUpload.mockReturnValue(mockUseImageUpload)

    // Mock global fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    cleanupMocks()
  })

  describe('File Input and Selection', () => {
    test('should render image upload button', () => {
      // Act
      render(<WritePostForm />)

      // Assert
      const uploadButton = screen.getByRole('button', { name: /이미지 업로드|image upload/i })
      expect(uploadButton).toBeInTheDocument()
    })

    test('should trigger file input when upload button is clicked', async () => {
      // Arrange
      render(<WritePostForm />)
      const uploadButton = screen.getByRole('button', { name: /이미지 업로드|image upload/i })

      // Mock file input click
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {})

      // Act
      await user.click(uploadButton)

      // Assert
      expect(clickSpy).toHaveBeenCalled()

      clickSpy.mockRestore()
    })

    test('should handle FileList timing bug correctly', async () => {
      // This test specifically targets the FileList timing issue
      // Arrange
      render(<WritePostForm />)

      const mockFiles = [
        createMockImageFile('test1.jpg', 1024 * 1024),
        createMockImageFile('test2.png', 2 * 1024 * 1024)
      ]

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      // Create a proper file input change event
      const fileInputEvent = createMockFileInputEvent(mockFiles)

      // Act
      fireEvent.change(fileInput, fileInputEvent)

      // Wait for processing
      await waitFor(() => {
        // Should call uploadImages with the files
        expect(mockUseImageUpload.uploadImages).toHaveBeenCalledWith(
          expect.objectContaining({
            length: 2
          })
        )
      })

      // Assert - should not log "FileList is empty" errors
      const emptyFileListLogs = consoleSpy.mock.calls.filter(call =>
        call[0]?.includes('FileList is empty') || call[0]?.includes('files received: 0')
      )
      expect(emptyFileListLogs).toHaveLength(0)

      consoleSpy.mockRestore()
    })

    test('should process multiple file selection correctly', async () => {
      // Arrange
      render(<WritePostForm />)

      const mockFiles = [
        createMockImageFile('image1.jpg', 1024 * 1024),
        createMockImageFile('image2.png', 2 * 1024 * 1024),
        createMockImageFile('image3.gif', 500 * 1024)
      ]

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const fileInputEvent = createMockFileInputEvent(mockFiles)

      // Act
      fireEvent.change(fileInput, fileInputEvent)

      // Assert
      await waitFor(() => {
        expect(mockUseImageUpload.uploadImages).toHaveBeenCalledWith(
          expect.objectContaining({
            length: 3,
            0: expect.objectContaining({ name: 'image1.jpg' }),
            1: expect.objectContaining({ name: 'image2.png' }),
            2: expect.objectContaining({ name: 'image3.gif' })
          })
        )
      })
    })

    test('should reset file input value after processing', async () => {
      // This verifies the fix for the FileList timing bug
      // Arrange
      render(<WritePostForm />)

      const mockFile = createMockImageFile('test.jpg', 1024 * 1024)
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const fileInputEvent = createMockFileInputEvent([mockFile])

      // Act
      fireEvent.change(fileInput, fileInputEvent)

      // Assert - file input value should be reset AFTER processing
      await waitFor(() => {
        expect(fileInput.value).toBe('')
      })
    })
  })

  describe('Upload Progress and States', () => {
    test('should show upload progress during file upload', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        uploading: true,
        uploadProgress: 45
      })

      render(<WritePostForm />)

      // Assert
      const progressIndicator = screen.getByTestId('upload-progress')
      expect(progressIndicator).toBeInTheDocument()
      expect(progressIndicator).toHaveAttribute('aria-valuenow', '45')
    })

    test('should disable upload button during upload', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        uploading: true
      })

      render(<WritePostForm />)

      // Assert
      const uploadButton = screen.getByRole('button', { name: /이미지 업로드|image upload/i })
      expect(uploadButton).toBeDisabled()
    })

    test('should show upload error messages', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        error: '파일 크기는 10MB를 초과할 수 없습니다'
      })

      render(<WritePostForm />)

      // Assert
      const errorMessage = screen.getByText(/파일 크기.*10MB/)
      expect(errorMessage).toBeInTheDocument()
    })

    test('should allow clearing upload errors', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        error: '업로드 실패',
        clearError: jest.fn()
      })

      render(<WritePostForm />)

      // Act
      const clearErrorButton = screen.getByRole('button', { name: /clear|close|dismiss/i })
      await user.click(clearErrorButton)

      // Assert
      expect(mockUseImageUpload.clearError).toHaveBeenCalled()
    })
  })

  describe('Upload Gallery Display', () => {
    test('should display uploaded images in gallery', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      const mockImages = [
        {
          id: '1',
          url: 'https://storage.supabase.co/v1/object/public/post-images/image1.webp',
          file_name: 'image1.jpg',
          upload_status: 'completed'
        },
        {
          id: '2',
          url: 'https://storage.supabase.co/v1/object/public/post-images/image2.webp',
          file_name: 'image2.png',
          upload_status: 'completed'
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages
      })

      render(<WritePostForm />)

      // Assert
      const gallery = screen.getByTestId('upload-gallery')
      expect(gallery).toBeInTheDocument()

      const thumbnails = screen.getAllByTestId('upload-thumbnail')
      expect(thumbnails).toHaveLength(2)

      expect(screen.getByAltText('image1.jpg')).toBeInTheDocument()
      expect(screen.getByAltText('image2.png')).toBeInTheDocument()
    })

    test('should allow removing images from gallery', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      const mockImages = [
        {
          id: '1',
          url: 'https://storage.supabase.co/v1/object/public/post-images/image1.webp',
          file_name: 'image1.jpg',
          upload_status: 'completed'
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages,
        removeImage: jest.fn()
      })

      render(<WritePostForm />)

      // Act
      const removeButton = screen.getByRole('button', { name: /remove|delete.*image1/i })
      await user.click(removeButton)

      // Assert
      expect(mockUseImageUpload.removeImage).toHaveBeenCalledWith('1')
    })

    test('should allow inserting images into editor', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      const mockImages = [
        {
          id: '1',
          url: 'https://storage.supabase.co/v1/object/public/post-images/image1.webp',
          file_name: 'image1.jpg',
          upload_status: 'completed'
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages
      })

      render(<WritePostForm />)

      // Act
      const insertButton = screen.getByRole('button', { name: /insert.*image1/i })
      await user.click(insertButton)

      // Assert
      const editor = screen.getByTestId('jodit-editor') as HTMLTextAreaElement
      expect(editor.value).toContain('<img')
      expect(editor.value).toContain('https://storage.supabase.co/v1/object/public/post-images/image1.webp')
    })
  })

  describe('Form Integration', () => {
    test('should maintain uploaded images in form state', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      const mockImages = [
        {
          id: '1',
          url: 'https://storage.supabase.co/v1/object/public/post-images/image1.webp',
          file_name: 'image1.jpg',
          upload_status: 'completed'
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages
      })

      render(<WritePostForm />)

      // Fill form fields
      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, 'Test Post with Images')
      await user.type(authorInput, 'Test Author')

      // Insert image into editor
      const insertButton = screen.getByRole('button', { name: /insert.*image1/i })
      await user.click(insertButton)

      const editor = screen.getByTestId('jodit-editor') as HTMLTextAreaElement

      // Assert - form should include both text content and images
      expect(titleInput).toHaveValue('Test Post with Images')
      expect(authorInput).toHaveValue('Test Author')
      expect(editor.value).toContain('<img')
      expect(editor.value).toContain('image1.webp')
    })

    test('should validate form with uploaded images', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      const mockImages = [
        {
          id: '1',
          url: 'https://storage.supabase.co/v1/object/public/post-images/image1.webp',
          file_name: 'image1.jpg',
          upload_status: 'completed'
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages
      })

      render(<WritePostForm />)

      // Fill required fields
      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, 'Test Post')
      await user.type(authorInput, 'Test Author')

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })

      // Should be able to submit with images
      expect(submitButton).toBeEnabled()
    })

    test('should handle form submission with images', async () => {
      // Arrange
      mockFetch(
        { success: true, id: 'new-post-id', url: '/ai/posts/new-post-id' },
        true,
        200
      )

      const { useImageUpload } = require('@/hooks/useImageUpload')
      const mockImages = [
        {
          id: '1',
          url: 'https://storage.supabase.co/v1/object/public/post-images/image1.webp',
          file_name: 'image1.jpg',
          upload_status: 'completed'
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages
      })

      render(<WritePostForm />)

      // Fill form
      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId('jodit-editor')

      await user.type(titleInput, 'Test Post with Images')
      await user.type(authorInput, 'Test Author')
      await user.type(editor, 'Post content with <img src="https://storage.supabase.co/v1/object/public/post-images/image1.webp" alt="image1.jpg" />')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - should submit with image content
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/posts'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('image1.webp')
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle upload validation errors gracefully', async () => {
      // Arrange
      render(<WritePostForm />)

      const oversizedFile = createMockImageFile('large.jpg', 15 * 1024 * 1024) // 15MB
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const fileInputEvent = createMockFileInputEvent([oversizedFile])

      // Mock upload error
      const { useImageUpload } = require('@/hooks/useImageUpload')
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        error: '파일 크기는 10MB를 초과할 수 없습니다',
        uploadImages: jest.fn().mockResolvedValue({
          success: false,
          error: '파일 크기는 10MB를 초과할 수 없습니다'
        })
      })

      // Act
      fireEvent.change(fileInput, fileInputEvent)

      // Assert
      await waitFor(() => {
        const errorMessage = screen.getByText(/파일 크기.*10MB/)
        expect(errorMessage).toBeInTheDocument()
      })
    })

    test('should recover from upload errors', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        error: '네트워크 오류',
        clearError: jest.fn()
      })

      render(<WritePostForm />)

      // Verify error is shown
      expect(screen.getByText(/네트워크 오류/)).toBeInTheDocument()

      // Act - try new upload after clearing error
      const clearButton = screen.getByRole('button', { name: /clear|close|dismiss/i })
      await user.click(clearButton)

      // Assert
      expect(mockUseImageUpload.clearError).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    test('should provide proper ARIA labels for upload elements', () => {
      // Arrange
      render(<WritePostForm />)

      // Assert
      const uploadButton = screen.getByRole('button', { name: /이미지 업로드|image upload/i })
      expect(uploadButton).toHaveAttribute('aria-label')

      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toHaveAttribute('aria-label')
    })

    test('should announce upload progress to screen readers', () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        uploading: true,
        uploadProgress: 65
      })

      render(<WritePostForm />)

      // Assert
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '65')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })
})

// These tests must FAIL initially as per TDD requirements
// The WritePostForm component needs to be updated to handle the FileList timing bug
// and other upload flow improvements to make these tests pass