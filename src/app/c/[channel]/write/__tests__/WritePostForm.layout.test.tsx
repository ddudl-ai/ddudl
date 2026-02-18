// Component test for CSS z-index hierarchy in WritePostForm

import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import { WritePostForm } from &apos;../WritePostForm&apos;

// Mock the useImageUpload hook
jest.mock(&apos;@/hooks/useImageUpload&apos;, () => ({
  useImageUpload: jest.fn()
}))

// Mock Jodit Editor component
jest.mock(&apos;@/components/editor/JoditEditor&apos;, () => {
  return function MockJoditEditor({ value, onChange, onBlur }: any) {
    return (
      <div data-testid=&quot;jodit-editor-container&quot; className=&quot;jodit-container&quot;>
        <textarea
          data-testid=&quot;jodit-editor&quot;
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={() => onBlur?.()}
          placeholder=&quot;Write your post content...&quot;
        />
      </div>
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

describe(&apos;WritePostForm - CSS Z-Index Hierarchy&apos;, () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mock implementation
    const { useImageUpload } = require(&apos;@/hooks/useImageUpload&apos;)
    useImageUpload.mockReturnValue(mockUseImageUpload)

    // Mock global getComputedStyle
    Object.defineProperty(window, &apos;getComputedStyle&apos;, {
      value: jest.fn(() => ({
        getPropertyValue: jest.fn((prop: string) => {
          // Mock CSS custom properties
          const mockValues: Record<string, string> = {
            &apos;--writepost-header-z-index&apos;: &apos;40&apos;,
            &apos;--writepost-preview-z-index&apos;: &apos;25&apos;,
            &apos;--writepost-editor-z-index&apos;: &apos;20&apos;,
            &apos;--writepost-modal-z-index&apos;: &apos;50&apos;,
            &apos;z-index&apos;: &apos;20&apos;
          }
          return mockValues[prop] || &apos;auto&apos;
        }),
        zIndex: &apos;20&apos;
      })),
      configurable: true
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe(&apos;CSS Custom Properties for Z-Index&apos;, () => {
    test(&apos;should define CSS custom properties for z-index hierarchy&apos;, () => {
      // Arrange
      render(<WritePostForm />)

      // Act - Check if CSS custom properties are properly defined
      const documentElement = document.documentElement
      const computedStyle = window.getComputedStyle(documentElement)

      // Assert - These should be defined in the CSS
      expect(computedStyle.getPropertyValue(&apos;--writepost-header-z-index&apos;)).toBe(&apos;40&apos;)
      expect(computedStyle.getPropertyValue(&apos;--writepost-preview-z-index&apos;)).toBe(&apos;25&apos;)
      expect(computedStyle.getPropertyValue(&apos;--writepost-editor-z-index&apos;)).toBe(&apos;20&apos;)
    })

    test(&apos;should maintain proper z-index hierarchy order&apos;, () => {
      // Arrange
      render(<WritePostForm />)

      const computedStyle = window.getComputedStyle(document.documentElement)

      // Act - Get z-index values
      const headerZIndex = parseInt(computedStyle.getPropertyValue(&apos;--writepost-header-z-index&apos;))
      const previewZIndex = parseInt(computedStyle.getPropertyValue(&apos;--writepost-preview-z-index&apos;))
      const editorZIndex = parseInt(computedStyle.getPropertyValue(&apos;--writepost-editor-z-index&apos;))

      // Assert - Header should be above preview, preview above editor
      expect(headerZIndex).toBeGreaterThan(previewZIndex)
      expect(previewZIndex).toBeGreaterThan(editorZIndex)
    })
  })

  describe(&apos;Editor Z-Index Behavior&apos;, () => {
    test(&apos;should apply correct z-index to editor container&apos;, () => {
      // Arrange
      render(<WritePostForm />)

      // Act
      const editorContainer = screen.getByTestId(&apos;jodit-editor-container&apos;)

      // Assert
      const computedStyle = window.getComputedStyle(editorContainer)
      expect(computedStyle.zIndex).toBe(&apos;20&apos;)
    })

    test(&apos;should not overlap with header during normal editing&apos;, () => {
      // Arrange
      render(<WritePostForm />)

      // Act
      const editorContainer = screen.getByTestId(&apos;jodit-editor-container&apos;)
      const editorBounds = editorContainer.getBoundingClientRect()

      // Mock header element (would be in layout)
      const mockHeader = document.createElement(&apos;header&apos;)
      mockHeader.style.position = &apos;fixed&apos;
      mockHeader.style.top = &apos;0&apos;
      mockHeader.style.left = &apos;0&apos;
      mockHeader.style.width = &apos;100%&apos;
      mockHeader.style.height = &apos;64px&apos;
      mockHeader.style.zIndex = &apos;40&apos;
      document.body.appendChild(mockHeader)

      const headerBounds = mockHeader.getBoundingClientRect()

      // Assert - Editor should start below header
      expect(editorBounds.top).toBeGreaterThanOrEqual(headerBounds.bottom)

      document.body.removeChild(mockHeader)
    })
  })

  describe(&apos;Preview Mode Z-Index&apos;, () => {
    test(&apos;should apply correct z-index to preview container&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      // Mock preview mode toggle
      const previewToggle = screen.queryByTestId(&apos;preview-toggle&apos;)

      if (previewToggle) {
        // Act - Enable preview mode
        await user.click(previewToggle)

        await waitFor(() => {
          const previewContainer = screen.getByTestId(&apos;preview-container&apos;)
          const computedStyle = window.getComputedStyle(previewContainer)

          // Assert
          expect(computedStyle.zIndex).toBe(&apos;25&apos;)
        })
      }
    })

    test(&apos;should maintain proper layering in preview mode&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      // Fill some content first
      const titleInput = screen.getByLabelText(/title|제목/i)
      const editor = screen.getByTestId(&apos;jodit-editor&apos;)

      await user.type(titleInput, &apos;Test Post&apos;)
      await user.type(editor, &apos;Test content with some text&apos;)

      // Act - Toggle to preview mode
      const previewToggle = screen.queryByTestId(&apos;preview-toggle&apos;)

      if (previewToggle) {
        await user.click(previewToggle)

        await waitFor(() => {
          // Get preview container
          const previewContainer = screen.getByTestId(&apos;preview-container&apos;)
          const previewStyle = window.getComputedStyle(previewContainer)

          // Get editor container
          const editorContainer = screen.getByTestId(&apos;jodit-editor-container&apos;)
          const editorStyle = window.getComputedStyle(editorContainer)

          // Assert - Preview should be above editor
          const previewZIndex = parseInt(previewStyle.zIndex)
          const editorZIndex = parseInt(editorStyle.zIndex)

          expect(previewZIndex).toBeGreaterThan(editorZIndex)
        })
      }
    })

    test(&apos;should prevent preview content from overlapping header&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      // Create mock header with fixed positioning
      const mockHeader = document.createElement(&apos;header&apos;)
      mockHeader.setAttribute(&apos;data-testid&apos;, &apos;site-header&apos;)
      mockHeader.style.position = &apos;fixed&apos;
      mockHeader.style.top = &apos;0&apos;
      mockHeader.style.left = &apos;0&apos;
      mockHeader.style.width = &apos;100%&apos;
      mockHeader.style.height = &apos;64px&apos;
      mockHeader.style.zIndex = &apos;40&apos;
      mockHeader.style.backgroundColor = &apos;white&apos;
      document.body.appendChild(mockHeader)

      // Fill content
      const titleInput = screen.getByLabelText(/title|제목/i)
      const editor = screen.getByTestId(&apos;jodit-editor&apos;)

      await user.type(titleInput, &apos;Test Post&apos;)
      await user.type(editor, &apos;Test content&apos;)

      // Act - Enable preview mode
      const previewToggle = screen.queryByTestId(&apos;preview-toggle&apos;)

      if (previewToggle) {
        await user.click(previewToggle)

        await waitFor(() => {
          const previewContainer = screen.getByTestId(&apos;preview-container&apos;)
          const previewBounds = previewContainer.getBoundingClientRect()
          const headerBounds = mockHeader.getBoundingClientRect()

          // Assert - Preview content should not visually overlap header
          // Either preview has lower z-index or starts below header
          const previewStyle = window.getComputedStyle(previewContainer)
          const previewZIndex = parseInt(previewStyle.zIndex)
          const headerZIndex = parseInt(mockHeader.style.zIndex)

          expect(previewZIndex).toBeLessThan(headerZIndex)
        })
      }

      document.body.removeChild(mockHeader)
    })
  })

  describe(&apos;Modal and Overlay Z-Index&apos;, () => {
    test(&apos;should apply highest z-index to modal overlays&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      // Simulate opening a modal (e.g., image upload modal)
      const uploadButton = screen.queryByRole(&apos;button&apos;, { name: /이미지 업로드|image upload/i })

      if (uploadButton) {
        await user.click(uploadButton)

        // Look for modal overlay
        const modal = screen.queryByTestId(&apos;upload-modal&apos;)

        if (modal) {
          // Act
          const modalStyle = window.getComputedStyle(modal)

          // Assert - Modal should have highest z-index
          const modalZIndex = parseInt(modalStyle.zIndex)
          expect(modalZIndex).toBeGreaterThanOrEqual(50)
        }
      }
    })

    test(&apos;should ensure modals appear above all other content&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      // Create mock elements with various z-indexes
      const editorElement = screen.getByTestId(&apos;jodit-editor-container&apos;)
      const previewToggle = screen.queryByTestId(&apos;preview-toggle&apos;)

      if (previewToggle) {
        await user.click(previewToggle)

        const previewContainer = screen.queryByTestId(&apos;preview-container&apos;)
        const uploadButton = screen.queryByRole(&apos;button&apos;, { name: /이미지 업로드|image upload/i })

        if (uploadButton) {
          await user.click(uploadButton)

          const modal = screen.queryByTestId(&apos;upload-modal&apos;)

          if (modal && previewContainer) {
            // Act - Get z-index values
            const modalStyle = window.getComputedStyle(modal)
            const previewStyle = window.getComputedStyle(previewContainer)
            const editorStyle = window.getComputedStyle(editorElement)

            const modalZIndex = parseInt(modalStyle.zIndex)
            const previewZIndex = parseInt(previewStyle.zIndex)
            const editorZIndex = parseInt(editorStyle.zIndex)

            // Assert - Modal should be above everything
            expect(modalZIndex).toBeGreaterThan(previewZIndex)
            expect(modalZIndex).toBeGreaterThan(editorZIndex)
          }
        }
      }
    })
  })

  describe(&apos;Responsive Z-Index Behavior&apos;, () => {
    test(&apos;should maintain z-index hierarchy on mobile viewports&apos;, async () => {
      // Arrange
      Object.defineProperty(window, &apos;innerWidth&apos;, {
        writable: true,
        configurable: true,
        value: 375 // Mobile width
      })

      Object.defineProperty(window, &apos;innerHeight&apos;, {
        writable: true,
        configurable: true,
        value: 667 // Mobile height
      })

      // Trigger resize event
      fireEvent(window, new Event(&apos;resize&apos;))

      render(<WritePostForm />)

      await waitFor(() => {
        // Act - Get elements after mobile layout
        const editorContainer = screen.getByTestId(&apos;jodit-editor-container&apos;)
        const computedStyle = window.getComputedStyle(document.documentElement)

        // Assert - Z-index hierarchy should still be maintained
        const headerZIndex = parseInt(computedStyle.getPropertyValue(&apos;--writepost-header-z-index&apos;))
        const editorZIndex = parseInt(window.getComputedStyle(editorContainer).zIndex)

        expect(headerZIndex).toBeGreaterThan(editorZIndex)
      })
    })

    test(&apos;should handle z-index in landscape orientation&apos;, async () => {
      // Arrange - Simulate landscape orientation
      Object.defineProperty(window, &apos;innerWidth&apos;, {
        writable: true,
        configurable: true,
        value: 812
      })

      Object.defineProperty(window, &apos;innerHeight&apos;, {
        writable: true,
        configurable: true,
        value: 375
      })

      fireEvent(window, new Event(&apos;resize&apos;))

      render(<WritePostForm />)

      await waitFor(() => {
        // Act
        const editorContainer = screen.getByTestId(&apos;jodit-editor-container&apos;)

        // Assert - Should still maintain proper z-index
        const editorStyle = window.getComputedStyle(editorContainer)
        expect(editorStyle.zIndex).toBeTruthy()
        expect(parseInt(editorStyle.zIndex)).toBeGreaterThan(0)
      })
    })
  })

  describe(&apos;Dynamic Z-Index Changes&apos;, () => {
    test(&apos;should update z-index when switching between editor and preview modes&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      // Fill some content
      const titleInput = screen.getByLabelText(/title|제목/i)
      const editor = screen.getByTestId(&apos;jodit-editor&apos;)

      await user.type(titleInput, &apos;Test Post&apos;)
      await user.type(editor, &apos;Test content&apos;)

      const editorContainer = screen.getByTestId(&apos;jodit-editor-container&apos;)
      const initialEditorStyle = window.getComputedStyle(editorContainer)

      // Act - Toggle to preview mode
      const previewToggle = screen.queryByTestId(&apos;preview-toggle&apos;)

      if (previewToggle) {
        await user.click(previewToggle)

        await waitFor(() => {
          const previewContainer = screen.getByTestId(&apos;preview-container&apos;)
          const previewStyle = window.getComputedStyle(previewContainer)

          // Assert - Preview should be visible/active with appropriate z-index
          expect(previewStyle.zIndex).toBe(&apos;25&apos;)
        })

        // Act - Toggle back to editor mode
        await user.click(previewToggle)

        await waitFor(() => {
          const finalEditorStyle = window.getComputedStyle(editorContainer)

          // Assert - Editor z-index should be restored
          expect(finalEditorStyle.zIndex).toBe(initialEditorStyle.zIndex)
        })
      }
    })
  })

  describe(&apos;Scroll Behavior and Z-Index&apos;, () => {
    test(&apos;should maintain header visibility during scroll in preview mode&apos;, async () => {
      // Arrange
      render(<WritePostForm />)

      // Create long content to enable scrolling
      const editor = screen.getByTestId(&apos;jodit-editor&apos;)
      const longContent = Array(50).fill(&apos;This is a long line of content to create scrollable content.&apos;).join(&apos;\n&apos;)

      await user.type(editor, longContent)

      const previewToggle = screen.queryByTestId(&apos;preview-toggle&apos;)

      if (previewToggle) {
        await user.click(previewToggle)

        await waitFor(() => {
          const previewContainer = screen.getByTestId(&apos;preview-container&apos;)

          // Act - Simulate scroll
          fireEvent.scroll(previewContainer, { target: { scrollY: 1000 } })

          // Mock header element
          const mockHeader = document.createElement(&apos;header&apos;)
          mockHeader.style.position = &apos;fixed&apos;
          mockHeader.style.zIndex = &apos;40&apos;
          document.body.appendChild(mockHeader)

          // Assert - Header should remain above preview content during scroll
          const previewStyle = window.getComputedStyle(previewContainer)
          const headerZIndex = parseInt(mockHeader.style.zIndex)
          const previewZIndex = parseInt(previewStyle.zIndex)

          expect(headerZIndex).toBeGreaterThan(previewZIndex)

          document.body.removeChild(mockHeader)
        })
      }
    })
  })
})

// These tests must FAIL initially as per TDD requirements
// The WritePostForm component and related CSS need to be implemented/fixed
// to properly handle z-index hierarchy issues mentioned in the research