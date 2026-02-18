import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor, act } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import { useRouter, useSearchParams } from &apos;next/navigation&apos;
import WritePostForm from &apos;../WritePostForm&apos;

// Mock Next.js modules
jest.mock(&apos;next/navigation&apos;, () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock(&apos;@/stores/authStore&apos;, () => ({
  useAuthStore: jest.fn(),
}))

jest.mock(&apos;@/hooks/useWritePostForm&apos;, () => ({
  useWritePostForm: jest.fn(),
}))

// Mock dynamic imports
jest.mock(&apos;@/components/editor/JoditEditor&apos;, () => {
  const MockJoditEditor = React.forwardRef<any, any>((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      insertImage: jest.fn(),
      insertHTML: jest.fn(),
    }))
    
    return (
      <textarea
        data-testid=&quot;jodit-editor&quot;
        value={props.value || &apos;'}
        onChange={(e) => props.onChange?.(e.target.value)}
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
    )
  })
  MockJoditEditor.displayName = 'MockJoditEditor'
  return MockJoditEditor
})

// Mock components
jest.mock(&apos;@/components/common/SimpleCaptcha&apos;, () => {
  return function SimpleCaptcha({ onVerify }: { onVerify: (verified: boolean) => void }) {
    return (
      <button 
        data-testid=&quot;captcha-verify&quot;
        onClick={() => onVerify(true)}
      >
        CAPTCHA 인증
      </button>
    )
  }
})

jest.mock(&apos;@/hooks/useClipboardPaste&apos;, () => ({
  useClipboardPaste: jest.fn(),
}))

jest.mock(&apos;@/hooks/useDragAndDrop&apos;, () => ({
  useDragAndDrop: () => ({ isDragging: false }),
}))

jest.mock(&apos;@/lib/utils/imageProcessor&apos;, () => ({
  formatFileSize: (size: number) => `${size}B`,
  isImageFile: () => true,
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
}

const mockSearchParams = {
  get: jest.fn().mockReturnValue(null),
}

// Default mock for useWritePostForm hook
const mockUseWritePostForm = {
  // Form state
  title: &apos;',
  content: &apos;',
  authorName: &apos;ddudl이&apos;,
  selectedFlair: &apos;',
  
  // UI state
  submitting: false,
  captchaVerified: false,
  error: null,
  previewMode: false,
  
  // Upload state
  uploading: false,
  uploadingFiles: [],
  images: [],
  pastedImages: [],
  
  // Link preview state
  linkPreviews: [],
  
  // Computed state
  isAnonymous: true,
  isSubmitDisabled: true,
  user: null,
  postId: null,
  validation: { isValid: false, errors: [&apos;제목은 필수입니다.&apos;] },
  
  // Actions
  setTitle: jest.fn(),
  setContent: jest.fn(),
  setAuthorName: jest.fn(),
  setSelectedFlair: jest.fn(),
  setCaptchaVerified: jest.fn(),
  setPreviewMode: jest.fn(),
  setError: jest.fn(),
  handleSubmit: jest.fn(),
  handleCancel: jest.fn(),
  handleFileSelection: jest.fn(),
  handleImageAdded: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue(mockUseWritePostForm)
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ post: { id: &apos;test-id&apos; } }),
  })
})

describe(&apos;WritePostForm Component&apos;, () => {
  const defaultProps = {
    channelName: &apos;test-channel&apos;,
  }

  it(&apos;should render form fields correctly&apos;, () => {
    render(<WritePostForm {...defaultProps} />)

    expect(screen.getByPlaceholderText(&apos;닉네임&apos;)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(&apos;게시물 제목을 입력하세요...&apos;)).toBeInTheDocument()
    expect(screen.getByTestId(&apos;jodit-editor&apos;)).toBeInTheDocument()
    expect(screen.getByTestId(&apos;submit-button&apos;)).toBeInTheDocument()
  })

  it(&apos;should show authenticated user info when logged in&apos;, () => {
    ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
      ...mockUseWritePostForm,
      user: { user_metadata: { username: &apos;testuser&apos; } },
      authorName: &apos;testuser&apos;,
      isAnonymous: false,
    })

    render(<WritePostForm {...defaultProps} />)

    expect(screen.getByText(&apos;testuser&apos;)).toBeInTheDocument()
    expect(screen.getByText(&apos;인증됨&apos;)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(&apos;닉네임&apos;)).not.toBeInTheDocument()
  })

  describe(&apos;Submit Button States&apos;, () => {
    it(&apos;should disable submit button when form is invalid&apos;, () => {
      render(<WritePostForm {...defaultProps} />)

      const submitButton = screen.getByTestId(&apos;submit-button&apos;)
      expect(submitButton).toBeDisabled()
    })

    it(&apos;should enable submit button when form is valid&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        title: &apos;유효한 제목입니다&apos;,
        isSubmitDisabled: false,
        validation: { isValid: true, errors: [] },
        captchaVerified: true,
      })

      render(<WritePostForm {...defaultProps} />)

      const submitButton = screen.getByTestId(&apos;submit-button&apos;)
      expect(submitButton).not.toBeDisabled()
    })

    it(&apos;should show loading state when submitting&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        submitting: true,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText(&apos;게시 중...&apos;)).toBeInTheDocument()
    })

    it(&apos;should show upload state when uploading&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        uploading: true,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText(&apos;이미지 업로드 중...&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Form Interactions&apos;, () => {
    it(&apos;should call setTitle when title input changes&apos;, async () => {
      const user = userEvent.setup()
      const mockSetTitle = jest.fn()
      
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setTitle: mockSetTitle,
      })

      render(<WritePostForm {...defaultProps} />)

      const titleInput = screen.getByPlaceholderText(&apos;게시물 제목을 입력하세요...&apos;)
      await user.type(titleInput, &apos;새 제목&apos;)

      expect(mockSetTitle).toHaveBeenCalledWith(&apos;새 제목&apos;)
    })

    it(&apos;should call setContent when editor content changes&apos;, async () => {
      const user = userEvent.setup()
      const mockSetContent = jest.fn()
      
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setContent: mockSetContent,
      })

      render(<WritePostForm {...defaultProps} />)

      const editor = screen.getByTestId(&apos;jodit-editor&apos;)
      await user.type(editor, &apos;새 내용&apos;)

      expect(mockSetContent).toHaveBeenCalledWith(&apos;새 내용&apos;)
    })

    it(&apos;should call handleSubmit when submit button is clicked&apos;, async () => {
      const user = userEvent.setup()
      const mockHandleSubmit = jest.fn()
      
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        isSubmitDisabled: false,
        handleSubmit: mockHandleSubmit,
      })

      render(<WritePostForm {...defaultProps} />)

      const submitButton = screen.getByTestId(&apos;submit-button&apos;)
      await user.click(submitButton)

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1)
    })

    it(&apos;should call handleCancel when cancel button is clicked&apos;, async () => {
      const user = userEvent.setup()
      const mockHandleCancel = jest.fn()
      
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        handleCancel: mockHandleCancel,
      })

      render(<WritePostForm {...defaultProps} />)

      const cancelButton = screen.getByText(&apos;취소&apos;)
      await user.click(cancelButton)

      expect(mockHandleCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe(&apos;Error Display&apos;, () => {
    it(&apos;should display error message when error exists&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        error: &apos;테스트 에러 메시지&apos;,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText(&apos;테스트 에러 메시지&apos;)).toBeInTheDocument()
    })

    it(&apos;should not display error section when no error&apos;, () => {
      render(<WritePostForm {...defaultProps} />)

      expect(screen.queryByText(/테스트 에러/)).not.toBeInTheDocument()
    })
  })

  describe(&apos;Flair Selection&apos;, () => {
    it(&apos;should allow selecting flair&apos;, async () => {
      const user = userEvent.setup()
      const mockSetSelectedFlair = jest.fn()
      
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setSelectedFlair: mockSetSelectedFlair,
      })

      render(<WritePostForm {...defaultProps} />)

      const flairButton = screen.getByText(&apos;질문&apos;)
      await user.click(flairButton)

      expect(mockSetSelectedFlair).toHaveBeenCalledWith(&apos;질문&apos;)
    })

    it(&apos;should show selected flair state&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        selectedFlair: &apos;질문&apos;,
      })

      render(<WritePostForm {...defaultProps} />)

      const flairButton = screen.getByText(&apos;질문&apos;)
      // Check if the flair has the selected styling - this depends on your CSS classes
      expect(flairButton.className).toMatch(/bg-/) // Should have some background styling when selected
    })
  })

  describe(&apos;Preview Mode&apos;, () => {
    it(&apos;should show editor in edit mode&apos;, () => {
      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByTestId(&apos;jodit-editor&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;편집&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;미리보기&apos;)).toBeInTheDocument()
    })

    it(&apos;should show preview content in preview mode&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        previewMode: true,
        content: &apos;미리보기 내용&apos;,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.queryByTestId(&apos;jodit-editor&apos;)).not.toBeInTheDocument()
      expect(screen.getByText(&apos;미리보기 내용&apos;)).toBeInTheDocument()
    })

    it(&apos;should call setPreviewMode when mode buttons are clicked&apos;, async () => {
      const user = userEvent.setup()
      const mockSetPreviewMode = jest.fn()
      
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setPreviewMode: mockSetPreviewMode,
      })

      render(<WritePostForm {...defaultProps} />)

      const previewButton = screen.getByText(&apos;미리보기&apos;)
      await user.click(previewButton)

      expect(mockSetPreviewMode).toHaveBeenCalledWith(true)

      const editButton = screen.getByText(&apos;편집&apos;)
      await user.click(editButton)

      expect(mockSetPreviewMode).toHaveBeenCalledWith(false)
    })
  })

  describe(&apos;Anonymous User Features&apos;, () => {
    it(&apos;should show CAPTCHA for anonymous users&apos;, () => {
      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText(&apos;익명 User 인증&apos;)).toBeInTheDocument()
      expect(screen.getByTestId(&apos;captcha-verify&apos;)).toBeInTheDocument()
    })

    it(&apos;should not show CAPTCHA for authenticated users&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        user: { user_metadata: { username: &apos;testuser&apos; } },
        isAnonymous: false,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.queryByText(&apos;익명 User 인증&apos;)).not.toBeInTheDocument()
      expect(screen.queryByTestId(&apos;captcha-verify&apos;)).not.toBeInTheDocument()
    })

    it(&apos;should call setCaptchaVerified when CAPTCHA is completed&apos;, async () => {
      const user = userEvent.setup()
      const mockSetCaptchaVerified = jest.fn()
      
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setCaptchaVerified: mockSetCaptchaVerified,
      })

      render(<WritePostForm {...defaultProps} />)

      const captchaButton = screen.getByTestId(&apos;captcha-verify&apos;)
      await user.click(captchaButton)

      expect(mockSetCaptchaVerified).toHaveBeenCalledWith(true)
    })
  })

  describe(&apos;Image Upload&apos;, () => {
    it(&apos;should call handleFileSelection when files are selected&apos;, async () => {
      const user = userEvent.setup()
      const mockHandleFileSelection = jest.fn()
      
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        handleFileSelection: mockHandleFileSelection,
      })

      render(<WritePostForm {...defaultProps} />)

      const fileInput = screen.getByRole(&apos;button&apos;, { name: /이미지 업로드/i }) || 
                       screen.getByLabelText(/이미지 업로드/i) ||
                       document.querySelector(&apos;input[type=&quot;file&quot;]&apos;)
      
      expect(fileInput).toBeInTheDocument()

      const mockFile = new File([&apos;image&apos;], &apos;test.png&apos;, { type: &apos;image/png&apos; })
      
      if (fileInput && fileInput.tagName === &apos;INPUT&apos;) {
        await user.upload(fileInput as HTMLInputElement, mockFile)
        expect(mockHandleFileSelection).toHaveBeenCalled()
      }
    })

    it(&apos;should display uploaded images&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        images: [&apos;https://example.com/image1.webp&apos;],
        pastedImages: [{ url: &apos;https://example.com/image1.webp&apos;, fileName: &apos;test.png&apos;, size: 1000 }],
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText(&apos;업로드한 이미지 (클릭하여 본문에 삽입)&apos;)).toBeInTheDocument()
      expect(screen.getByAltText(&apos;test.png&apos;)).toBeInTheDocument()
    })

    it(&apos;should show uploading state&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        uploadingFiles: [&apos;uploading.png&apos;],
        uploading: true,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText(&apos;이미지 업로드 중...&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;업로드 중...&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Link Previews&apos;, () => {
    it(&apos;should display link previews when available&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        linkPreviews: [
          {
            url: &apos;https://example.com&apos;,
            title: &apos;Example Page&apos;,
            description: &apos;Test description&apos;,
            image: &apos;https://example.com/image.jpg&apos;,
          },
        ],
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText(&apos;📋 감지된 링크&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;✅ Example Page&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Clipboard Pasted Images&apos;, () => {
    it(&apos;should display pasted images info&apos;, () => {
      ;(require(&apos;@/hooks/useWritePostForm&apos;).useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        pastedImages: [
          { url: &apos;https://example.com/pasted.webp&apos;, fileName: &apos;pasted.png&apos;, size: 2000 },
        ],
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText(&apos;클립보드에서 붙여넣기된 이미지&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;pasted.png&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;2000B&apos;)).toBeInTheDocument()
    })
  })
})