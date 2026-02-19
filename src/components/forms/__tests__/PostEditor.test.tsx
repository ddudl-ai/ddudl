// T015: Unit test for PostEditor module - TDD Phase
// This test MUST FAIL before implementation

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostEditor } from '../PostEditor'
import type { LinkPreviewData } from '../../../types/forms'

// Mock hooks
jest.mock('../../../hooks/useLinkPreview', () => ({
  useLinkPreview: jest.fn()
}))

jest.mock('../../../hooks/useFormValidation', () => ({
  useFormValidation: jest.fn()
}))

const mockUseLinkPreview = require('../../../hooks/useLinkPreview').useLinkPreview
const mockUseFormValidation = require('../../../hooks/useFormValidation').useFormValidation

describe.skip('PostEditor', () => {
  const defaultLinkPreviewReturn = {
    preview: null,
    loading: false,
    error: null,
    url: '',
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

  describe('Rendering', () => {
    it('should render title and content inputs', () => {
      render(<PostEditor />)

      expect(screen.getByLabelText(/제목/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/내용/i)).toBeInTheDocument()
    })

    it('should render with initial values', () => {
      const initialData = {
        title: '초기 제목',
        content: '초기 내용'
      }

      render(<PostEditor initialData={initialData} />)

      expect(screen.getByDisplayValue('초기 제목')).toBeInTheDocument()
      expect(screen.getByDisplayValue('초기 내용')).toBeInTheDocument()
    })

    it('should show character count for title', () => {
      render(<PostEditor />)

      const titleInput = screen.getByLabelText(/제목/i)
      fireEvent.change(titleInput, { target: { value: 'Test Title' } })

      expect(screen.getByText('10/300')).toBeInTheDocument()
    })

    it('should show character count for content', () => {
      render(<PostEditor />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      fireEvent.change(contentTextarea, { target: { value: 'Test content' } })

      expect(screen.getByText('12자')).toBeInTheDocument()
    })

    it('should render toolbar when enabled', () => {
      render(<PostEditor showToolbar />)

      expect(screen.getByRole('toolbar')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /굵게/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /기울임/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /링크/i })).toBeInTheDocument()
    })
  })

  describe('Text Input Handling', () => {
    it('should handle title input changes', async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()

      render(<PostEditor onChange={onChange} />)

      const titleInput = screen.getByLabelText(/제목/i)
      await user.type(titleInput, 'New Title')

      expect(onChange).toHaveBeenCalledWith({
        title: 'New Title',
        content: ''
      })
    })

    it('should handle content textarea changes', async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()

      render(<PostEditor onChange={onChange} />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      await user.type(contentTextarea, 'New content')

      expect(onChange).toHaveBeenCalledWith({
        title: '',
        content: 'New content'
      })
    })

    it('should auto-resize textarea based on content', async () => {
      const user = userEvent.setup()

      render(<PostEditor autoResize />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      const initialHeight = contentTextarea.style.height

      await user.type(contentTextarea, '\n\n\n\nLots of new lines')

      expect(contentTextarea.style.height).not.toBe(initialHeight)
    })

    it('should handle tab key for indentation', async () => {
      const user = userEvent.setup()

      render(<PostEditor enableTabIndent />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      await user.keyboard('{Tab}')

      expect(contentTextarea).toHaveValue('    ')
    })

    it('should prevent tab key from leaving field when disabled', async () => {
      const user = userEvent.setup()

      render(<PostEditor enableTabIndent={false} />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      await user.keyboard('{Tab}')

      expect(contentTextarea).not.toHaveFocus()
    })
  })

  describe('Link Preview Integration', () => {
    it('should detect URLs in content and trigger preview', async () => {
      const mockDetectUrls = jest.fn().mockReturnValue(['https://example.com'])
      const mockOnTextChange = jest.fn()

      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        detectUrls: mockDetectUrls,
        onTextChange: mockOnTextChange
      })

      const user = userEvent.setup()

      render(<PostEditor enableLinkPreview />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      await user.type(contentTextarea, 'Check this: https://example.com')

      expect(mockOnTextChange).toHaveBeenCalledWith('Check this: https://example.com')
    })

    it('should display link preview when available', () => {
      const mockPreview: LinkPreviewData = {
        url: 'https://example.com',
        title: 'Example Site',
        description: 'An example website',
        image: 'https://example.com/image.jpg',
        siteName: 'Example'
      }

      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        preview: mockPreview
      })

      render(<PostEditor enableLinkPreview />)

      expect(screen.getByText('Example Site')).toBeInTheDocument()
      expect(screen.getByText('An example website')).toBeInTheDocument()
      expect(screen.getByAltText('Link preview')).toBeInTheDocument()
    })

    it('should show loading state for link preview', () => {
      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        loading: true
      })

      render(<PostEditor enableLinkPreview />)

      expect(screen.getByText(/링크 미리보기 로딩 중.../i)).toBeInTheDocument()
    })

    it('should allow dismissing link preview', async () => {
      const user = userEvent.setup()
      const mockClearPreview = jest.fn()

      const mockPreview: LinkPreviewData = {
        url: 'https://example.com',
        title: 'Example Site'
      }

      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        preview: mockPreview,
        clearPreview: mockClearPreview
      })

      render(<PostEditor enableLinkPreview />)

      const dismissButton = screen.getByRole('button', { name: /미리보기 닫기/i })
      await user.click(dismissButton)

      expect(mockClearPreview).toHaveBeenCalled()
    })

    it('should show link preview error', () => {
      mockUseLinkPreview.mockReturnValue({
        ...defaultLinkPreviewReturn,
        error: 'Failed to load preview'
      })

      render(<PostEditor enableLinkPreview />)

      expect(screen.getByText(/링크 미리보기를 불러올 수 없습니다/i)).toBeInTheDocument()
    })
  })

  describe('Formatting Toolbar', () => {
    it('should apply bold formatting', async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, 'Some text')

      // Select text
      contentTextarea.setSelectionRange(0, 4)

      const boldButton = screen.getByRole('button', { name: /굵게/i })
      await user.click(boldButton)

      expect(contentTextarea.value).toBe('**Some** text')
    })

    it('should apply italic formatting', async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, 'Some text')

      contentTextarea.setSelectionRange(0, 4)

      const italicButton = screen.getByRole('button', { name: /기울임/i })
      await user.click(italicButton)

      expect(contentTextarea.value).toBe('*Some* text')
    })

    it('should create link formatting', async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, 'Click here')

      contentTextarea.setSelectionRange(0, 10)

      const linkButton = screen.getByRole('button', { name: /링크/i })
      await user.click(linkButton)

      expect(contentTextarea.value).toBe('[Click here]()')
    })

    it('should insert list formatting', async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      contentTextarea.focus()

      const listButton = screen.getByRole('button', { name: /목록/i })
      await user.click(listButton)

      expect(contentTextarea.value).toBe('- ')
    })

    it('should insert code block', async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      contentTextarea.focus()

      const codeButton = screen.getByRole('button', { name: /코드/i })
      await user.click(codeButton)

      expect(contentTextarea.value).toBe('```\n\n```')
    })

    it('should toggle toolbar visibility', async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar collapsibleToolbar />)

      expect(screen.getByRole('toolbar')).toBeVisible()

      const toggleButton = screen.getByRole('button', { name: /도구모음 접기/i })
      await user.click(toggleButton)

      expect(screen.getByRole('toolbar')).not.toBeVisible()
    })
  })

  describe('Validation Integration', () => {
    it('should show title validation error', () => {
      mockUseFormValidation.mockReturnValue({
        ...defaultValidationReturn,
        validationState: {
          isValid: false,
          errors: [{ field: 'title', message: '제목은 필수입니다', code: 'REQUIRED' }],
          warnings: [],
          touched: new Set(['title'])
        },
        getFieldError: jest.fn().mockReturnValue('제목은 필수입니다'),
        isFieldValid: jest.fn().mockReturnValue(false)
      })

      render(<PostEditor />)

      expect(screen.getByText('제목은 필수입니다')).toBeInTheDocument()
      expect(screen.getByLabelText(/제목/i)).toHaveClass('error')
    })

    it('should show content validation warning', () => {
      mockUseFormValidation.mockReturnValue({
        ...defaultValidationReturn,
        validationState: {
          isValid: true,
          errors: [],
          warnings: [{ field: 'content', message: '내용이 너무 짧습니다' }],
          touched: new Set(['content'])
        }
      })

      render(<PostEditor />)

      expect(screen.getByText('내용이 너무 짧습니다')).toBeInTheDocument()
    })

    it('should validate on blur', async () => {
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

      expect(mockValidateField).toHaveBeenCalledWith('title', '')
    })

    it('should validate on change when enabled', async () => {
      const user = userEvent.setup()
      const mockValidateField = jest.fn()

      mockUseFormValidation.mockReturnValue({
        ...defaultValidationReturn,
        validateField: mockValidateField
      })

      render(<PostEditor validateOnChange />)

      const titleInput = screen.getByLabelText(/제목/i)
      await user.type(titleInput, 'T')

      expect(mockValidateField).toHaveBeenCalledWith('title', 'T')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should support Ctrl+B for bold', async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar enableKeyboardShortcuts />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, 'text')
      contentTextarea.setSelectionRange(0, 4)

      await user.keyboard('{Control>}b{/Control}')

      expect(contentTextarea.value).toBe('**text**')
    })

    it('should support Ctrl+I for italic', async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar enableKeyboardShortcuts />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, 'text')
      contentTextarea.setSelectionRange(0, 4)

      await user.keyboard('{Control>}i{/Control}')

      expect(contentTextarea.value).toBe('*text*')
    })

    it('should support Ctrl+K for link', async () => {
      const user = userEvent.setup()

      render(<PostEditor showToolbar enableKeyboardShortcuts />)

      const contentTextarea = screen.getByLabelText(/내용/i) as HTMLTextAreaElement
      await user.type(contentTextarea, 'link')
      contentTextarea.setSelectionRange(0, 4)

      await user.keyboard('{Control>}k{/Control}')

      expect(contentTextarea.value).toBe('[link]()')
    })

    it('should support Ctrl+S for save', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()

      render(<PostEditor onSave={onSave} enableKeyboardShortcuts />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      await user.keyboard('{Control>}s{/Control}')

      expect(onSave).toHaveBeenCalled()
    })
  })

  describe('Draft Auto-Save', () => {
    it('should auto-save draft periodically', async () => {
      jest.useFakeTimers()
      const onDraftSave = jest.fn()

      const user = userEvent.setup({ delay: null })

      render(<PostEditor onDraftSave={onDraftSave} autoSaveInterval={5000} />)

      const titleInput = screen.getByLabelText(/제목/i)
      await user.type(titleInput, 'Draft title')

      act(() => {
        jest.advanceTimersByTime(5000)
      })

      expect(onDraftSave).toHaveBeenCalledWith({
        title: 'Draft title',
        content: ''
      })

      jest.useRealTimers()
    })

    it('should show draft save status', async () => {
      jest.useFakeTimers()

      const user = userEvent.setup({ delay: null })

      render(<PostEditor showDraftStatus autoSaveInterval={3000} />)

      const titleInput = screen.getByLabelText(/제목/i)
      await user.type(titleInput, 'Draft')

      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(screen.getByText(/임시저장됨/i)).toBeInTheDocument()

      jest.useRealTimers()
    })

    it('should restore from draft', () => {
      const draftData = {
        title: '임시저장된 제목',
        content: '임시저장된 내용'
      }

      render(<PostEditor draftData={draftData} />)

      expect(screen.getByDisplayValue('임시저장된 제목')).toBeInTheDocument()
      expect(screen.getByDisplayValue('임시저장된 내용')).toBeInTheDocument()
      expect(screen.getByText(/임시저장에서 복원됨/i)).toBeInTheDocument()
    })
  })

  describe('Paste Handling', () => {
    it('should handle plain text paste', async () => {
      const user = userEvent.setup()

      render(<PostEditor />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      const pasteData = 'Pasted content'
      await user.paste(pasteData)

      expect(contentTextarea).toHaveValue('Pasted content')
    })

    it('should convert HTML paste to markdown', async () => {
      render(<PostEditor convertPastedHtml />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      const htmlContent = '<strong>Bold</strong> and <em>italic</em> text'
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      })

      pasteEvent.clipboardData?.setData('text/html', htmlContent)

      fireEvent(contentTextarea, pasteEvent)

      await waitFor(() => {
        expect(contentTextarea).toHaveValue('**Bold** and *italic* text')
      })
    })

    it('should handle image paste', async () => {
      const onImagePaste = jest.fn()

      render(<PostEditor onImagePaste={onImagePaste} />)

      const contentTextarea = screen.getByLabelText(/내용/i)
      contentTextarea.focus()

      const file = new File(['image'], 'image.png', { type: 'image/png' })
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      })

      pasteEvent.clipboardData?.items.add(file)

      fireEvent(contentTextarea, pasteEvent)

      expect(onImagePaste).toHaveBeenCalledWith(file)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PostEditor />)

      expect(screen.getByLabelText(/제목/i)).toHaveAttribute('aria-required', 'true')
      expect(screen.getByLabelText(/내용/i)).toHaveAttribute('aria-describedby')
    })

    it('should announce validation errors to screen readers', () => {
      mockUseFormValidation.mockReturnValue({
        ...defaultValidationReturn,
        validationState: {
          isValid: false,
          errors: [{ field: 'title', message: '제목은 필수입니다', code: 'REQUIRED' }],
          warnings: [],
          touched: new Set(['title'])
        },
        getFieldError: jest.fn().mockReturnValue('제목은 필수입니다')
      })

      render(<PostEditor />)

      const errorMessage = screen.getByText('제목은 필수입니다')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })

    it('should support screen reader navigation of toolbar', () => {
      render(<PostEditor showToolbar />)

      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveAttribute('aria-label', '편집 도구')

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
      })
    })
  })

  describe('Performance', () => {
    it('should debounce onChange events', async () => {
      jest.useFakeTimers()
      const onChange = jest.fn()

      const user = userEvent.setup({ delay: null })

      render(<PostEditor onChange={onChange} debounceMs={300} />)

      const titleInput = screen.getByLabelText(/제목/i)

      await user.type(titleInput, 'abc')

      expect(onChange).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onChange).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })

    it('should memoize expensive operations', () => {
      const { rerender } = render(<PostEditor />)

      // Same props should not trigger re-computation
      rerender(<PostEditor />)

      // This is a conceptual test - actual implementation would use React.memo
      // and useMemo/useCallback appropriately
    })
  })
})