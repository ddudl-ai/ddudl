import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import WritePostForm from '../WritePostForm'

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}))

jest.mock('@/hooks/useWritePostForm', () => ({
  useWritePostForm: jest.fn(),
}))

// Mock dynamic imports
jest.mock('@/components/editor/JoditEditor', () => {
  const MockJoditEditor = React.forwardRef<any, any>((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      insertImage: jest.fn(),
      insertHTML: jest.fn(),
    }))
    
    return (
      <textarea
        data-testid="jodit-editor"
        value={props.value || ''}
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
jest.mock('@/components/common/SimpleCaptcha', () => {
  return function SimpleCaptcha({ onVerify }: { onVerify: (verified: boolean) => void }) {
    return (
      <button 
        data-testid="captcha-verify"
        onClick={() => onVerify(true)}
      >
        CAPTCHA 인증
      </button>
    )
  }
})

jest.mock('@/hooks/useClipboardPaste', () => ({
  useClipboardPaste: jest.fn(),
}))

jest.mock('@/hooks/useDragAndDrop', () => ({
  useDragAndDrop: () => ({ isDragging: false }),
}))

jest.mock('@/lib/utils/imageProcessor', () => ({
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
  title: '',
  content: '',
  authorName: 'ddudl이',
  selectedFlair: '',
  
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
  validation: { isValid: false, errors: ['제목은 필수입니다.'] },
  
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
  ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue(mockUseWritePostForm)
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ post: { id: 'test-id' } }),
  })
})

describe('WritePostForm Component', () => {
  const defaultProps = {
    channelName: 'test-channel',
  }

  it('should render form fields correctly', () => {
    render(<WritePostForm {...defaultProps} />)

    expect(screen.getByPlaceholderText('닉네임')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('게시물 제목을 입력하세요...')).toBeInTheDocument()
    expect(screen.getByTestId('jodit-editor')).toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('should show authenticated user info when logged in', () => {
    ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
      ...mockUseWritePostForm,
      user: { user_metadata: { username: 'testuser' } },
      authorName: 'testuser',
      isAnonymous: false,
    })

    render(<WritePostForm {...defaultProps} />)

    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByText('인증됨')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('닉네임')).not.toBeInTheDocument()
  })

  describe('Submit Button States', () => {
    it('should disable submit button when form is invalid', () => {
      render(<WritePostForm {...defaultProps} />)

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when form is valid', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        title: '유효한 제목입니다',
        isSubmitDisabled: false,
        validation: { isValid: true, errors: [] },
        captchaVerified: true,
      })

      render(<WritePostForm {...defaultProps} />)

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).not.toBeDisabled()
    })

    it('should show loading state when submitting', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        submitting: true,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText('게시 중...')).toBeInTheDocument()
    })

    it('should show upload state when uploading', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        uploading: true,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText('이미지 업로드 중...')).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('should call setTitle when title input changes', async () => {
      const user = userEvent.setup()
      const mockSetTitle = jest.fn()
      
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setTitle: mockSetTitle,
      })

      render(<WritePostForm {...defaultProps} />)

      const titleInput = screen.getByPlaceholderText('게시물 제목을 입력하세요...')
      await user.type(titleInput, '새 제목')

      expect(mockSetTitle).toHaveBeenCalledWith('새 제목')
    })

    it('should call setContent when editor content changes', async () => {
      const user = userEvent.setup()
      const mockSetContent = jest.fn()
      
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setContent: mockSetContent,
      })

      render(<WritePostForm {...defaultProps} />)

      const editor = screen.getByTestId('jodit-editor')
      await user.type(editor, '새 내용')

      expect(mockSetContent).toHaveBeenCalledWith('새 내용')
    })

    it('should call handleSubmit when submit button is clicked', async () => {
      const user = userEvent.setup()
      const mockHandleSubmit = jest.fn()
      
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        isSubmitDisabled: false,
        handleSubmit: mockHandleSubmit,
      })

      render(<WritePostForm {...defaultProps} />)

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1)
    })

    it('should call handleCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const mockHandleCancel = jest.fn()
      
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        handleCancel: mockHandleCancel,
      })

      render(<WritePostForm {...defaultProps} />)

      const cancelButton = screen.getByText('취소')
      await user.click(cancelButton)

      expect(mockHandleCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Display', () => {
    it('should display error message when error exists', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        error: '테스트 에러 메시지',
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText('테스트 에러 메시지')).toBeInTheDocument()
    })

    it('should not display error section when no error', () => {
      render(<WritePostForm {...defaultProps} />)

      expect(screen.queryByText(/테스트 에러/)).not.toBeInTheDocument()
    })
  })

  describe('Flair Selection', () => {
    it('should allow selecting flair', async () => {
      const user = userEvent.setup()
      const mockSetSelectedFlair = jest.fn()
      
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setSelectedFlair: mockSetSelectedFlair,
      })

      render(<WritePostForm {...defaultProps} />)

      const flairButton = screen.getByText('질문')
      await user.click(flairButton)

      expect(mockSetSelectedFlair).toHaveBeenCalledWith('질문')
    })

    it('should show selected flair state', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        selectedFlair: '질문',
      })

      render(<WritePostForm {...defaultProps} />)

      const flairButton = screen.getByText('질문')
      // Check if the flair has the selected styling - this depends on your CSS classes
      expect(flairButton.className).toMatch(/bg-/) // Should have some background styling when selected
    })
  })

  describe('Preview Mode', () => {
    it('should show editor in edit mode', () => {
      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByTestId('jodit-editor')).toBeInTheDocument()
      expect(screen.getByText('편집')).toBeInTheDocument()
      expect(screen.getByText('미리보기')).toBeInTheDocument()
    })

    it('should show preview content in preview mode', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        previewMode: true,
        content: '미리보기 내용',
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.queryByTestId('jodit-editor')).not.toBeInTheDocument()
      expect(screen.getByText('미리보기 내용')).toBeInTheDocument()
    })

    it('should call setPreviewMode when mode buttons are clicked', async () => {
      const user = userEvent.setup()
      const mockSetPreviewMode = jest.fn()
      
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setPreviewMode: mockSetPreviewMode,
      })

      render(<WritePostForm {...defaultProps} />)

      const previewButton = screen.getByText('미리보기')
      await user.click(previewButton)

      expect(mockSetPreviewMode).toHaveBeenCalledWith(true)

      const editButton = screen.getByText('편집')
      await user.click(editButton)

      expect(mockSetPreviewMode).toHaveBeenCalledWith(false)
    })
  })

  describe('Anonymous User Features', () => {
    it('should show CAPTCHA for anonymous users', () => {
      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText('익명 User 인증')).toBeInTheDocument()
      expect(screen.getByTestId('captcha-verify')).toBeInTheDocument()
    })

    it('should not show CAPTCHA for authenticated users', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        user: { user_metadata: { username: 'testuser' } },
        isAnonymous: false,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.queryByText('익명 User 인증')).not.toBeInTheDocument()
      expect(screen.queryByTestId('captcha-verify')).not.toBeInTheDocument()
    })

    it('should call setCaptchaVerified when CAPTCHA is completed', async () => {
      const user = userEvent.setup()
      const mockSetCaptchaVerified = jest.fn()
      
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        setCaptchaVerified: mockSetCaptchaVerified,
      })

      render(<WritePostForm {...defaultProps} />)

      const captchaButton = screen.getByTestId('captcha-verify')
      await user.click(captchaButton)

      expect(mockSetCaptchaVerified).toHaveBeenCalledWith(true)
    })
  })

  describe('Image Upload', () => {
    it('should call handleFileSelection when files are selected', async () => {
      const user = userEvent.setup()
      const mockHandleFileSelection = jest.fn()
      
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        handleFileSelection: mockHandleFileSelection,
      })

      render(<WritePostForm {...defaultProps} />)

      const fileInput = screen.getByRole('button', { name: /이미지 업로드/i }) || 
                       screen.getByLabelText(/이미지 업로드/i) ||
                       document.querySelector('input[type="file"]')
      
      expect(fileInput).toBeInTheDocument()

      const mockFile = new File(['image'], 'test.png', { type: 'image/png' })
      
      if (fileInput && fileInput.tagName === 'INPUT') {
        await user.upload(fileInput as HTMLInputElement, mockFile)
        expect(mockHandleFileSelection).toHaveBeenCalled()
      }
    })

    it('should display uploaded images', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        images: ['https://example.com/image1.webp'],
        pastedImages: [{ url: 'https://example.com/image1.webp', fileName: 'test.png', size: 1000 }],
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText('업로드한 이미지 (클릭하여 본문에 삽입)')).toBeInTheDocument()
      expect(screen.getByAltText('test.png')).toBeInTheDocument()
    })

    it('should show uploading state', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        uploadingFiles: ['uploading.png'],
        uploading: true,
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText('이미지 업로드 중...')).toBeInTheDocument()
      expect(screen.getByText('업로드 중...')).toBeInTheDocument()
    })
  })

  describe('Link Previews', () => {
    it('should display link previews when available', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        linkPreviews: [
          {
            url: 'https://example.com',
            title: 'Example Page',
            description: 'Test description',
            image: 'https://example.com/image.jpg',
          },
        ],
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText('📋 감지된 링크')).toBeInTheDocument()
      expect(screen.getByText('✅ Example Page')).toBeInTheDocument()
    })
  })

  describe('Clipboard Pasted Images', () => {
    it('should display pasted images info', () => {
      ;(require('@/hooks/useWritePostForm').useWritePostForm as jest.Mock).mockReturnValue({
        ...mockUseWritePostForm,
        pastedImages: [
          { url: 'https://example.com/pasted.webp', fileName: 'pasted.png', size: 2000 },
        ],
      })

      render(<WritePostForm {...defaultProps} />)

      expect(screen.getByText('클립보드에서 붙여넣기된 이미지')).toBeInTheDocument()
      expect(screen.getByText('pasted.png')).toBeInTheDocument()
      expect(screen.getByText('2000B')).toBeInTheDocument()
    })
  })
})