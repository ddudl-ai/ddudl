// Integration test for editor content sync before submit

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WritePostForm } from '../WritePostForm'

// Mock the useImageUpload hook
jest.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: jest.fn()
}))

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

// Mock Jodit Editor with realistic behavior
const mockJoditEditor = {
  getContent: jest.fn(),
  setContent: jest.fn(),
  insertHTML: jest.fn(),
  events: {
    on: jest.fn()
  }
}

jest.mock('@/components/editor/JoditEditor', () => {
  return function MockJoditEditor({ value, onChange, onBlur, ref }: any) {
    // Simulate the real Jodit editor behavior
    React.useImperativeHandle(ref, () => mockJoditEditor)

    // Mock editor content state
    const [editorContent, setEditorContent] = React.useState(value || '')

    React.useEffect(() => {
      setEditorContent(value || '')
    }, [value])

    return (
      <div data-testid="jodit-editor-container">
        <textarea
          data-testid="jodit-editor"
          value={editorContent}
          onChange={(e) => {
            setEditorContent(e.target.value)
            onChange?.(e.target.value)
          }}
          onBlur={(e) => {
            // Simulate the content sync issue - editor might have different content
            const actualEditorContent = mockJoditEditor.getContent() || editorContent
            onBlur?.(actualEditorContent)
          }}
          placeholder="Write your post content..."
        />
      </div>
    )
  }
})

const mockUseImageUpload = {
  images: [],
  uploading: false,
  uploadProgress: 0,
  error: null,
  uploadImages: jest.fn(),
  removeImage: jest.fn(),
  clearError: jest.fn()
}

// Mock global fetch for form submission
global.fetch = jest.fn()

describe('WritePostForm - Editor Content Sync', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mock implementations
    const { useImageUpload } = require('@/hooks/useImageUpload')
    useImageUpload.mockReturnValue(mockUseImageUpload)

    // Reset Jodit mock
    mockJoditEditor.getContent.mockReturnValue('')
    mockJoditEditor.setContent.mockClear()
    mockJoditEditor.insertHTML.mockClear()

    // Mock successful form submission
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        id: 'new-post-id',
        url: '/ai/posts/new-post-id'
      })
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Content Synchronization Before Submit', () => {
    test('should sync editor content to form state before submission', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId('jodit-editor') as HTMLTextAreaElement

      // Fill form fields
      await user.type(titleInput, 'Test Post Title')
      await user.type(authorInput, 'Test Author')
      await user.type(editor, 'Initial content')

      // Mock Jodit editor having different content than the textarea
      const actualEditorContent = 'Initial content with <img src="https://example.com/image.jpg" alt="image" /> and more text'
      mockJoditEditor.getContent.mockReturnValue(actualEditorContent)

      // Act - Submit form
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Form should call editor.getContent() before submitting
      await waitFor(() => {
        expect(mockJoditEditor.getContent).toHaveBeenCalled()
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(actualEditorContent)
          })
        )
      })
    })

    test('should handle content sync timing correctly', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId('jodit-editor')

      await user.type(titleInput, 'Sync Test Post')
      await user.type(authorInput, 'Test Author')
      await user.type(editor, 'Content to sync')

      // Mock the timing issue - editor content not immediately available
      mockJoditEditor.getContent.mockImplementation(() => {
        // Simulate async content retrieval with delay
        return new Promise(resolve => {
          setTimeout(() => resolve('Content to sync with media <img src="test.jpg" />'), 100)
        })
      })

      // Act - Submit form
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should wait for content sync before submitting
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('<img src="test.jpg" />')
          })
        )
      }, { timeout: 5000 })
    })

    test('should preserve media content during sync', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      const mockImages = [
        {
          id: '1',
          url: 'https://storage.supabase.co/v1/object/public/post-images/test1.webp',
          file_name: 'test1.jpg',
          upload_status: 'completed'
        },
        {
          id: '2',
          url: 'https://storage.supabase.co/v1/object/public/post-images/test2.webp',
          file_name: 'test2.png',
          upload_status: 'completed'
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages
      })

      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, 'Media Test Post')
      await user.type(authorInput, 'Test Author')

      // Simulate inserting images into editor
      const insertButton1 = screen.getAllByRole('button', { name: /insert/i })[0]
      const insertButton2 = screen.getAllByRole('button', { name: /insert/i })[1]

      await user.click(insertButton1)
      await user.click(insertButton2)

      // Mock editor content with media
      const editorContentWithMedia = `
        <p>Post with images:</p>
        <img src="https://storage.supabase.co/v1/object/public/post-images/test1.webp" alt="test1.jpg" />
        <p>Some text between images</p>
        <img src="https://storage.supabase.co/v1/object/public/post-images/test2.webp" alt="test2.png" />
        <p>Final paragraph</p>
      `
      mockJoditEditor.getContent.mockReturnValue(editorContentWithMedia)

      // Act - Submit form
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should preserve all media content
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringMatching(/<img.*test1\.webp.*>/)
          })
        )
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringMatching(/<img.*test2\.webp.*>/)
          })
        )
      })
    })

    test('should handle YouTube embed preservation', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, 'Video Test Post')
      await user.type(authorInput, 'Test Author')

      // Mock editor content with YouTube embed
      const contentWithYouTube = `
        <p>Check out this video:</p>
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" frameborder="0"></iframe>
        <p>End of post</p>
      `
      mockJoditEditor.getContent.mockReturnValue(contentWithYouTube)

      // Act - Submit form
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - YouTube embed should be preserved
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringMatching(/<iframe.*youtube\.com.*<\/iframe>/)
          })
        )
      })
    })
  })

  describe('Content Sync Error Handling', () => {
    test('should handle editor content retrieval failure', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId('jodit-editor')

      await user.type(titleInput, 'Error Test Post')
      await user.type(authorInput, 'Test Author')
      await user.type(editor, 'Basic content')

      // Mock editor content retrieval failure
      mockJoditEditor.getContent.mockImplementation(() => {
        throw new Error('Editor content not available')
      })

      // Act - Submit form
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should fallback to textarea content
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('Basic content')
          })
        )
      })
    })

    test('should show error message when content sync fails', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, 'Sync Error Test')
      await user.type(authorInput, 'Test Author')

      // Mock persistent sync failure
      mockJoditEditor.getContent.mockRejectedValue(new Error('Sync failed'))

      // Act - Try to submit
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should show error message
      await waitFor(() => {
        const errorMessage = screen.getByText(/content.*sync.*error|editor.*error|저장.*오류/)
        expect(errorMessage).toBeInTheDocument()
      })

      // Form should not be submitted
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('should retry content sync on failure', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, 'Retry Test Post')
      await user.type(authorInput, 'Test Author')

      let attemptCount = 0
      mockJoditEditor.getContent.mockImplementation(() => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error('First attempt failed')
        }
        return 'Content retrieved on retry'
      })

      // Act - Submit form
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should retry and succeed
      await waitFor(() => {
        expect(mockJoditEditor.getContent).toHaveBeenCalledTimes(2)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('Content retrieved on retry')
          })
        )
      })
    })
  })

  describe('Editor Event Handling', () => {
    test('should sync content on editor blur before submit', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId('jodit-editor')

      await user.type(titleInput, 'Blur Sync Test')
      await user.type(authorInput, 'Test Author')
      await user.type(editor, 'Editor content')

      // Mock different content in editor
      mockJoditEditor.getContent.mockReturnValue('Editor content with unsaved changes')

      // Act - Blur editor then submit
      await user.click(editor)
      await user.tab() // This should trigger blur

      await waitFor(() => {
        // Content should be synced after blur
        expect(editor).toHaveValue('Editor content with unsaved changes')
      })

      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Synced content should be submitted
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('Editor content with unsaved changes')
          })
        )
      })
    })

    test('should prevent submission if content sync is in progress', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, 'Sync In Progress Test')
      await user.type(authorInput, 'Test Author')

      // Mock slow content sync
      mockJoditEditor.getContent.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('Slowly synced content'), 2000)
        })
      })

      // Act - Try to submit immediately
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Submit button should be disabled during sync
      expect(submitButton).toBeDisabled()

      // Wait for sync to complete
      await waitFor(() => {
        expect(submitButton).toBeEnabled()
      }, { timeout: 3000 })
    })
  })

  describe('Form Validation with Content Sync', () => {
    test('should validate synced content before submission', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId('jodit-editor')

      await user.type(titleInput, 'Validation Test')
      await user.type(authorInput, 'Test Author')
      await user.type(editor, 'Short')

      // Mock editor having empty content after sync
      mockJoditEditor.getContent.mockReturnValue('')

      // Act - Try to submit
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should validate synced content and show error
      await waitFor(() => {
        const validationError = screen.getByText(/content.*required|내용.*필수|내용.*입력/)
        expect(validationError).toBeInTheDocument()
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('should show loading state during content sync', async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, 'Loading Test')
      await user.type(authorInput, 'Test Author')

      // Mock slow content sync
      mockJoditEditor.getContent.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('Synced content'), 1000)
        })
      })

      // Act - Submit form
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should show loading state
      const loadingIndicator = screen.getByText(/syncing|동기화|processing|처리 중/)
      expect(loadingIndicator).toBeInTheDocument()

      // Wait for completion
      await waitFor(() => {
        expect(loadingIndicator).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Multiple Content Types Sync', () => {
    test('should sync mixed content (text, images, embeds)', async () => {
      // Arrange
      const { useImageUpload } = require('@/hooks/useImageUpload')
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: [{
          id: '1',
          url: 'https://storage.supabase.co/v1/object/public/post-images/mixed.webp',
          file_name: 'mixed.jpg',
          upload_status: 'completed'
        }]
      })

      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, 'Mixed Content Test')
      await user.type(authorInput, 'Test Author')

      // Mock complex editor content
      const complexContent = `
        <h2>Article Title</h2>
        <p>Introduction paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
        <img src="https://storage.supabase.co/v1/object/public/post-images/mixed.webp" alt="mixed.jpg" />
        <p>Text after image</p>
        <iframe src="https://www.youtube.com/embed/example" width="560" height="315"></iframe>
        <ul>
          <li>List item 1</li>
          <li>List item 2</li>
        </ul>
        <p>Final paragraph</p>
      `
      mockJoditEditor.getContent.mockReturnValue(complexContent)

      // Act - Submit form
      const submitButton = screen.getByRole('button', { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - All content types should be preserved
      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const submittedContent = fetchCall[1].body

        expect(submittedContent).toContain('<h2>Article Title</h2>')
        expect(submittedContent).toContain('<img src="https://storage.supabase.co')
        expect(submittedContent).toContain('<iframe src="https://www.youtube.com')
        expect(submittedContent).toContain('<ul>')
        expect(submittedContent).toContain('<strong>bold</strong>')
      })
    })
  })
})

// These tests must FAIL initially as per TDD requirements
// The WritePostForm component needs to be implemented/fixed to properly
// handle editor content synchronization before form submission