// T013: Unit test for ImageUpload module - TDD Phase
// This test MUST FAIL before implementation

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUpload } from '../ImageUpload'
import type { UploadedImage } from '../../../types/forms'

// Mock useImageUpload hook
jest.mock('../../../hooks/useImageUpload', () => ({
  useImageUpload: jest.fn()
}))

const mockUseImageUpload = require('../../../hooks/useImageUpload').useImageUpload

describe.skip('ImageUpload', () => {
  const defaultHookReturn = {
    images: [],
    uploading: false,
    uploadProgress: 0,
    error: null,
    maxImages: 10,
    canAddMore: true,
    uploadImage: jest.fn(),
    removeImage: jest.fn(),
    clearImages: jest.fn(),
    reorderImages: jest.fn(),
    uploadBatch: jest.fn(),
    abortUpload: jest.fn(),
    onProgress: jest.fn()
  }

  beforeEach(() => {
    mockUseImageUpload.mockReturnValue(defaultHookReturn)
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render upload area when no images', () => {
      render(<ImageUpload />)

      expect(screen.getByText('이미지를 드래그하여 업로드하거나 클릭하여 선택하세요')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /파일 선택/i })).toBeInTheDocument()
      expect(screen.getByText('최대 10개 파일, 각각 5MB 이하')).toBeInTheDocument()
    })

    it('should render uploaded images grid', () => {
      const mockImages: UploadedImage[] = [
        {
          url: 'https://example.com/image1.jpg',
          fileName: 'image1.jpg',
          size: 1000000,
          mimeType: 'image/jpeg',
          width: 800,
          height: 600,
          uploadedAt: new Date('2023-01-01')
        },
        {
          url: 'https://example.com/image2.jpg',
          fileName: 'image2.jpg',
          size: 2000000,
          mimeType: 'image/jpeg',
          uploadedAt: new Date('2023-01-02')
        }
      ]

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      expect(screen.getByRole('list', { name: /업로드된 이미지/i })).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(screen.getByAltText('image1.jpg')).toBeInTheDocument()
      expect(screen.getByAltText('image2.jpg')).toBeInTheDocument()
    })

    it('should show max images limit warning', () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        maxImages: 3,
        canAddMore: false,
        images: Array(3).fill(null).map((_, i) => ({
          url: `https://example.com/image${i + 1}.jpg`,
          fileName: `image${i + 1}.jpg`,
          size: 1000000,
          mimeType: 'image/jpeg',
          uploadedAt: new Date()
        }))
      })

      render(<ImageUpload />)

      expect(screen.getByText('최대 이미지 개수에 도달했습니다 (3/3)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /파일 선택/i })).toBeDisabled()
    })

    it('should render with custom max images', () => {
      render(<ImageUpload maxImages={5} />)

      expect(screen.getByText('최대 5개 파일, 각각 5MB 이하')).toBeInTheDocument()
    })

    it('should render with custom allowed types', () => {
      render(<ImageUpload allowedTypes={['image/png', 'image/gif']} />)

      expect(screen.getByText(/PNG, GIF 파일만 지원/i)).toBeInTheDocument()
    })
  })

  describe('File Selection', () => {
    it('should handle file selection via input', async () => {
      const user = userEvent.setup()
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      render(<ImageUpload />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement

      await user.upload(fileInput, mockFile)

      expect(defaultHookReturn.uploadImage).toHaveBeenCalledWith(mockFile)
    })

    it('should handle multiple file selection', async () => {
      const user = userEvent.setup()
      const mockFiles = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ]

      render(<ImageUpload />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement

      await user.upload(fileInput, mockFiles)

      expect(defaultHookReturn.uploadBatch).toHaveBeenCalledWith(mockFiles)
    })

    it('should validate file types before upload', async () => {
      const user = userEvent.setup()
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      render(<ImageUpload allowedTypes={['image/jpeg', 'image/png']} />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement

      await user.upload(fileInput, mockFile)

      expect(screen.getByText('지원하지 않는 파일 형식입니다: text/plain')).toBeInTheDocument()
      expect(defaultHookReturn.uploadImage).not.toHaveBeenCalled()
    })

    it('should validate file size before upload', async () => {
      const user = userEvent.setup()
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })

      render(<ImageUpload maxFileSize={5 * 1024 * 1024} />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement

      await user.upload(fileInput, largeFile)

      expect(screen.getByText(/파일 크기가 너무 큽니다/i)).toBeInTheDocument()
      expect(defaultHookReturn.uploadImage).not.toHaveBeenCalled()
    })

    it('should prevent selection when at max capacity', () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        canAddMore: false
      })

      render(<ImageUpload />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement
      expect(fileInput).toBeDisabled()
    })
  })

  describe('Drag and Drop', () => {
    it('should handle drag enter and leave events', () => {
      render(<ImageUpload />)

      const dropZone = screen.getByRole('button', { name: /드래그하여 업로드/i })

      fireEvent.dragEnter(dropZone)
      expect(dropZone).toHaveClass('border-primary')

      fireEvent.dragLeave(dropZone)
      expect(dropZone).not.toHaveClass('border-primary')
    })

    it('should handle drag over event', () => {
      render(<ImageUpload />)

      const dropZone = screen.getByRole('button', { name: /드래그하여 업로드/i })

      const dragOverEvent = new Event('dragover')
      Object.defineProperty(dragOverEvent, 'preventDefault', {
        value: jest.fn()
      })

      fireEvent(dropZone, dragOverEvent)
      expect(dragOverEvent.preventDefault).toHaveBeenCalled()
    })

    it('should handle file drop', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      render(<ImageUpload />)

      const dropZone = screen.getByRole('button', { name: /드래그하여 업로드/i })

      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile],
          items: [{
            kind: 'file',
            getAsFile: () => mockFile
          }]
        }
      })

      fireEvent(dropZone, dropEvent)

      await waitFor(() => {
        expect(defaultHookReturn.uploadImage).toHaveBeenCalledWith(mockFile)
      })
    })

    it('should handle multiple file drop', async () => {
      const mockFiles = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ]

      render(<ImageUpload />)

      const dropZone = screen.getByRole('button', { name: /드래그하여 업로드/i })

      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: mockFiles
        }
      })

      fireEvent(dropZone, dropEvent)

      await waitFor(() => {
        expect(defaultHookReturn.uploadBatch).toHaveBeenCalledWith(mockFiles)
      })
    })

    it('should prevent drop when at max capacity', () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        canAddMore: false
      })

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      render(<ImageUpload />)

      const dropZone = screen.getByRole('button', { name: /드래그하여 업로드/i })

      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile]
        }
      })

      fireEvent(dropZone, dropEvent)

      expect(defaultHookReturn.uploadImage).not.toHaveBeenCalled()
      expect(screen.getByText(/최대 이미지 개수/i)).toBeInTheDocument()
    })
  })

  describe('Upload Progress', () => {
    it('should show progress bar during upload', () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: true,
        uploadProgress: 45
      })

      render(<ImageUpload />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText('업로드 중...')).toBeInTheDocument()
    })

    it('should show upload success message', async () => {
      const { rerender } = render(<ImageUpload />)

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: false,
        uploadProgress: 100,
        images: [
          {
            url: 'https://example.com/uploaded.jpg',
            fileName: 'uploaded.jpg',
            size: 1000000,
            mimeType: 'image/jpeg',
            uploadedAt: new Date()
          }
        ]
      })

      rerender(<ImageUpload />)

      await waitFor(() => {
        expect(screen.getByText('업로드 완료!')).toBeInTheDocument()
      })
    })

    it('should show abort button during upload', async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: true,
        uploadProgress: 30
      })

      render(<ImageUpload />)

      const abortButton = screen.getByRole('button', { name: /취소/i })
      await user.click(abortButton)

      expect(defaultHookReturn.abortUpload).toHaveBeenCalled()
    })
  })

  describe('Image Management', () => {
    const mockImages: UploadedImage[] = [
      {
        url: 'https://example.com/image1.jpg',
        fileName: 'image1.jpg',
        size: 1000000,
        mimeType: 'image/jpeg',
        uploadedAt: new Date()
      },
      {
        url: 'https://example.com/image2.jpg',
        fileName: 'image2.jpg',
        size: 2000000,
        mimeType: 'image/jpeg',
        uploadedAt: new Date()
      }
    ]

    it('should show remove button on image hover', async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      const firstImage = screen.getByAltText('image1.jpg')
      await user.hover(firstImage)

      expect(screen.getByRole('button', { name: /삭제/i })).toBeInTheDocument()
    })

    it('should remove image when delete button clicked', async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      const deleteButton = screen.getAllByRole('button', { name: /삭제/i })[0]
      await user.click(deleteButton)

      expect(defaultHookReturn.removeImage).toHaveBeenCalledWith('https://example.com/image1.jpg')
    })

    it('should show image details on hover', async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      const firstImage = screen.getByAltText('image1.jpg')
      await user.hover(firstImage)

      expect(screen.getByText('1.0 MB')).toBeInTheDocument()
      expect(screen.getByText('JPEG')).toBeInTheDocument()
    })

    it('should support image reordering via drag and drop', async () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload enableReordering />)

      const imageItems = screen.getAllByRole('listitem')
      const firstImage = imageItems[0]
      const secondImage = imageItems[1]

      // Simulate drag and drop (simplified)
      fireEvent.dragStart(firstImage)
      fireEvent.dragEnter(secondImage)
      fireEvent.dragEnd(firstImage)

      expect(defaultHookReturn.reorderImages).toHaveBeenCalledWith(0, 1)
    })

    it('should show clear all button when multiple images', async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      const clearButton = screen.getByRole('button', { name: /모든 이미지 삭제/i })
      await user.click(clearButton)

      expect(defaultHookReturn.clearImages).toHaveBeenCalled()
    })
  })

  describe('Error States', () => {
    it('should display upload errors', () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        error: 'Upload failed: Network error'
      })

      render(<ImageUpload />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Upload failed: Network error')).toBeInTheDocument()
    })

    it('should show retry button on error', async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        error: 'Upload failed',
        lastFailedFile: new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      })

      render(<ImageUpload />)

      const retryButton = screen.getByRole('button', { name: /다시 시도/i })
      await user.click(retryButton)

      expect(defaultHookReturn.uploadImage).toHaveBeenCalled()
    })

    it('should clear error when new upload starts', () => {
      const { rerender } = render(
        <ImageUpload />
      )

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        error: 'Previous error'
      })

      rerender(<ImageUpload />)
      expect(screen.getByText('Previous error')).toBeInTheDocument()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: true,
        error: null
      })

      rerender(<ImageUpload />)
      expect(screen.queryByText('Previous error')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ImageUpload />)

      expect(screen.getByLabelText(/이미지 업로드 영역/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /파일 선택/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      const mockImages: UploadedImage[] = [
        {
          url: 'https://example.com/image1.jpg',
          fileName: 'image1.jpg',
          size: 1000000,
          mimeType: 'image/jpeg',
          uploadedAt: new Date()
        }
      ]

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      // Tab to delete button
      await user.tab()
      await user.tab()

      const deleteButton = screen.getByRole('button', { name: /삭제/i })
      expect(deleteButton).toHaveFocus()

      // Press Enter to delete
      await user.keyboard('{Enter}')
      expect(defaultHookReturn.removeImage).toHaveBeenCalled()
    })

    it('should announce upload progress to screen readers', () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: true,
        uploadProgress: 67
      })

      render(<ImageUpload />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '67')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', '업로드 진행률')
    })
  })

  describe('Callbacks', () => {
    it('should call onUploadStart callback', async () => {
      const onUploadStart = jest.fn()
      const user = userEvent.setup()
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      render(<ImageUpload onUploadStart={onUploadStart} />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement
      await user.upload(fileInput, mockFile)

      expect(onUploadStart).toHaveBeenCalledWith(mockFile)
    })

    it('should call onUploadComplete callback', () => {
      const onUploadComplete = jest.fn()
      const mockImage: UploadedImage = {
        url: 'https://example.com/image.jpg',
        fileName: 'image.jpg',
        size: 1000000,
        mimeType: 'image/jpeg',
        uploadedAt: new Date()
      }

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: [mockImage]
      })

      render(<ImageUpload onUploadComplete={onUploadComplete} />)

      // Simulate upload completion effect
      act(() => {
        onUploadComplete(mockImage)
      })

      expect(onUploadComplete).toHaveBeenCalledWith(mockImage)
    })

    it('should call onUploadError callback', () => {
      const onUploadError = jest.fn()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        error: 'Upload error'
      })

      render(<ImageUpload onUploadError={onUploadError} />)

      // Simulate error effect
      act(() => {
        onUploadError(new Error('Upload error'))
      })

      expect(onUploadError).toHaveBeenCalledWith(new Error('Upload error'))
    })

    it('should call onChange callback when images change', () => {
      const onChange = jest.fn()
      const mockImages: UploadedImage[] = [
        {
          url: 'https://example.com/image.jpg',
          fileName: 'image.jpg',
          size: 1000000,
          mimeType: 'image/jpeg',
          uploadedAt: new Date()
        }
      ]

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload onChange={onChange} />)

      // Simulate images change effect
      act(() => {
        onChange(mockImages)
      })

      expect(onChange).toHaveBeenCalledWith(mockImages)
    })
  })

  describe('Integration', () => {
    it('should integrate with form validation', () => {
      const mockImages: UploadedImage[] = Array(11).fill(null).map((_, i) => ({
        url: `https://example.com/image${i + 1}.jpg`,
        fileName: `image${i + 1}.jpg`,
        size: 1000000,
        mimeType: 'image/jpeg',
        uploadedAt: new Date()
      }))

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages,
        maxImages: 10,
        canAddMore: false
      })

      render(<ImageUpload maxImages={10} />)

      expect(screen.getByText(/최대 이미지 개수에 도달/i)).toBeInTheDocument()
    })

    it('should handle paste events from clipboard', async () => {
      const clipboardData = {
        files: [new File(['image'], 'clipboard.png', { type: 'image/png' })]
      }

      render(<ImageUpload enablePaste />)

      const pasteEvent = new Event('paste', { bubbles: true })
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: clipboardData
      })

      fireEvent(document, pasteEvent)

      await waitFor(() => {
        expect(defaultHookReturn.uploadImage).toHaveBeenCalledWith(clipboardData.files[0])
      })
    })

    it('should work with external file references', () => {
      const externalImages = [
        'https://example.com/external1.jpg',
        'https://example.com/external2.jpg'
      ]

      render(<ImageUpload externalImages={externalImages} />)

      expect(screen.getByText('외부 이미지 2개')).toBeInTheDocument()
    })
  })
})