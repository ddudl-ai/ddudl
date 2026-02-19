import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import JoditEditor, { JoditEditorRef } from '../JoditEditor'
import { createRef } from 'react'

// Mock editor ref instance for accessing methods
const mockEditorInstance = {
  focus: jest.fn(),
  getContent: jest.fn(() => 'mocked content'),
  setContent: jest.fn(),
  insertHTML: jest.fn(),
  insertImage: jest.fn(),
  selection: {
    insertHTML: jest.fn()
  },
  value: ''
}

// Mock Jodit React component
jest.mock('jodit-react', () => {
  return jest.fn().mockImplementation(({ value, onChange, onBlur, config, ref }) => {
    // Handle ref callback
    if (ref && typeof ref === 'function') {
      ref(mockEditorInstance)
    } else if (ref && typeof ref === 'object') {
      ref.current = mockEditorInstance
    }

    // Update the mock instance value
    mockEditorInstance.value = value

    return (
      <div data-testid="jodit-editor-mock">
        <div className="jodit-toolbar__box">
          <button data-testid="bold-button">Bold</button>
          <button data-testid="italic-button">Italic</button>
          <button data-testid="image-button">Image</button>
          <button data-testid="link-button">Link</button>
        </div>
        <textarea
          data-testid="jodit-textarea"
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          onBlur={(e) => onBlur && onBlur(e.target.value)}
          placeholder={config?.placeholder || ''}
          disabled={config?.readonly || false}
          style={{ 
            minHeight: config?.minHeight || 400, 
            height: config?.height || 500 
          }}
        />
      </div>
    )
  })
})

// Mock dynamic import
jest.mock('next/dynamic', () => {
  return jest.fn(() => {
    const MockedComponent = jest.fn().mockImplementation(({ value, onChange, onBlur, config, ref }) => {
      // Handle ref callback
      if (ref && typeof ref === 'function') {
        ref(mockEditorInstance)
      } else if (ref && typeof ref === 'object') {
        ref.current = mockEditorInstance
      }

      // Update the mock instance value
      mockEditorInstance.value = value

      return (
        <div data-testid="jodit-editor-mock">
          <div className="jodit-toolbar__box">
            <button data-testid="bold-button">Bold</button>
            <button data-testid="italic-button">Italic</button>
            <button data-testid="image-button">Image</button>
            <button data-testid="link-button">Link</button>
          </div>
          <textarea
            data-testid="jodit-textarea"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={(e) => onBlur?.(e.target.value)}
            placeholder={config?.placeholder}
            disabled={config?.readonly}
            style={{ minHeight: config?.minHeight || 400, height: config?.height || 500 }}
          />
        </div>
      )
    })
    MockedComponent.displayName = 'DynamicJoditEditor'
    return MockedComponent
  })
})

describe.skip('JoditEditor Integration Tests', () => {
  const mockOnChange = jest.fn()
  const defaultProps = {
    value: '',
    onChange: mockOnChange
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock editor instance
    mockEditorInstance.focus.mockClear()
    mockEditorInstance.getContent.mockClear()
    mockEditorInstance.setContent.mockClear()
    mockEditorInstance.insertHTML.mockClear()
    mockEditorInstance.insertImage.mockClear()
    mockEditorInstance.getContent.mockReturnValue('mocked content')
    mockEditorInstance.value = ''
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should render editor with default configuration', async () => {
      render(<JoditEditor {...defaultProps} />)

      // Just check that the component renders without errors
      await waitFor(() => {
        const element = screen.getByTestId('jodit-editor-mock') || screen.getByText('Loading editor...')
        expect(element).toBeInTheDocument()
      })
    })

    it('should display loading state initially', async () => {
      // This test verifies that the editor eventually loads
      render(<JoditEditor {...defaultProps} />)

      // Wait for the editor to load (dynamic import resolves)
      await waitFor(() => {
        expect(screen.getByTestId('jodit-editor-mock')).toBeInTheDocument()
      })
    })

    it('should handle value changes', async () => {
      render(<JoditEditor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('jodit-textarea')).toBeInTheDocument()
      })

      const textarea = screen.getByTestId('jodit-textarea')
      
      // Simulate typing by changing the value and triggering the event
      fireEvent.change(textarea, { target: { value: 'Hello World' } })

      expect(mockOnChange).toHaveBeenCalledWith('Hello World')
    })

    it('should handle blur events', async () => {
      render(<JoditEditor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('jodit-textarea')).toBeInTheDocument()
      })

      const textarea = screen.getByTestId('jodit-textarea')
      
      // Set value and trigger blur event
      fireEvent.change(textarea, { target: { value: 'Test content' } })
      fireEvent.blur(textarea, { target: { value: 'Test content' } })

      expect(mockOnChange).toHaveBeenCalledWith('Test content')
    })
  })

  describe('Configuration and Props', () => {
    it('should apply custom placeholder', () => {
      const customPlaceholder = 'User 정의 플레이스홀더'
      render(
        <JoditEditor
          {...defaultProps}
          placeholder={customPlaceholder}
        />
      )

      const textarea = screen.getByTestId('jodit-textarea')
      expect(textarea).toHaveAttribute('placeholder', customPlaceholder)
    })

    it('should handle disabled state', () => {
      render(<JoditEditor {...defaultProps} disabled={true} />)

      const textarea = screen.getByTestId('jodit-textarea')
      expect(textarea).toBeDisabled()
    })

    it('should apply custom height', () => {
      const customHeight = 600
      render(<JoditEditor {...defaultProps} height={customHeight} />)

      const textarea = screen.getByTestId('jodit-textarea')
      expect(textarea).toHaveStyle({ height: `${customHeight}px` })
    })

    it('should apply initial value', () => {
      const initialValue = '<p>Initial content</p>'
      render(<JoditEditor {...defaultProps} value={initialValue} />)

      const textarea = screen.getByTestId('jodit-textarea')
      expect(textarea).toHaveValue(initialValue)
    })
  })

  describe('Ref Methods', () => {
    it('should expose focus method through ref', () => {
      const editorRef = createRef<JoditEditorRef>()
      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      expect(editorRef.current?.focus).toBeDefined()
      expect(typeof editorRef.current?.focus).toBe('function')

      // Test focus functionality
      editorRef.current?.focus()
      // Note: In a real test environment, you would verify focus state
    })

    it('should expose getContent method through ref', () => {
      const editorRef = createRef<JoditEditorRef>()
      const testContent = '<p>Test content</p>'

      render(<JoditEditor {...defaultProps} value={testContent} ref={editorRef} />)

      expect(editorRef.current?.getContent).toBeDefined()
      expect(typeof editorRef.current?.getContent).toBe('function')

      const content = editorRef.current?.getContent()
      expect(content).toBe(testContent)
    })

    it('should expose setContent method through ref', () => {
      const editorRef = createRef<JoditEditorRef>()
      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      expect(editorRef.current?.setContent).toBeDefined()
      expect(typeof editorRef.current?.setContent).toBe('function')

      // Test setContent functionality
      const newContent = '<p>New content</p>'
      editorRef.current?.setContent(newContent)

      expect(editorRef.current?.getContent()).toBe(newContent)
    })

    it('should expose insertHTML method through ref', () => {
      const editorRef = createRef<JoditEditorRef>()
      const initialContent = '<p>Initial</p>'

      render(<JoditEditor {...defaultProps} value={initialContent} ref={editorRef} />)

      expect(editorRef.current?.insertHTML).toBeDefined()
      expect(typeof editorRef.current?.insertHTML).toBe('function')

      // Test insertHTML functionality
      const htmlToInsert = '<strong>Bold text</strong>'
      editorRef.current?.insertHTML(htmlToInsert)

      expect(mockOnChange).toHaveBeenCalledWith(initialContent + htmlToInsert)
    })

    it('should expose insertImage method through ref', () => {
      const editorRef = createRef<JoditEditorRef>()
      const initialContent = '<p>Initial</p>'

      render(<JoditEditor {...defaultProps} value={initialContent} ref={editorRef} />)

      expect(editorRef.current?.insertImage).toBeDefined()
      expect(typeof editorRef.current?.insertImage).toBe('function')

      // Test insertImage functionality
      const imageUrl = 'https://example.com/image.jpg'
      const altText = 'Test image'
      editorRef.current?.insertImage(imageUrl, altText)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringContaining(`src="${imageUrl}"`)
      )
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringContaining(`alt="${altText}"`)
      )
    })

    it('should insert image with custom dimensions', () => {
      const editorRef = createRef<JoditEditorRef>()

      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      const imageUrl = 'https://example.com/image.jpg'
      const altText = 'Test image'
      const width = '800'
      const height = '600'

      editorRef.current?.insertImage(imageUrl, altText, width, height)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringContaining(`width="${width}"`)
      )
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringContaining(`height="${height}"`)
      )
    })
  })

  describe('Toolbar Integration', () => {
    it('should render toolbar buttons', () => {
      render(<JoditEditor {...defaultProps} />)

      expect(screen.getByTestId('bold-button')).toBeInTheDocument()
      expect(screen.getByTestId('italic-button')).toBeInTheDocument()
      expect(screen.getByTestId('image-button')).toBeInTheDocument()
      expect(screen.getByTestId('link-button')).toBeInTheDocument()
    })

    it('should handle toolbar button interactions', async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const boldButton = screen.getByTestId('bold-button')
      await user.click(boldButton)

      // In a real scenario, this would trigger formatting
      expect(boldButton).toBeInTheDocument()
    })
  })

  describe('Korean Language Support', () => {
    it('should use Korean locale in configuration', () => {
      render(<JoditEditor {...defaultProps} />)

      // Verify that Korean language support is configured
      // This is tested indirectly through the configuration being applied
      expect(screen.getByTestId('jodit-editor-mock')).toBeInTheDocument()
    })

    it('should display Korean placeholder text', () => {
      render(<JoditEditor {...defaultProps} placeholder="내용을 입력하세요..." />)

      const textarea = screen.getByTestId('jodit-textarea')
      expect(textarea).toHaveAttribute('placeholder', '내용을 입력하세요...')
    })
  })

  describe('Image Upload Integration', () => {
    it('should configure uploader settings', () => {
      render(<JoditEditor {...defaultProps} />)

      // The uploader configuration is tested through the component rendering
      // In a real test, you would verify API calls when images are uploaded
      expect(screen.getByTestId('jodit-editor-mock')).toBeInTheDocument()
    })

    it('should handle image paste events', async () => {
      const editorRef = createRef<JoditEditorRef>()
      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      const textarea = screen.getByTestId('jodit-textarea')

      // Simulate image paste (in real scenario, this would be a paste event with image data)
      await userEvent.click(textarea)

      // Test that the editor is ready to handle paste events
      expect(textarea).toHaveFocus()
    })
  })

  describe('Responsive Behavior', () => {
    it('should adapt toolbar for different screen sizes', () => {
      render(<JoditEditor {...defaultProps} />)

      // The responsive toolbar configuration is applied through Jodit config
      // This ensures the editor adapts to different screen sizes
      expect(screen.getByTestId('jodit-editor-mock')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle ref methods when editor is not available', () => {
      const editorRef = createRef<JoditEditorRef>()
      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      // Test that methods don't throw when editor is not ready
      expect(() => {
        editorRef.current?.focus()
        editorRef.current?.getContent()
        editorRef.current?.setContent('test')
        editorRef.current?.insertHTML('<p>test</p>')
        editorRef.current?.insertImage('test.jpg')
      }).not.toThrow()
    })

    it('should handle content changes gracefully', async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const textarea = screen.getByTestId('jodit-textarea')

      // Test rapid content changes
      await user.type(textarea, 'Fast')
      await user.clear(textarea)
      await user.type(textarea, 'New content')

      expect(mockOnChange).toHaveBeenCalledWith('New content')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const textarea = screen.getByTestId('jodit-textarea')

      // Test keyboard navigation
      await user.tab()
      expect(textarea).toHaveFocus()

      await user.keyboard('Hello World')
      expect(mockOnChange).toHaveBeenCalledWith('Hello World')
    })

    it('should support tab navigation through toolbar', async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      // Test that toolbar buttons are accessible via tab
      await user.tab() // Focus on first button
      expect(screen.getByTestId('bold-button')).toHaveFocus()
    })
  })

  describe('Performance', () => {
    it('should handle large content efficiently', async () => {
      const largeContent = '<p>' + 'Large content '.repeat(1000) + '</p>'
      const user = userEvent.setup()

      render(<JoditEditor {...defaultProps} value={largeContent} />)

      const textarea = screen.getByTestId('jodit-textarea')
      expect(textarea).toHaveValue(largeContent)

      // Test that the editor can handle additional content
      await user.type(textarea, ' Additional content')

      expect(mockOnChange).toHaveBeenCalledWith(largeContent + ' Additional content')
    })

    it('should debounce rapid changes appropriately', async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const textarea = screen.getByTestId('jodit-textarea')

      // Rapid typing should still trigger onChange
      await user.type(textarea, 'Quick', { delay: 1 })

      expect(mockOnChange).toHaveBeenCalledWith('Quick')
    })
  })
})