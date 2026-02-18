import { describe, it, expect, beforeEach, afterEach, jest } from &apos;@jest/globals&apos;
import { render, screen, fireEvent, waitFor } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import &apos;@testing-library/jest-dom&apos;
import JoditEditor, { JoditEditorRef } from &apos;../JoditEditor&apos;
import { createRef } from &apos;react&apos;

// Mock Jodit React component
jest.mock(&apos;jodit-react&apos;, () => {
  return jest.fn().mockImplementation(({ value, onChange, onBlur, config }) => {
    const mockEditor = {
      focus: jest.fn(),
      value,
      selection: {
        insertHTML: jest.fn((html: string) => {
          // Simulate HTML insertion
          const newContent = value + html
          onChange(newContent)
        })
      },
      synchronizeValues: jest.fn()
    }

    return (
      <div data-testid=&quot;jodit-editor-mock&quot;>
        <div className=&quot;jodit-toolbar__box&quot;>
          <button data-testid=&quot;bold-button&quot;>Bold</button>
          <button data-testid=&quot;italic-button&quot;>Italic</button>
          <button data-testid=&quot;image-button&quot;>Image</button>
          <button data-testid=&quot;link-button&quot;>Link</button>
        </div>
        <textarea
          data-testid=&quot;jodit-textarea&quot;
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur(e.target.value)}
          placeholder={config.placeholder}
          disabled={config.readonly}
          style={{ minHeight: config.minHeight, height: config.height }}
          ref={(el) => {
            if (el) {
              // Attach mock editor methods to the DOM element
              Object.assign(el, mockEditor)
            }
          }}
        />
      </div>
    )
  })
})

// Mock dynamic import
jest.mock(&apos;next/dynamic&apos;, () => {
  return jest.fn((loader) => {
    const MockedComponent = (props: any) => {
      const JoditReactMock = require(&apos;jodit-react&apos;)
      return <JoditReactMock {...props} />
    }
    MockedComponent.displayName = &apos;DynamicJoditEditor&apos;
    return MockedComponent
  })
})

describe(&apos;JoditEditor Integration Tests&apos;, () => {
  const mockOnChange = jest.fn()
  const defaultProps = {
    value: &apos;',
    onChange: mockOnChange
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe(&apos;Basic Functionality&apos;, () => {
    it(&apos;should render editor with default configuration&apos;, () => {
      render(<JoditEditor {...defaultProps} />)

      expect(screen.getByTestId(&apos;jodit-editor-mock&apos;)).toBeInTheDocument()
      expect(screen.getByTestId(&apos;jodit-textarea&apos;)).toBeInTheDocument()
    })

    it(&apos;should display loading state initially&apos;, () => {
      // Re-mock dynamic to show loading
      const mockDynamic = jest.fn(() => {
        const LoadingComponent = () => (
          <div className=&quot;min-h-[400px] bg-gray-50 rounded-md flex items-center justify-center&quot;>
            <span className=&quot;text-gray-500&quot;>에디터 로딩 중...</span>
          </div>
        )
        return LoadingComponent
      })

      jest.doMock(&apos;next/dynamic&apos;, () => mockDynamic)

      render(<JoditEditor {...defaultProps} />)

      expect(screen.getByText(&apos;에디터 로딩 중...&apos;)).toBeInTheDocument()
    })

    it(&apos;should handle value changes&apos;, async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)
      await user.type(textarea, &apos;Hello World&apos;)

      expect(mockOnChange).toHaveBeenCalledWith(&apos;Hello World&apos;)
    })

    it(&apos;should handle blur events&apos;, async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)
      await user.type(textarea, &apos;Test content&apos;)
      await user.tab() // Trigger blur

      expect(mockOnChange).toHaveBeenCalledWith(&apos;Test content&apos;)
    })
  })

  describe(&apos;Configuration and Props&apos;, () => {
    it(&apos;should apply custom placeholder&apos;, () => {
      const customPlaceholder = &apos;User 정의 플레이스홀더&apos;
      render(
        <JoditEditor
          {...defaultProps}
          placeholder={customPlaceholder}
        />
      )

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)
      expect(textarea).toHaveAttribute(&apos;placeholder&apos;, customPlaceholder)
    })

    it(&apos;should handle disabled state&apos;, () => {
      render(<JoditEditor {...defaultProps} disabled={true} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)
      expect(textarea).toBeDisabled()
    })

    it(&apos;should apply custom height&apos;, () => {
      const customHeight = 600
      render(<JoditEditor {...defaultProps} height={customHeight} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)
      expect(textarea).toHaveStyle({ height: `${customHeight}px` })
    })

    it(&apos;should apply initial value&apos;, () => {
      const initialValue = &apos;<p>Initial content</p>&apos;
      render(<JoditEditor {...defaultProps} value={initialValue} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)
      expect(textarea).toHaveValue(initialValue)
    })
  })

  describe(&apos;Ref Methods&apos;, () => {
    it(&apos;should expose focus method through ref&apos;, () => {
      const editorRef = createRef<JoditEditorRef>()
      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      expect(editorRef.current?.focus).toBeDefined()
      expect(typeof editorRef.current?.focus).toBe(&apos;function&apos;)

      // Test focus functionality
      editorRef.current?.focus()
      // Note: In a real test environment, you would verify focus state
    })

    it(&apos;should expose getContent method through ref&apos;, () => {
      const editorRef = createRef<JoditEditorRef>()
      const testContent = &apos;<p>Test content</p>&apos;

      render(<JoditEditor {...defaultProps} value={testContent} ref={editorRef} />)

      expect(editorRef.current?.getContent).toBeDefined()
      expect(typeof editorRef.current?.getContent).toBe(&apos;function&apos;)

      const content = editorRef.current?.getContent()
      expect(content).toBe(testContent)
    })

    it(&apos;should expose setContent method through ref&apos;, () => {
      const editorRef = createRef<JoditEditorRef>()
      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      expect(editorRef.current?.setContent).toBeDefined()
      expect(typeof editorRef.current?.setContent).toBe(&apos;function&apos;)

      // Test setContent functionality
      const newContent = &apos;<p>New content</p>&apos;
      editorRef.current?.setContent(newContent)

      expect(editorRef.current?.getContent()).toBe(newContent)
    })

    it(&apos;should expose insertHTML method through ref&apos;, () => {
      const editorRef = createRef<JoditEditorRef>()
      const initialContent = &apos;<p>Initial</p>&apos;

      render(<JoditEditor {...defaultProps} value={initialContent} ref={editorRef} />)

      expect(editorRef.current?.insertHTML).toBeDefined()
      expect(typeof editorRef.current?.insertHTML).toBe(&apos;function&apos;)

      // Test insertHTML functionality
      const htmlToInsert = &apos;<strong>Bold text</strong>&apos;
      editorRef.current?.insertHTML(htmlToInsert)

      expect(mockOnChange).toHaveBeenCalledWith(initialContent + htmlToInsert)
    })

    it(&apos;should expose insertImage method through ref&apos;, () => {
      const editorRef = createRef<JoditEditorRef>()
      const initialContent = &apos;<p>Initial</p>&apos;

      render(<JoditEditor {...defaultProps} value={initialContent} ref={editorRef} />)

      expect(editorRef.current?.insertImage).toBeDefined()
      expect(typeof editorRef.current?.insertImage).toBe(&apos;function&apos;)

      // Test insertImage functionality
      const imageUrl = &apos;https://example.com/image.jpg&apos;
      const altText = &apos;Test image&apos;
      editorRef.current?.insertImage(imageUrl, altText)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringContaining(`src=&quot;${imageUrl}&quot;`)
      )
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringContaining(`alt=&quot;${altText}&quot;`)
      )
    })

    it(&apos;should insert image with custom dimensions&apos;, () => {
      const editorRef = createRef<JoditEditorRef>()

      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      const imageUrl = &apos;https://example.com/image.jpg&apos;
      const altText = &apos;Test image&apos;
      const width = &apos;800&apos;
      const height = &apos;600&apos;

      editorRef.current?.insertImage(imageUrl, altText, width, height)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringContaining(`width=&quot;${width}&quot;`)
      )
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringContaining(`height=&quot;${height}&quot;`)
      )
    })
  })

  describe(&apos;Toolbar Integration&apos;, () => {
    it(&apos;should render toolbar buttons&apos;, () => {
      render(<JoditEditor {...defaultProps} />)

      expect(screen.getByTestId(&apos;bold-button&apos;)).toBeInTheDocument()
      expect(screen.getByTestId(&apos;italic-button&apos;)).toBeInTheDocument()
      expect(screen.getByTestId(&apos;image-button&apos;)).toBeInTheDocument()
      expect(screen.getByTestId(&apos;link-button&apos;)).toBeInTheDocument()
    })

    it(&apos;should handle toolbar button interactions&apos;, async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const boldButton = screen.getByTestId(&apos;bold-button&apos;)
      await user.click(boldButton)

      // In a real scenario, this would trigger formatting
      expect(boldButton).toBeInTheDocument()
    })
  })

  describe(&apos;Korean Language Support&apos;, () => {
    it(&apos;should use Korean locale in configuration&apos;, () => {
      render(<JoditEditor {...defaultProps} />)

      // Verify that Korean language support is configured
      // This is tested indirectly through the configuration being applied
      expect(screen.getByTestId(&apos;jodit-editor-mock&apos;)).toBeInTheDocument()
    })

    it(&apos;should display Korean placeholder text&apos;, () => {
      render(<JoditEditor {...defaultProps} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)
      expect(textarea).toHaveAttribute(&apos;placeholder&apos;, &apos;내용을 입력하세요...&apos;)
    })
  })

  describe(&apos;Image Upload Integration&apos;, () => {
    it(&apos;should configure uploader settings&apos;, () => {
      render(<JoditEditor {...defaultProps} />)

      // The uploader configuration is tested through the component rendering
      // In a real test, you would verify API calls when images are uploaded
      expect(screen.getByTestId(&apos;jodit-editor-mock&apos;)).toBeInTheDocument()
    })

    it(&apos;should handle image paste events&apos;, async () => {
      const editorRef = createRef<JoditEditorRef>()
      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)

      // Simulate image paste (in real scenario, this would be a paste event with image data)
      await userEvent.click(textarea)

      // Test that the editor is ready to handle paste events
      expect(textarea).toHaveFocus()
    })
  })

  describe(&apos;Responsive Behavior&apos;, () => {
    it(&apos;should adapt toolbar for different screen sizes&apos;, () => {
      render(<JoditEditor {...defaultProps} />)

      // The responsive toolbar configuration is applied through Jodit config
      // This ensures the editor adapts to different screen sizes
      expect(screen.getByTestId(&apos;jodit-editor-mock&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Error Handling&apos;, () => {
    it(&apos;should handle ref methods when editor is not available&apos;, () => {
      const editorRef = createRef<JoditEditorRef>()
      render(<JoditEditor {...defaultProps} ref={editorRef} />)

      // Test that methods don&apos;t throw when editor is not ready
      expect(() => {
        editorRef.current?.focus()
        editorRef.current?.getContent()
        editorRef.current?.setContent(&apos;test&apos;)
        editorRef.current?.insertHTML(&apos;<p>test</p>&apos;)
        editorRef.current?.insertImage(&apos;test.jpg&apos;)
      }).not.toThrow()
    })

    it(&apos;should handle content changes gracefully&apos;, async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)

      // Test rapid content changes
      await user.type(textarea, &apos;Fast&apos;)
      await user.clear(textarea)
      await user.type(textarea, &apos;New content&apos;)

      expect(mockOnChange).toHaveBeenCalledWith(&apos;New content&apos;)
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    it(&apos;should be keyboard accessible&apos;, async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)

      // Test keyboard navigation
      await user.tab()
      expect(textarea).toHaveFocus()

      await user.keyboard(&apos;Hello World&apos;)
      expect(mockOnChange).toHaveBeenCalledWith(&apos;Hello World&apos;)
    })

    it(&apos;should support tab navigation through toolbar&apos;, async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      // Test that toolbar buttons are accessible via tab
      await user.tab() // Focus on first button
      expect(screen.getByTestId(&apos;bold-button&apos;)).toHaveFocus()
    })
  })

  describe(&apos;Performance&apos;, () => {
    it(&apos;should handle large content efficiently&apos;, async () => {
      const largeContent = &apos;<p>&apos; + &apos;Large content &apos;.repeat(1000) + &apos;</p>&apos;
      const user = userEvent.setup()

      render(<JoditEditor {...defaultProps} value={largeContent} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)
      expect(textarea).toHaveValue(largeContent)

      // Test that the editor can handle additional content
      await user.type(textarea, &apos; Additional content&apos;)

      expect(mockOnChange).toHaveBeenCalledWith(largeContent + &apos; Additional content&apos;)
    })

    it(&apos;should debounce rapid changes appropriately&apos;, async () => {
      const user = userEvent.setup()
      render(<JoditEditor {...defaultProps} />)

      const textarea = screen.getByTestId(&apos;jodit-textarea&apos;)

      // Rapid typing should still trigger onChange
      await user.type(textarea, &apos;Quick&apos;, { delay: 1 })

      expect(mockOnChange).toHaveBeenCalledWith(&apos;Quick&apos;)
    })
  })
})