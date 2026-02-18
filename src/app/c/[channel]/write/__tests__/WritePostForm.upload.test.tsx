// Component test for WritePostForm image upload flow

import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor, act } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import { WritePostForm } from &apos;../WritePostForm&apos;
import {
  mockFetch,
  mockUploadResponse,
  mockUploadErrorResponse,
  createMockImageFile,
  createMockFileList,
  createMockFileInputEvent,
  cleanupMocks
} from &apos;@/__tests__/utils/upload-mocks&apos;

// Mock the useImageUpload hook
jest.mock(&apos;@/hooks/useImageUpload&apos;, () => ({
  useImageUpload: jest.fn()
}))

// Mock Jodit Editor component
jest.mock(&apos;@/components/editor/JoditEditor&apos;, () => {
  return function MockJoditEditor({ value, onChange, onBlur }: any) {
    return (
      <textarea
        data-testid=&quot;jodit-editor&quot;
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={() => onBlur?.()}
        placeholder=&quot;Write your post content...&quot;
      />
    )
  }
})

// Mock next/navigation
jest.mock(&apos;next/navigation&apos;, () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn()
  }),
  useParams: () => ({
    channel: &apos;ai&apos;
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

describe(&apos;WritePostForm - Image Upload Flow&apos;, () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mock implementation
    const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
    useImageUpload.mockReturnValue(mockUseImageUpload)

    // Mock global fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    cleanupMocks()
  })

  describe(&apos;File Input and Selection&apos;, () => {
    test(&apos;should render image upload button&apos;, () => {
      // Act
      render(<WritePostForm />)

      // Assert
      const uploadButton = screen.getByRole(&apos;button&apos;, { name: /이미지 업로드|image upload/i })
      expect(uploadButton).toBeInTheDocument()
    })

    test(&apos;should trigger file input when upload button is clicked&apos;, async () => {
      // Arrange
      render(<WritePostForm />)
      const uploadButton = screen.getByRole(&apos;button&apos;, { name: /이미지 업로드|image upload/i })

      // Mock file input click
      const fileInput = document.querySelector(&apos;input[type=&quot;file&quot;]&apos;) as HTMLInputElement
      const clickSpy = jest.spyOn(fileInput, &apos;click&apos;).mockImplementation(() => {})

      // Act
      await user.click(uploadButton)

      // Assert
      expect(clickSpy).toHaveBeenCalled()

      clickSpy.mockRestore()
    })

    test(&apos;should handle FileList timing bug correctly&apos;, async () => {
      // This test specifically targets the FileList timing issue
      // Arrange
      render(<WritePostForm />)

      const mockFiles = [
        createMockImageFile(&apos;test1.jpg&apos;, 1024 * 1024),
        createMockImageFile(&apos;test2.png&apos;, 2 * 1024 * 1024)
      ]

      const fileInput = document.querySelector(&apos;input[type=&quot;file&quot;]&apos;) as HTMLInputElement

      const consoleSpy = jest.spyOn(console, &apos;log&apos;).mockImplementation()

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

      // Assert - should not log &quot;FileList is empty&quot; errors
      const emptyFileListLogs = consoleSpy.mock.calls.filter(call =>
        call[0]?.includes(&apos;FileList is empty&apos;) || call[0]?.includes(&apos;files received: 0&apos;)
      )
      expect(emptyFileListLogs).toHaveLength(0)

      consoleSpy.mockRestore()
    })

    test(&apos;should process multiple file selection correctly&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const mockFiles = [
        createMockImageFile(&apos;image1.jpg&apos;, 1024 * 1024),
        createMockImageFile(&apos;image2.png&apos;, 2 * 1024 * 1024),
        createMockImageFile(&apos;image3.gif&apos;, 500 * 1024)
      ]

      const fileInput = document.querySelector(&apos;input[type=&quot;file&quot;]&apos;) as HTMLInputElement
      const fileInputEvent = createMockFileInputEvent(mockFiles)

      // Act
      fireEvent.change(fileInput, fileInputEvent)

      // Assert
      await waitFor(() => {
        expect(mockUseImageUpload.uploadImages).toHaveBeenCalledWith(
          expect.objectContaining({
            length: 3,
            0: expect.objectContaining({ name: &apos;image1.jpg&apos; }),
            1: expect.objectContaining({ name: &apos;image2.png&apos; }),
            2: expect.objectContaining({ name: &apos;image3.gif&apos; })
          })
        )
      })
    })

    test(&apos;should reset file input value after processing&apos;, async () => {
      // This verifies the fix for the FileList timing bug
      // Arrange
      render(<WritePostForm />)

      const mockFile = createMockImageFile(&apos;test.jpg&apos;, 1024 * 1024)
      const fileInput = document.querySelector(&apos;input[type=&quot;file&quot;]&apos;) as HTMLInputElement
      const fileInputEvent = createMockFileInputEvent([mockFile])

      // Act
      fireEvent.change(fileInput, fileInputEvent)

      // Assert - file input value should be reset AFTER processing
      await waitFor(() => {
        expect(fileInput.value).toBe(&apos;')
      })
    })
  })

  describe(&apos;Upload Progress and States&apos;, () => {
    test(&apos;should show upload progress during file upload&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        uploading: true,
        uploadProgress: 45
      })

      render(<WritePostForm />)

      // Assert
      const progressIndicator = screen.getByTestId(&apos;upload-progress&apos;)
      expect(progressIndicator).toBeInTheDocument()
      expect(progressIndicator).toHaveAttribute(&apos;aria-valuenow&apos;, &apos;45&apos;)
    })

    test(&apos;should disable upload button during upload&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        uploading: true
      })

      render(<WritePostForm />)

      // Assert
      const uploadButton = screen.getByRole(&apos;button&apos;, { name: /이미지 업로드|image upload/i })
      expect(uploadButton).toBeDisabled()
    })

    test(&apos;should show upload error messages&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        error: &apos;파일 크기는 10MB를 초과할 수 없습니다&apos;
      })

      render(<WritePostForm />)

      // Assert
      const errorMessage = screen.getByText(/파일 크기.*10MB/)
      expect(errorMessage).toBeInTheDocument()
    })

    test(&apos;should allow clearing upload errors&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        error: &apos;업로드 실패&apos;,
        clearError: jest.fn()
      })

      render(<WritePostForm />)

      // Act
      const clearErrorButton = screen.getByRole(&apos;button&apos;, { name: /clear|close|dismiss/i })
      await user.click(clearErrorButton)

      // Assert
      expect(mockUseImageUpload.clearError).toHaveBeenCalled()
    })
  })

  describe(&apos;Upload Gallery Display&apos;, () => {
    test(&apos;should display uploaded images in gallery&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      const mockImages = [
        {
          id: &apos;1&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/image1.webp&apos;,
          file_name: &apos;image1.jpg&apos;,
          upload_status: &apos;completed&apos;
        },
        {
          id: &apos;2&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/image2.webp&apos;,
          file_name: &apos;image2.png&apos;,
          upload_status: &apos;completed&apos;
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages
      })

      render(<WritePostForm />)

      // Assert
      const gallery = screen.getByTestId(&apos;upload-gallery&apos;)
      expect(gallery).toBeInTheDocument()

      const thumbnails = screen.getAllByTestId(&apos;upload-thumbnail&apos;)
      expect(thumbnails).toHaveLength(2)

      expect(screen.getByAltText(&apos;image1.jpg&apos;)).toBeInTheDocument()
      expect(screen.getByAltText(&apos;image2.png&apos;)).toBeInTheDocument()
    })

    test(&apos;should allow removing images from gallery&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      const mockImages = [
        {
          id: &apos;1&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/image1.webp&apos;,
          file_name: &apos;image1.jpg&apos;,
          upload_status: &apos;completed&apos;
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages,
        removeImage: jest.fn()
      })

      render(<WritePostForm />)

      // Act
      const removeButton = screen.getByRole(&apos;button&apos;, { name: /remove|delete.*image1/i })
      await user.click(removeButton)

      // Assert
      expect(mockUseImageUpload.removeImage).toHaveBeenCalledWith(&apos;1&apos;)
    })

    test(&apos;should allow inserting images into editor&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      const mockImages = [
        {
          id: &apos;1&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/image1.webp&apos;,
          file_name: &apos;image1.jpg&apos;,
          upload_status: &apos;completed&apos;
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages
      })

      render(<WritePostForm />)

      // Act
      const insertButton = screen.getByRole(&apos;button&apos;, { name: /insert.*image1/i })
      await user.click(insertButton)

      // Assert
      const editor = screen.getByTestId(&apos;jodit-editor&apos;) as HTMLTextAreaElement
      expect(editor.value).toContain(&apos;<img&apos;)
      expect(editor.value).toContain(&apos;https://storage.supabase.co/v1/object/public/post-images/image1.webp&apos;)
    })
  })

  describe(&apos;Form Integration&apos;, () => {
    test(&apos;should maintain uploaded images in form state&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      const mockImages = [
        {
          id: &apos;1&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/image1.webp&apos;,
          file_name: &apos;image1.jpg&apos;,
          upload_status: &apos;completed&apos;
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

      await user.type(titleInput, &apos;Test Post with Images&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)

      // Insert image into editor
      const insertButton = screen.getByRole(&apos;button&apos;, { name: /insert.*image1/i })
      await user.click(insertButton)

      const editor = screen.getByTestId(&apos;jodit-editor&apos;) as HTMLTextAreaElement

      // Assert - form should include both text content and images
      expect(titleInput).toHaveValue(&apos;Test Post with Images&apos;)
      expect(authorInput).toHaveValue(&apos;Test Author&apos;)
      expect(editor.value).toContain(&apos;<img&apos;)
      expect(editor.value).toContain(&apos;image1.webp&apos;)
    })

    test(&apos;should validate form with uploaded images&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      const mockImages = [
        {
          id: &apos;1&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/image1.webp&apos;,
          file_name: &apos;image1.jpg&apos;,
          upload_status: &apos;completed&apos;
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

      await user.type(titleInput, &apos;Test Post&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)

      // Try to submit
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })

      // Should be able to submit with images
      expect(submitButton).toBeEnabled()
    })

    test(&apos;should handle form submission with images&apos;, async () => {
      // Arrange
      mockFetch(
        { success: true, id: &apos;new-post-id&apos;, url: &apos;/ai/posts/new-post-id&apos; },
        true,
        200
      )

      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      const mockImages = [
        {
          id: &apos;1&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/image1.webp&apos;,
          file_name: &apos;image1.jpg&apos;,
          upload_status: &apos;completed&apos;
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
      const editor = screen.getByTestId(&apos;jodit-editor&apos;)

      await user.type(titleInput, &apos;Test Post with Images&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)
      await user.type(editor, &apos;Post content with <img src=&quot;https://storage.supabase.co/v1/object/public/post-images/image1.webp&quot; alt=&quot;image1.jpg&quot; />&apos;)

      // Submit form
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - should submit with image content
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(&apos;/api/posts&apos;),
          expect.objectContaining({
            method: &apos;POST&apos;,
            body: expect.stringContaining(&apos;image1.webp&apos;)
          })
        )
      })
    })
  })

  describe(&apos;Error Handling&apos;, () => {
    test(&apos;should handle upload validation errors gracefully&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const oversizedFile = createMockImageFile(&apos;large.jpg&apos;, 15 * 1024 * 1024) // 15MB
      const fileInput = document.querySelector(&apos;input[type=&quot;file&quot;]&apos;) as HTMLInputElement
      const fileInputEvent = createMockFileInputEvent([oversizedFile])

      // Mock upload error
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        error: &apos;파일 크기는 10MB를 초과할 수 없습니다&apos;,
        uploadImages: jest.fn().mockResolvedValue({
          success: false,
          error: &apos;파일 크기는 10MB를 초과할 수 없습니다&apos;
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

    test(&apos;should recover from upload errors&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        error: &apos;네트워크 오류&apos;,
        clearError: jest.fn()
      })

      render(<WritePostForm />)

      // Verify error is shown
      expect(screen.getByText(/네트워크 오류/)).toBeInTheDocument()

      // Act - try new upload after clearing error
      const clearButton = screen.getByRole(&apos;button&apos;, { name: /clear|close|dismiss/i })
      await user.click(clearButton)

      // Assert
      expect(mockUseImageUpload.clearError).toHaveBeenCalled()
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    test(&apos;should provide proper ARIA labels for upload elements&apos;, () => {
      // Arrange
      render(<WritePostForm />)

      // Assert
      const uploadButton = screen.getByRole(&apos;button&apos;, { name: /이미지 업로드|image upload/i })
      expect(uploadButton).toHaveAttribute(&apos;aria-label&apos;)

      const fileInput = document.querySelector(&apos;input[type=&quot;file&quot;]&apos;)
      expect(fileInput).toHaveAttribute(&apos;aria-label&apos;)
    })

    test(&apos;should announce upload progress to screen readers&apos;, () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        uploading: true,
        uploadProgress: 65
      })

      render(<WritePostForm />)

      // Assert
      const progressBar = screen.getByRole(&apos;progressbar&apos;)
      expect(progressBar).toHaveAttribute(&apos;aria-valuenow&apos;, &apos;65&apos;)
      expect(progressBar).toHaveAttribute(&apos;aria-valuemin&apos;, &apos;0&apos;)
      expect(progressBar).toHaveAttribute(&apos;aria-valuemax&apos;, &apos;100&apos;)
    })
  })
})

// These tests must FAIL initially as per TDD requirements
// The WritePostForm component needs to be updated to handle the FileList timing bug
// and other upload flow improvements to make these tests pass