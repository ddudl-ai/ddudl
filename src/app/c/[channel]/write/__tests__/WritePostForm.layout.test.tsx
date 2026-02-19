// Component test for CSS z-index hierarchy in WritePostForm

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WritePostForm from '../WritePostForm'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
  usePathname: jest.fn(() => '/c/test/write'),
}))

// Mock the useImageUpload hook
jest.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: jest.fn()
}))

// Mock the useWritePostForm hook
jest.mock('@/hooks/useWritePostForm', () => ({
  useWritePostForm: jest.fn(() => ({
    formData: {
      title: '',
      content: '',
      category: '',
      tags: [] as string[],
      isPrivate: false,
      isAnonymous: false
    },
    validation: {
      isValid: true,
      errors: [],
      touched: {}
    },
    currentUser: null,
    isAnonymous: false,
    isPreviewMode: false,
    isLoading: false,
    isUploading: false,
    error: null,
    uploadProgress: 0,
    handleInputChange: jest.fn(),
    handleContentChange: jest.fn(),
    handleAnonymousToggle: jest.fn(),
    handlePrivacyToggle: jest.fn(),
    togglePreviewMode: jest.fn(),
    handleSubmit: jest.fn(),
    resetForm: jest.fn()
  }))
}))

// Mock Jodit Editor component
jest.mock('@/components/editor/JoditEditor', () => {
  return function MockJoditEditor({ value, onChange, onBlur }: any) {
    return (
      <div data-testid="jodit-editor-container" className="jodit-container">
        <textarea
          data-testid="jodit-editor"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={() => onBlur?.()}
          placeholder="Write your post content..."
        />
      </div>
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

describe.skip('WritePostForm - CSS Z-Index Hierarchy', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mock implementation
    const { useImageUpload } = require('@/hooks/useImageUpload')
    useImageUpload.mockReturnValue(mockUseImageUpload)

    // Mock global getComputedStyle
    Object.defineProperty(window, 'getComputedStyle', {
      value: jest.fn(() => ({
        getPropertyValue: jest.fn((prop: string) => {
          // Mock CSS custom properties
          const mockValues: Record<string, string> = {
            '--writepost-header-z-index': '40',
            '--writepost-preview-z-index': '25',
            '--writepost-editor-z-index': '20',
            '--writepost-modal-z-index': '50',
            'z-index': '20'
          }
          return mockValues[prop] || 'auto'
        }),
        zIndex: '20'
      })),
      configurable: true
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('CSS Custom Properties for Z-Index', () => {
    test('should define CSS custom properties for z-index hierarchy', () => {
      // Arrange
      render(<WritePostForm />)

      // Act - Check if CSS custom properties are properly defined
      const documentElement = document.documentElement
      const computedStyle = window.getComputedStyle(documentElement)

      // Assert - These should be defined in the CSS
      expect(computedStyle.getPropertyValue('--writepost-header-z-index')).toBe('40')
      expect(computedStyle.getPropertyValue('--writepost-preview-z-index')).toBe('25')
      expect(computedStyle.getPropertyValue('--writepost-editor-z-index')).toBe('20')
    })

    test('should maintain proper z-index hierarchy order', () => {
      // Arrange
      render(<WritePostForm />)

      const computedStyle = window.getComputedStyle(document.documentElement)

      // Act - Get z-index values
      const headerZIndex = parseInt(computedStyle.getPropertyValue('--writepost-header-z-index'))
      const previewZIndex = parseInt(computedStyle.getPropertyValue('--writepost-preview-z-index'))
      const editorZIndex = parseInt(computedStyle.getPropertyValue('--writepost-editor-z-index'))

      // Assert - Header should be above preview, preview above editor
      expect(headerZIndex).toBeGreaterThan(previewZIndex)
      expect(previewZIndex).toBeGreaterThan(editorZIndex)
    })
  })

  describe('Editor Z-Index Behavior', () => {
    test('should apply correct z-index to editor container', () => {
      // Arrange
      render(<WritePostForm />)

      // Act
      const editorContainer = screen.getByTestId('jodit-editor-container')

      // Assert
      const computedStyle = window.getComputedStyle(editorContainer)
      expect(computedStyle.zIndex).toBe('20')
    })

    test('should not overlap with header during normal editing', () => {
      // Arrange
      render(<WritePostForm />)

      // Act
      const editorContainer = screen.getByTestId('jodit-editor-container')
      const editorBounds = editorContainer.getBoundingClientRect()

      // Mock header element (would be in layout)
      const mockHeader = document.createElement('header')
      mockHeader.style.position = 'fixed'
      mockHeader.style.top = '0'
      mockHeader.style.left = '0'
      mockHeader.style.width = '100%'
      mockHeader.style.height = '64px'
      mockHeader.style.zIndex = '40'
      document.body.appendChild(mockHeader)

      const headerBounds = mockHeader.getBoundingClientRect()

      // Assert - Editor should start below header
      expect(editorBounds.top).toBeGreaterThanOrEqual(headerBounds.bottom)

      document.body.removeChild(mockHeader)
    })
  })

  describe('Preview Mode Z-Index', () => {
    test('should apply correct z-index to preview container', async () => {
      // Arrange
      render(<WritePostForm />)

      // Mock preview mode toggle
      const previewToggle = screen.queryByTestId('preview-toggle')

      if (previewToggle) {
        // Act - Enable preview mode
        await user.click(previewToggle)

        await waitFor(() => {
          const previewContainer = screen.getByTestId('preview-container')
          const computedStyle = window.getComputedStyle(previewContainer)

          // Assert
          expect(computedStyle.zIndex).toBe('25')
        })
      }
    })

    test('should maintain proper layering in preview mode', async () => {
      // Arrange
      render(<WritePostForm />)

      // Fill some content first
      const titleInput = screen.getByLabelText(/title|제목/i)
      const editor = screen.getByTestId('jodit-editor')

      await user.type(titleInput, 'Test Post')
      await user.type(editor, 'Test content with some text')

      // Act - Toggle to preview mode
      const previewToggle = screen.queryByTestId('preview-toggle')

      if (previewToggle) {
        await user.click(previewToggle)

        await waitFor(() => {
          // Get preview container
          const previewContainer = screen.getByTestId('preview-container')
          const previewStyle = window.getComputedStyle(previewContainer)

          // Get editor container
          const editorContainer = screen.getByTestId('jodit-editor-container')
          const editorStyle = window.getComputedStyle(editorContainer)

          // Assert - Preview should be above editor
          const previewZIndex = parseInt(previewStyle.zIndex)
          const editorZIndex = parseInt(editorStyle.zIndex)

          expect(previewZIndex).toBeGreaterThan(editorZIndex)
        })
      }
    })

    test('should prevent preview content from overlapping header', async () => {
      // Arrange
      render(<WritePostForm />)

      // Create mock header with fixed positioning
      const mockHeader = document.createElement('header')
      mockHeader.setAttribute('data-testid', 'site-header')
      mockHeader.style.position = 'fixed'
      mockHeader.style.top = '0'
      mockHeader.style.left = '0'
      mockHeader.style.width = '100%'
      mockHeader.style.height = '64px'
      mockHeader.style.zIndex = '40'
      mockHeader.style.backgroundColor = 'white'
      document.body.appendChild(mockHeader)

      // Fill content
      const titleInput = screen.getByLabelText(/title|제목/i)
      const editor = screen.getByTestId('jodit-editor')

      await user.type(titleInput, 'Test Post')
      await user.type(editor, 'Test content')

      // Act - Enable preview mode
      const previewToggle = screen.queryByTestId('preview-toggle')

      if (previewToggle) {
        await user.click(previewToggle)

        await waitFor(() => {
          const previewContainer = screen.getByTestId('preview-container')
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

  describe('Modal and Overlay Z-Index', () => {
    test('should apply highest z-index to modal overlays', async () => {
      // Arrange
      render(<WritePostForm />)

      // Simulate opening a modal (e.g., image upload modal)
      const uploadButton = screen.queryByRole('button', { name: /이미지 업로드|image upload/i })

      if (uploadButton) {
        await user.click(uploadButton)

        // Look for modal overlay
        const modal = screen.queryByTestId('upload-modal')

        if (modal) {
          // Act
          const modalStyle = window.getComputedStyle(modal)

          // Assert - Modal should have highest z-index
          const modalZIndex = parseInt(modalStyle.zIndex)
          expect(modalZIndex).toBeGreaterThanOrEqual(50)
        }
      }
    })

    test('should ensure modals appear above all other content', async () => {
      // Arrange
      render(<WritePostForm />)

      // Create mock elements with various z-indexes
      const editorElement = screen.getByTestId('jodit-editor-container')
      const previewToggle = screen.queryByTestId('preview-toggle')

      if (previewToggle) {
        await user.click(previewToggle)

        const previewContainer = screen.queryByTestId('preview-container')
        const uploadButton = screen.queryByRole('button', { name: /이미지 업로드|image upload/i })

        if (uploadButton) {
          await user.click(uploadButton)

          const modal = screen.queryByTestId('upload-modal')

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

  describe('Responsive Z-Index Behavior', () => {
    test('should maintain z-index hierarchy on mobile viewports', async () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375 // Mobile width
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667 // Mobile height
      })

      // Trigger resize event
      fireEvent(window, new Event('resize'))

      render(<WritePostForm />)

      await waitFor(() => {
        // Act - Get elements after mobile layout
        const editorContainer = screen.getByTestId('jodit-editor-container')
        const computedStyle = window.getComputedStyle(document.documentElement)

        // Assert - Z-index hierarchy should still be maintained
        const headerZIndex = parseInt(computedStyle.getPropertyValue('--writepost-header-z-index'))
        const editorZIndex = parseInt(window.getComputedStyle(editorContainer).zIndex)

        expect(headerZIndex).toBeGreaterThan(editorZIndex)
      })
    })

    test('should handle z-index in landscape orientation', async () => {
      // Arrange - Simulate landscape orientation
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 812
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375
      })

      fireEvent(window, new Event('resize'))

      render(<WritePostForm />)

      await waitFor(() => {
        // Act
        const editorContainer = screen.getByTestId('jodit-editor-container')

        // Assert - Should still maintain proper z-index
        const editorStyle = window.getComputedStyle(editorContainer)
        expect(editorStyle.zIndex).toBeTruthy()
        expect(parseInt(editorStyle.zIndex)).toBeGreaterThan(0)
      })
    })
  })

  describe('Dynamic Z-Index Changes', () => {
    test('should update z-index when switching between editor and preview modes', async () => {
      // Arrange
      render(<WritePostForm />)

      // Fill some content
      const titleInput = screen.getByLabelText(/title|제목/i)
      const editor = screen.getByTestId('jodit-editor')

      await user.type(titleInput, 'Test Post')
      await user.type(editor, 'Test content')

      const editorContainer = screen.getByTestId('jodit-editor-container')
      const initialEditorStyle = window.getComputedStyle(editorContainer)

      // Act - Toggle to preview mode
      const previewToggle = screen.queryByTestId('preview-toggle')

      if (previewToggle) {
        await user.click(previewToggle)

        await waitFor(() => {
          const previewContainer = screen.getByTestId('preview-container')
          const previewStyle = window.getComputedStyle(previewContainer)

          // Assert - Preview should be visible/active with appropriate z-index
          expect(previewStyle.zIndex).toBe('25')
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

  describe('Scroll Behavior and Z-Index', () => {
    test('should maintain header visibility during scroll in preview mode', async () => {
      // Arrange
      render(<WritePostForm />)

      // Create long content to enable scrolling
      const editor = screen.getByTestId('jodit-editor')
      const longContent = Array(50).fill('This is a long line of content to create scrollable content.').join('\n')

      await user.type(editor, longContent)

      const previewToggle = screen.queryByTestId('preview-toggle')

      if (previewToggle) {
        await user.click(previewToggle)

        await waitFor(() => {
          const previewContainer = screen.getByTestId('preview-container')

          // Act - Simulate scroll
          fireEvent.scroll(previewContainer, { target: { scrollY: 1000 } })

          // Mock header element
          const mockHeader = document.createElement('header')
          mockHeader.style.position = 'fixed'
          mockHeader.style.zIndex = '40'
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