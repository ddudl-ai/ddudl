// Integration test for editor content sync before submit

import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import { WritePostForm } from &apos;../WritePostForm&apos;

// Mock the useImageUpload hook
jest.mock(&apos;@/hooks/useImageUpload&apos;, () => ({
  useImageUpload: jest.fn()
}))

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

// Mock Jodit Editor with realistic behavior
const mockJoditEditor = {
  getContent: jest.fn(),
  setContent: jest.fn(),
  insertHTML: jest.fn(),
  events: {
    on: jest.fn()
  }
}

jest.mock(&apos;@/components/editor/JoditEditor&apos;, () => {
  return function MockJoditEditor({ value, onChange, onBlur, ref }: any) {
    // Simulate the real Jodit editor behavior
    React.useImperativeHandle(ref, () => mockJoditEditor)

    // Mock editor content state
    const [editorContent, setEditorContent] = React.useState(value || &apos;')

    React.useEffect(() => {
      setEditorContent(value || &apos;')
    }, [value])

    return (
      <div data-testid=&quot;jodit-editor-container&quot;>
        <textarea
          data-testid=&quot;jodit-editor&quot;
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
          placeholder=&quot;Write your post content...&quot;
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

describe(&apos;WritePostForm - Editor Content Sync&apos;, () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mock implementations
    const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
    useImageUpload.mockReturnValue(mockUseImageUpload)

    // Reset Jodit mock
    mockJoditEditor.getContent.mockReturnValue(&apos;')
    mockJoditEditor.setContent.mockClear()
    mockJoditEditor.insertHTML.mockClear()

    // Mock successful form submission
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        id: &apos;new-post-id&apos;,
        url: &apos;/ai/posts/new-post-id&apos;
      })
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe(&apos;Content Synchronization Before Submit&apos;, () => {
    test(&apos;should sync editor content to form state before submission&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId(&apos;jodit-editor&apos;) as HTMLTextAreaElement

      // Fill form fields
      await user.type(titleInput, &apos;Test Post Title&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)
      await user.type(editor, &apos;Initial content&apos;)

      // Mock Jodit editor having different content than the textarea
      const actualEditorContent = &apos;Initial content with <img src=&quot;https://example.com/image.jpg&quot; alt=&quot;image&quot; /> and more text&apos;
      mockJoditEditor.getContent.mockReturnValue(actualEditorContent)

      // Act - Submit form
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Form should call editor.getContent() before submitting
      await waitFor(() => {
        expect(mockJoditEditor.getContent).toHaveBeenCalled()
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: &apos;POST&apos;,
            body: expect.stringContaining(actualEditorContent)
          })
        )
      })
    })

    test(&apos;should handle content sync timing correctly&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId(&apos;jodit-editor&apos;)

      await user.type(titleInput, &apos;Sync Test Post&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)
      await user.type(editor, &apos;Content to sync&apos;)

      // Mock the timing issue - editor content not immediately available
      mockJoditEditor.getContent.mockImplementation(() => {
        // Simulate async content retrieval with delay
        return new Promise(resolve => {
          setTimeout(() => resolve(&apos;Content to sync with media <img src=&quot;test.jpg&quot; />&apos;), 100)
        })
      })

      // Act - Submit form
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should wait for content sync before submitting
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining(&apos;<img src=&quot;test.jpg&quot; />&apos;)
          })
        )
      }, { timeout: 5000 })
    })

    test(&apos;should preserve media content during sync&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      const mockImages = [
        {
          id: &apos;1&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/test1.webp&apos;,
          file_name: &apos;test1.jpg&apos;,
          upload_status: &apos;completed&apos;
        },
        {
          id: &apos;2&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/test2.webp&apos;,
          file_name: &apos;test2.png&apos;,
          upload_status: &apos;completed&apos;
        }
      ]

      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: mockImages
      })

      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, &apos;Media Test Post&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)

      // Simulate inserting images into editor
      const insertButton1 = screen.getAllByRole(&apos;button&apos;, { name: /insert/i })[0]
      const insertButton2 = screen.getAllByRole(&apos;button&apos;, { name: /insert/i })[1]

      await user.click(insertButton1)
      await user.click(insertButton2)

      // Mock editor content with media
      const editorContentWithMedia = `
        <p>Post with images:</p>
        <img src=&quot;https://storage.supabase.co/v1/object/public/post-images/test1.webp&quot; alt=&quot;test1.jpg&quot; />
        <p>Some text between images</p>
        <img src=&quot;https://storage.supabase.co/v1/object/public/post-images/test2.webp&quot; alt=&quot;test2.png&quot; />
        <p>Final paragraph</p>
      `
      mockJoditEditor.getContent.mockReturnValue(editorContentWithMedia)

      // Act - Submit form
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
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

    test(&apos;should handle YouTube embed preservation&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, &apos;Video Test Post&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)

      // Mock editor content with YouTube embed
      const contentWithYouTube = `
        <p>Check out this video:</p>
        <iframe src=&quot;https://www.youtube.com/embed/dQw4w9WgXcQ&quot; width=&quot;560&quot; height=&quot;315&quot; frameborder=&quot;0&quot;></iframe>
        <p>End of post</p>
      `
      mockJoditEditor.getContent.mockReturnValue(contentWithYouTube)

      // Act - Submit form
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
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

  describe(&apos;Content Sync Error Handling&apos;, () => {
    test(&apos;should handle editor content retrieval failure&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId(&apos;jodit-editor&apos;)

      await user.type(titleInput, &apos;Error Test Post&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)
      await user.type(editor, &apos;Basic content&apos;)

      // Mock editor content retrieval failure
      mockJoditEditor.getContent.mockImplementation(() => {
        throw new Error(&apos;Editor content not available&apos;)
      })

      // Act - Submit form
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should fallback to textarea content
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining(&apos;Basic content&apos;)
          })
        )
      })
    })

    test(&apos;should show error message when content sync fails&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, &apos;Sync Error Test&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)

      // Mock persistent sync failure
      mockJoditEditor.getContent.mockRejectedValue(new Error(&apos;Sync failed&apos;))

      // Act - Try to submit
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should show error message
      await waitFor(() => {
        const errorMessage = screen.getByText(/content.*sync.*error|editor.*error|저장.*오류/)
        expect(errorMessage).toBeInTheDocument()
      })

      // Form should not be submitted
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test(&apos;should retry content sync on failure&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, &apos;Retry Test Post&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)

      let attemptCount = 0
      mockJoditEditor.getContent.mockImplementation(() => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error(&apos;First attempt failed&apos;)
        }
        return &apos;Content retrieved on retry&apos;
      })

      // Act - Submit form
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should retry and succeed
      await waitFor(() => {
        expect(mockJoditEditor.getContent).toHaveBeenCalledTimes(2)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining(&apos;Content retrieved on retry&apos;)
          })
        )
      })
    })
  })

  describe(&apos;Editor Event Handling&apos;, () => {
    test(&apos;should sync content on editor blur before submit&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId(&apos;jodit-editor&apos;)

      await user.type(titleInput, &apos;Blur Sync Test&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)
      await user.type(editor, &apos;Editor content&apos;)

      // Mock different content in editor
      mockJoditEditor.getContent.mockReturnValue(&apos;Editor content with unsaved changes&apos;)

      // Act - Blur editor then submit
      await user.click(editor)
      await user.tab() // This should trigger blur

      await waitFor(() => {
        // Content should be synced after blur
        expect(editor).toHaveValue(&apos;Editor content with unsaved changes&apos;)
      })

      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Synced content should be submitted
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining(&apos;Editor content with unsaved changes&apos;)
          })
        )
      })
    })

    test(&apos;should prevent submission if content sync is in progress&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, &apos;Sync In Progress Test&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)

      // Mock slow content sync
      mockJoditEditor.getContent.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(&apos;Slowly synced content&apos;), 2000)
        })
      })

      // Act - Try to submit immediately
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Submit button should be disabled during sync
      expect(submitButton).toBeDisabled()

      // Wait for sync to complete
      await waitFor(() => {
        expect(submitButton).toBeEnabled()
      }, { timeout: 3000 })
    })
  })

  describe(&apos;Form Validation with Content Sync&apos;, () => {
    test(&apos;should validate synced content before submission&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)
      const editor = screen.getByTestId(&apos;jodit-editor&apos;)

      await user.type(titleInput, &apos;Validation Test&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)
      await user.type(editor, &apos;Short&apos;)

      // Mock editor having empty content after sync
      mockJoditEditor.getContent.mockReturnValue(&apos;')

      // Act - Try to submit
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - Should validate synced content and show error
      await waitFor(() => {
        const validationError = screen.getByText(/content.*required|내용.*필수|내용.*입력/)
        expect(validationError).toBeInTheDocument()
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    test(&apos;should show loading state during content sync&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, &apos;Loading Test&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)

      // Mock slow content sync
      mockJoditEditor.getContent.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(&apos;Synced content&apos;), 1000)
        })
      })

      // Act - Submit form
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
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

  describe(&apos;Multiple Content Types Sync&apos;, () => {
    test(&apos;should sync mixed content (text, images, embeds)&apos;, async () => {
      // Arrange
      const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
      useImageUpload.mockReturnValue({
        ...mockUseImageUpload,
        images: [{
          id: &apos;1&apos;,
          url: &apos;https://storage.supabase.co/v1/object/public/post-images/mixed.webp&apos;,
          file_name: &apos;mixed.jpg&apos;,
          upload_status: &apos;completed&apos;
        }]
      })

      render(<WritePostForm />)

      const titleInput = screen.getByLabelText(/title|제목/i)
      const authorInput = screen.getByLabelText(/author|작성자/i)

      await user.type(titleInput, &apos;Mixed Content Test&apos;)
      await user.type(authorInput, &apos;Test Author&apos;)

      // Mock complex editor content
      const complexContent = `
        <h2>Article Title</h2>
        <p>Introduction paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
        <img src=&quot;https://storage.supabase.co/v1/object/public/post-images/mixed.webp&quot; alt=&quot;mixed.jpg&quot; />
        <p>Text after image</p>
        <iframe src=&quot;https://www.youtube.com/embed/example&quot; width=&quot;560&quot; height=&quot;315&quot;></iframe>
        <ul>
          <li>List item 1</li>
          <li>List item 2</li>
        </ul>
        <p>Final paragraph</p>
      `
      mockJoditEditor.getContent.mockReturnValue(complexContent)

      // Act - Submit form
      const submitButton = screen.getByRole(&apos;button&apos;, { name: /submit|게시|post/i })
      await user.click(submitButton)

      // Assert - All content types should be preserved
      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const submittedContent = fetchCall[1].body

        expect(submittedContent).toContain(&apos;<h2>Article Title</h2>&apos;)
        expect(submittedContent).toContain(&apos;<img src=&quot;https://storage.supabase.co&apos;)
        expect(submittedContent).toContain(&apos;<iframe src=&quot;https://www.youtube.com&apos;)
        expect(submittedContent).toContain(&apos;<ul>&apos;)
        expect(submittedContent).toContain(&apos;<strong>bold</strong>&apos;)
      })
    })
  })
})

// These tests must FAIL initially as per TDD requirements
// The WritePostForm component needs to be implemented/fixed to properly
// handle editor content synchronization before form submission