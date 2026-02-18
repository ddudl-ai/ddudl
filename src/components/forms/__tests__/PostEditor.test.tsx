// T015: Unit test for PostEditor module - TDD Phase
// This test MUST FAIL before implementation

import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor, act } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import { PostEditor } from &apos;../PostEditor&apos;
import type { LinkPreviewData } from &apos;../../../types/forms&apos;

// Mock hooks
jest.mock(&apos;../../../hooks/useLinkPreview&apos;, () => ({
  useLinkPreview: jest.fn()
}))

jest.mock(&apos;../../../hooks/useFormValidation&apos;, () => ({
  useFormValidation: jest.fn()
}))

const mockUseLinkPreview = require(&apos;../../../hooks/useLinkPreview&apos;).useLinkPreview
const mockUseFormValidation = require(&apos;../../../hooks/useFormValidation&apos;).useFormValidation

describe(&apos;PostEditor&apos;, () => {
  const defaultLinkPreviewReturn = {
    preview: null,
    loading: false,
    error: null,
    url: &apos;',
    detectUrls: jest.fn(),
    generatePreview: jest.fn(),
    clearPreview: jest.fn(),
    updatePreview: jest.fn(),
    abort: jest.fn(),
    onTextChange: jest.fn()
  }

  const defaultValidationReturn = {
    validationState: {
      isValid: true,
      errors: [],
      warnings: [],
      touched: new Set()
    },
    validateField: jest.fn(),
    getFieldError: jest.fn(),
    isFieldValid: jest.fn()
  }

  beforeEach(() => {
    mockUseLinkPreview.mockReturnValue(defaultLinkPreviewReturn)
    mockUseFormValidation.mockReturnValue(defaultValidationReturn)
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe(&apos;Rendering&apos;, () => {
    it(&apos;should render title and content inputs&apos;, () => {
      render(<PostEditor />)

      expect(screen.getByLabelText(/제목/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/내용/i)).toBeInTheDocument()
    })

    it(&apos;should render with initial values&apos;, () => {
      const initialData = {
        title: &apos;초기 제목&apos;,
        content: &apos;초기 내용&apos;
      }

      render(<PostEditor initialData={initialData} />)

      expect(screen.getByDisplayValue(&apos;초기 제목&apos;)).toBeInTheDocument()
      expect(screen.getByDisplayValue(&apos;초기 내용&apos;)).toBeInTheDocument()
    })

    it(&apos;should show character count for title&apos;, () => {
      render(<PostEditor />)

      const titleInput = screen.getByLabelText(/제목/i)
      fireEvent.change(titleInput, { target: { value: &apos;Test Title&apos; } })

      expect(screen.getByText(&apos;10/300&apos;)).toBeInTheDocument()
    })

    it(&apos;should show character count for content&apos;, () => {
      render(<PostEditor />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      fireEvent.change(contentTextarea, { target: { value: &apos;Test content&apos; } })

      expect(screen.getByText(&apos;12자&apos;)).toBeInTheDocument()
    })

    it(&apos;should render toolbar when enabled&apos;, () => {
      render(<PostEditor showToolbar />)

      expect(screen.getByRole(&apos;toolbar&apos;)).toBeInTheDocument()
      expect(screen.getByRole(&apos;button&apos;, { name: /굵게/i })).toBeInTheDocument()
      expect(screen.getByRole(&apos;button&apos;, { name: /기울임/i })).toBeInTheDocument()
      expect(screen.getByRole(&apos;button&apos;, { name: /링크/i })).toBeInTheDocument()
    })
  })

  describe(&apos;Text Input Handling&apos;, () => {
    it(&apos;should handle title input changes&apos;, async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()

      render(<PostEditor onChange={onChange} />)

      const titleInput = screen.getByLabelText(/제목/i)
      await user.type(titleInput, &apos;New Title&apos;)

      expect(onChange).toHaveBeenCalledWith({
        title: &apos;New Title&apos;,
        content: &apos;'
      })
    })

    it(&apos;should handle content textarea changes&apos;, async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()

      render(<PostEditor onChange={onChange} />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      await user.type(contentTextarea, &apos;New content&apos;)

      expect(onChange).toHaveBeenCalledWith({
        title: &apos;',
        content: &apos;New content&apos;
      })
    })

    it(&apos;should auto-resize textarea based on content&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor autoResize />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      const initialHeight = contentTextarea.style.height

      await user.type(contentTextarea, &apos;\n\n\n\nLots of new lines&apos;)

      expect(contentTextarea.style.height).not.toBe(initialHeight)
    })

    it(&apos;should handle tab key for indentation&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor enableTabIndent />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      await user.keyboard(&apos;{Tab}&apos;)

      expect(contentTextarea).toHaveValue(&apos;    &apos;)
    })

    it(&apos;should prevent tab key from leaving field when disabled&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor enableTabIndent={false} />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      await user.keyboard(&apos;{Tab}&apos;)

      expect(contentTextarea).not.toHaveFocus()
    })
  })

  describe(&apos;Link Preview Integration&apos;, () => {
    it(&apos;should detect URLs in content and trigger preview&apos;, async () => {
      const mockDetectUrls = jest.fn().mockReturnValue([&apos;https://example.com&apos;])
      const mockOnTextChange = jest.fn()

      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        detectUrls: mockDetectUrls,
        onTextChange: mockOnTextChange
      })

      const user = userEvent.setup()

      render(<PostEditor enableLinkPreview />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      await user.type(contentTextarea, &apos;Check this: https://example.com&apos;)

      expect(mockOnTextChange).toHaveBeenCalledWith(&apos;Check this: https://example.com&apos;)
    })

    it(&apos;should display link preview when available&apos;, () => {
      const mockPreview: LinkPreviewData = {
        url: &apos;https://example.com&apos;,
        title: &apos;Example Site&apos;,
        description: &apos;An example website&apos;,
        image: &apos;https://example.com/image.jpg&apos;,
        siteName: &apos;Example&apos;
      }

      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        preview: mockPreview
      })

      render(<PostEditor enableLinkPreview />)

      expect(screen.getByText(&apos;Example Site&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;An example website&apos;)).toBeInTheDocument()
      expect(screen.getByAltText(&apos;Link preview&apos;)).toBeInTheDocument()
    })

    it(&apos;should show loading state for link preview&apos;, () => {
      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        loading: true
      })

      render(<PostEditor enableLinkPreview />)

      expect(screen.getByText(/링크 미리보기 로딩 중.../i)).toBeInTheDocument()
    })

    it(&apos;should allow dismissing link preview&apos;, async () => {
      const user = userEvent.setup()
      const mockClearPreview = jest.fn()

      const mockPreview: LinkPreviewData = {
        url: &apos;https://example.com&apos;,
        title: &apos;Example Site&apos;
      }

      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        preview: mockPreview,
        clearPreview: mockClearPreview
      })

      render(<PostEditor enableLinkPreview />)

      const dismissButton = screen.getByRole(&apos;button&apos;, { name: /미리보기 닫기/i })
      await user.click(dismissButton)

      expect(mockClearPreview).toHaveBeenCalled()
    })

    it(&apos;should show link preview error&apos;, () => {
      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        error: &apos;Failed to load preview&apos;
      })

      render(<PostEditor enableLinkPreview />)

      expect(screen.getByText(/링크 미리보기를 불러올 수 없습니다/i)).toBeInTheDocument()
    })
  })

  describe(&apos;Formatting Toolbar&apos;, () => {
    it(&apos;should apply bold formatting&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, &apos;Some text&apos;)

      // Select text
      contentTextarea.setSelectionRange(0, 4)

      const boldButton = screen.getByRole(&apos;button&apos;, { name: /굵게/i })
      await user.click(boldButton)

      expect(contentTextarea.value).toBe(&apos;**Some** text&apos;)
    })

    it(&apos;should apply italic formatting&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, &apos;Some text&apos;)

      contentTextarea.setSelectionRange(0, 4)

      const italicButton = screen.getByRole(&apos;button&apos;, { name: /기울임/i })
      await user.click(italicButton)

      expect(contentTextarea.value).toBe(&apos;*Some* text&apos;)
    })

    it(&apos;should create link formatting&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, &apos;Click here&apos;)

      contentTextarea.setSelectionRange(0, 10)

      const linkButton = screen.getByRole(&apos;button&apos;, { name: /링크/i })
      await user.click(linkButton)

      expect(contentTextarea.value).toBe(&apos;[Click here]()&apos;)
    })

    it(&apos;should insert list formatting&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      contentTextarea.focus()

      const listButton = screen.getByRole(&apos;button&apos;, { name: /목록/i })
      await user.click(listButton)

      expect(contentTextarea.value).toBe(&apos;- &apos;)
    })

    it(&apos;should insert code block&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      contentTextarea.focus()

      const codeButton = screen.getByRole(&apos;button&apos;, { name: /코드/i })
      await user.click(codeButton)

      expect(contentTextarea.value).toBe(&apos;```\n\n```&apos;)
    })

    it(&apos;should toggle toolbar visibility&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar collapsibleToolbar />)

      expect(screen.getByRole(&apos;toolbar&apos;)).toBeVisible()

      const toggleButton = screen.getByRole(&apos;button&apos;, { name: /도구모음 접기/i })
      await user.click(toggleButton)

      expect(screen.getByRole(&apos;toolbar&apos;)).not.toBeVisible()
    })
  })

  describe(&apos;Validation Integration&apos;, () => {
    it(&apos;should show title validation error&apos;, () => {
      mockUseFormValidation.mockReturnValue({
        ...defaultValidationReturn,
        validationState: {
          isValid: false,
          errors: [{ field: &apos;title&apos;, message: &apos;제목은 필수입니다&apos;, code: &apos;REQUIRED&apos; }],
          warnings: [],
          touched: new Set([&apos;title&apos;])
        },
        getFieldError: jest.fn().mockReturnValue(&apos;제목은 필수입니다&apos;),
        isFieldValid: jest.fn().mockReturnValue(false)
      })

      render(<PostEditor />)

      expect(screen.getByText(&apos;제목은 필수입니다&apos;)).toBeInTheDocument()
      expect(screen.getByLabelText(/제목/i)).toHaveClass(&apos;error&apos;)
    })

    it(&apos;should show content validation warning&apos;, () => {
      mockUseFormValidation.mockReturnValue({
        ...defaultValidationReturn,
        validationState: {
          isValid: true,
          errors: [],
          warnings: [{ field: &apos;content&apos;, message: &apos;내용이 너무 짧습니다&apos; }],
          touched: new Set([&apos;content&apos;])
        }
      })

      render(<PostEditor />)

      expect(screen.getByText(&apos;내용이 너무 짧습니다&apos;)).toBeInTheDocument()
    })

    it(&apos;should validate on blur&apos;, async () => {
      const user = userEvent.setup()
      const mockValidateField = jest.fn()

      mockUseFormValidation.mockReturnValue({
        ...defaultValidationReturn,
        validateField: mockValidateField
      })

      render(<PostEditor validateOnBlur />)

      const titleInput = screen.getByLabelText(/제목/i)
      await user.click(titleInput)
      await user.tab()

      expect(mockValidateField).toHaveBeenCalledWith(&apos;title&apos;, &apos;')
    })

    it(&apos;should validate on change when enabled&apos;, async () => {
      const user = userEvent.setup()
      const mockValidateField = jest.fn()

      mockUseFormValidation.mockReturnValue({
        ...defaultValidationReturn,
        validateField: mockValidateField
      })

      render(<PostEditor validateOnChange />)

      const titleInput = screen.getByLabelText(/제목/i)
      await user.type(titleInput, &apos;T&apos;)

      expect(mockValidateField).toHaveBeenCalledWith(&apos;title&apos;, &apos;T&apos;)
    })
  })

  describe(&apos;Keyboard Shortcuts&apos;, () => {
    it(&apos;should support Ctrl+B for bold&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar enableKeyboardShortcuts />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, &apos;text&apos;)
      contentTextarea.setSelectionRange(0, 4)

      await user.keyboard(&apos;{Control>}b{/Control}&apos;)

      expect(contentTextarea.value).toBe(&apos;**text**&apos;)
    })

    it(&apos;should support Ctrl+I for italic&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar enableKeyboardShortcuts />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, &apos;text&apos;)
      contentTextarea.setSelectionRange(0, 4)

      await user.keyboard(&apos;{Control>}i{/Control}&apos;)

      expect(contentTextarea.value).toBe(&apos;*text*&apos;)
    })

    it(&apos;should support Ctrl+K for link&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar enableKeyboardShortcuts />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, &apos;link&apos;)
      contentTextarea.setSelectionRange(0, 4)

      await user.keyboard(&apos;{Control>}k{/Control}&apos;)

      expect(contentTextarea.value).toBe(&apos;[link]()&apos;)
    })

    it(&apos;should support Ctrl+S for save&apos;, async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()

      render(<PostEditor onSave={onSave} enableKeyboardShortcuts />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      await user.keyboard(&apos;{Control>}s{/Control}&apos;)

      expect(onSave).toHaveBeenCalled()
    })
  })

  describe(&apos;Draft Auto-Save&apos;, () => {
    it(&apos;should auto-save draft periodically&apos;, async () => {
      jest.useFakeTimers()
      const onDraftSave = jest.fn()

      const user = userEvent.setup({ delay: null })

      render(<PostEditor onDraftSave={onDraftSave} autoSaveInterval={5000} />)

      const titleInput = screen.getByLabelText(/제목/i)
      await user.type(titleInput, &apos;Draft title&apos;)

      act(() => {
        jest.advanceTimersByTime(5000)
      })

      expect(onDraftSave).toHaveBeenCalledWith({
        title: &apos;Draft title&apos;,
        content: &apos;'
      })

      jest.useRealTimers()
    })

    it(&apos;should show draft save status&apos;, async () => {
      jest.useFakeTimers()

      const user = userEvent.setup({ delay: null })

      render(<PostEditor showDraftStatus autoSaveInterval={3000} />)

      const titleInput = screen.getByLabelText(/제목/i)
      await user.type(titleInput, &apos;Draft&apos;)

      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(screen.getByText(/임시저장됨/i)).toBeInTheDocument()

      jest.useRealTimers()
    })

    it(&apos;should restore from draft&apos;, () => {
      const draftData = {
        title: &apos;임시저장된 제목&apos;,
        content: &apos;임시저장된 내용&apos;
      }

      render(<PostEditor draftData={draftData} />)

      expect(screen.getByDisplayValue(&apos;임시저장된 제목&apos;)).toBeInTheDocument()
      expect(screen.getByDisplayValue(&apos;임시저장된 내용&apos;)).toBeInTheDocument()
      expect(screen.getByText(/임시저장에서 복원됨/i)).toBeInTheDocument()
    })
  })

  describe(&apos;Paste Handling&apos;, () => {
    it(&apos;should handle plain text paste&apos;, async () => {
      const user = userEvent.setup()

      render(<PostEditor />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      const pasteData = &apos;Pasted content&apos;
      await user.paste(pasteData)

      expect(contentTextarea).toHaveValue(&apos;Pasted content&apos;)
    })

    it(&apos;should convert HTML paste to markdown&apos;, async () => {
      render(<PostEditor convertPastedHtml />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      const htmlContent = &apos;<strong>Bold</strong> and <em>italic</em> text&apos;
      const pasteEvent = new ClipboardEvent(&apos;paste&apos;, {
        clipboardData: new DataTransfer()
      })

      pasteEvent.clipboardData?.setData(&apos;text/html&apos;, htmlContent)

      fireEvent(contentTextarea, pasteEvent)

      await waitFor(() => {
        expect(contentTextarea).toHaveValue(&apos;**Bold** and *italic* text&apos;)
      })
    })

    it(&apos;should handle image paste&apos;, async () => {
      const onImagePaste = jest.fn()

      render(<PostEditor onImagePaste={onImagePaste} />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      const file = new File([&apos;image&apos;], &apos;image.png&apos;, { type: &apos;image/png&apos; })
      const pasteEvent = new ClipboardEvent(&apos;paste&apos;, {
        clipboardData: new DataTransfer()
      })

      pasteEvent.clipboardData?.items.add(file)

      fireEvent(contentTextarea, pasteEvent)

      expect(onImagePaste).toHaveBeenCalledWith(file)
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    it(&apos;should have proper ARIA labels&apos;, () => {
      render(<PostEditor />)

      expect(screen.getByLabelText(/제목/i)).toHaveAttribute(&apos;aria-required&apos;, &apos;true&apos;)
      expect(screen.getByLabelText(/내용/i)).toHaveAttribute(&apos;aria-describedby&apos;)
    })

    it(&apos;should announce validation errors to screen readers&apos;, () => {
      mockUseFormValidation.mockReturnValue({
        ...defaultValidationReturn,
        validationState: {
          isValid: false,
          errors: [{ field: &apos;title&apos;, message: &apos;제목은 필수입니다&apos;, code: &apos;REQUIRED&apos; }],
          warnings: [],
          touched: new Set([&apos;title&apos;])
        },
        getFieldError: jest.fn().mockReturnValue(&apos;제목은 필수입니다&apos;)
      })

      render(<PostEditor />)

      const errorMessage = screen.getByText(&apos;제목은 필수입니다&apos;)
      expect(errorMessage).toHaveAttribute(&apos;role&apos;, &apos;alert&apos;)
    })

    it(&apos;should support screen reader navigation of toolbar&apos;, () => {
      render(<PostEditor showToolbar />)

      const toolbar = screen.getByRole(&apos;toolbar&apos;)
      expect(toolbar).toHaveAttribute(&apos;aria-label&apos;, &apos;편집 도구&apos;)

      const buttons = screen.getAllByRole(&apos;button&apos;)
      buttons.forEach(button => {
        expect(button).toHaveAttribute(&apos;aria-label&apos;)
      })
    })
  })

  describe(&apos;Performance&apos;, () => {
    it(&apos;should debounce onChange events&apos;, async () => {
      jest.useFakeTimers()
      const onChange = jest.fn()

      const user = userEvent.setup({ delay: null })

      render(<PostEditor onChange={onChange} debounceMs={300} />)

      const titleInput = screen.getByLabelText(/제목/i)

      await user.type(titleInput, &apos;abc&apos;)

      expect(onChange).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onChange).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })

    it(&apos;should memoize expensive operations&apos;, () => {
      const { rerender } = render(<PostEditor />)

      // Same props should not trigger re-computation
      rerender(<PostEditor />)

      // This is a conceptual test - actual implementation would use React.memo
      // and useMemo/useCallback appropriately
    })
  })
})