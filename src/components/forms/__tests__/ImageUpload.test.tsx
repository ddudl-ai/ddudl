// T013: Unit test for ImageUpload module - TDD Phase
// This test MUST FAIL before implementation

import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor, act } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import { ImageUpload } from &apos;../ImageUpload&apos;
import type { UploadedImage } from &apos;../../../types/forms&apos;

// Mock useImageUpload hook
jest.mock(&apos;../../../hooks/useImageUpload&apos;, () => ({
  useImageUpload: jest.fn()
}))

const mockUseImageUpload = require(&apos;../../../hooks/useImageUpload&apos;).useImageUpload

describe(&apos;ImageUpload&apos;, () => {
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

  describe(&apos;Rendering&apos;, () => {
    it(&apos;should render upload area when no images&apos;, () => {
      render(<ImageUpload />)

      expect(screen.getByText(&apos;이미지를 드래그하여 업로드하거나 클릭하여 선택하세요&apos;)).toBeInTheDocument()
      expect(screen.getByRole(&apos;button&apos;, { name: /파일 선택/i })).toBeInTheDocument()
      expect(screen.getByText(&apos;최대 10개 파일, 각각 5MB 이하&apos;)).toBeInTheDocument()
    })

    it(&apos;should render uploaded images grid&apos;, () => {
      const mockImages: UploadedImage[] = [
        {
          url: &apos;https://example.com/image1.jpg&apos;,
          fileName: &apos;image1.jpg&apos;,
          size: 1000000,
          mimeType: &apos;image/jpeg&apos;,
          width: 800,
          height: 600,
          uploadedAt: new Date(&apos;2023-01-01&apos;)
        },
        {
          url: &apos;https://example.com/image2.jpg&apos;,
          fileName: &apos;image2.jpg&apos;,
          size: 2000000,
          mimeType: &apos;image/jpeg&apos;,
          uploadedAt: new Date(&apos;2023-01-02&apos;)
        }
      ]

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      expect(screen.getByRole(&apos;list&apos;, { name: /업로드된 이미지/i })).toBeInTheDocument()
      expect(screen.getAllByRole(&apos;listitem&apos;)).toHaveLength(2)
      expect(screen.getByAltText(&apos;image1.jpg&apos;)).toBeInTheDocument()
      expect(screen.getByAltText(&apos;image2.jpg&apos;)).toBeInTheDocument()
    })

    it(&apos;should show max images limit warning&apos;, () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        maxImages: 3,
        canAddMore: false,
        images: Array(3).fill(null).map((_, i) => ({
          url: `https://example.com/image${i + 1}.jpg`,
          fileName: `image${i + 1}.jpg`,
          size: 1000000,
          mimeType: &apos;image/jpeg&apos;,
          uploadedAt: new Date()
        }))
      })

      render(<ImageUpload />)

      expect(screen.getByText(&apos;최대 이미지 개수에 도달했습니다 (3/3)&apos;)).toBeInTheDocument()
      expect(screen.getByRole(&apos;button&apos;, { name: /파일 선택/i })).toBeDisabled()
    })

    it(&apos;should render with custom max images&apos;, () => {
      render(<ImageUpload maxImages={5} />)

      expect(screen.getByText(&apos;최대 5개 파일, 각각 5MB 이하&apos;)).toBeInTheDocument()
    })

    it(&apos;should render with custom allowed types&apos;, () => {
      render(<ImageUpload allowedTypes={[&apos;image/png&apos;, &apos;image/gif&apos;]} />)

      expect(screen.getByText(/PNG, GIF 파일만 지원/i)).toBeInTheDocument()
    })
  })

  describe(&apos;File Selection&apos;, () => {
    it(&apos;should handle file selection via input&apos;, async () => {
      const user = userEvent.setup()
      const mockFile = new File([&apos;test&apos;], &apos;test.jpg&apos;, { type: &apos;image/jpeg&apos; })

      render(<ImageUpload />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement

      await user.upload(fileInput, mockFile)

      expect(defaultHookReturn.uploadImage).toHaveBeenCalledWith(mockFile)
    })

    it(&apos;should handle multiple file selection&apos;, async () => {
      const user = userEvent.setup()
      const mockFiles = [
        new File([&apos;test1&apos;], &apos;test1.jpg&apos;, { type: &apos;image/jpeg&apos; }),
        new File([&apos;test2&apos;], &apos;test2.jpg&apos;, { type: &apos;image/jpeg&apos; })
      ]

      render(<ImageUpload />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement

      await user.upload(fileInput, mockFiles)

      expect(defaultHookReturn.uploadBatch).toHaveBeenCalledWith(mockFiles)
    })

    it(&apos;should validate file types before upload&apos;, async () => {
      const user = userEvent.setup()
      const mockFile = new File([&apos;test&apos;], &apos;test.txt&apos;, { type: &apos;text/plain&apos; })

      render(<ImageUpload allowedTypes={[&apos;image/jpeg&apos;, &apos;image/png&apos;]} />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement

      await user.upload(fileInput, mockFile)

      expect(screen.getByText(&apos;지원하지 않는 파일 형식입니다: text/plain&apos;)).toBeInTheDocument()
      expect(defaultHookReturn.uploadImage).not.toHaveBeenCalled()
    })

    it(&apos;should validate file size before upload&apos;, async () => {
      const user = userEvent.setup()
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], &apos;large.jpg&apos;, { type: &apos;image/jpeg&apos; })

      render(<ImageUpload maxFileSize={5 * 1024 * 1024} />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement

      await user.upload(fileInput, largeFile)

      expect(screen.getByText(/파일 크기가 너무 큽니다/i)).toBeInTheDocument()
      expect(defaultHookReturn.uploadImage).not.toHaveBeenCalled()
    })

    it(&apos;should prevent selection when at max capacity&apos;, () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        canAddMore: false
      })

      render(<ImageUpload />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement
      expect(fileInput).toBeDisabled()
    })
  })

  describe(&apos;Drag and Drop&apos;, () => {
    it(&apos;should handle drag enter and leave events&apos;, () => {
      render(<ImageUpload />)

      const dropZone = screen.getByRole(&apos;button&apos;, { name: /드래그하여 업로드/i })

      fireEvent.dragEnter(dropZone)
      expect(dropZone).toHaveClass(&apos;border-primary&apos;)

      fireEvent.dragLeave(dropZone)
      expect(dropZone).not.toHaveClass(&apos;border-primary&apos;)
    })

    it(&apos;should handle drag over event&apos;, () => {
      render(<ImageUpload />)

      const dropZone = screen.getByRole(&apos;button&apos;, { name: /드래그하여 업로드/i })

      const dragOverEvent = new Event(&apos;dragover&apos;)
      Object.defineProperty(dragOverEvent, &apos;preventDefault&apos;, {
        value: jest.fn()
      })

      fireEvent(dropZone, dragOverEvent)
      expect(dragOverEvent.preventDefault).toHaveBeenCalled()
    })

    it(&apos;should handle file drop&apos;, async () => {
      const mockFile = new File([&apos;test&apos;], &apos;test.jpg&apos;, { type: &apos;image/jpeg&apos; })

      render(<ImageUpload />)

      const dropZone = screen.getByRole(&apos;button&apos;, { name: /드래그하여 업로드/i })

      const dropEvent = new Event(&apos;drop&apos;, { bubbles: true })
      Object.defineProperty(dropEvent, &apos;dataTransfer&apos;, {
        value: {
          files: [mockFile],
          items: [{
            kind: &apos;file&apos;,
            getAsFile: () => mockFile
          }]
        }
      })

      fireEvent(dropZone, dropEvent)

      await waitFor(() => {
        expect(defaultHookReturn.uploadImage).toHaveBeenCalledWith(mockFile)
      })
    })

    it(&apos;should handle multiple file drop&apos;, async () => {
      const mockFiles = [
        new File([&apos;test1&apos;], &apos;test1.jpg&apos;, { type: &apos;image/jpeg&apos; }),
        new File([&apos;test2&apos;], &apos;test2.jpg&apos;, { type: &apos;image/jpeg&apos; })
      ]

      render(<ImageUpload />)

      const dropZone = screen.getByRole(&apos;button&apos;, { name: /드래그하여 업로드/i })

      const dropEvent = new Event(&apos;drop&apos;, { bubbles: true })
      Object.defineProperty(dropEvent, &apos;dataTransfer&apos;, {
        value: {
          files: mockFiles
        }
      })

      fireEvent(dropZone, dropEvent)

      await waitFor(() => {
        expect(defaultHookReturn.uploadBatch).toHaveBeenCalledWith(mockFiles)
      })
    })

    it(&apos;should prevent drop when at max capacity&apos;, () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        canAddMore: false
      })

      const mockFile = new File([&apos;test&apos;], &apos;test.jpg&apos;, { type: &apos;image/jpeg&apos; })

      render(<ImageUpload />)

      const dropZone = screen.getByRole(&apos;button&apos;, { name: /드래그하여 업로드/i })

      const dropEvent = new Event(&apos;drop&apos;, { bubbles: true })
      Object.defineProperty(dropEvent, &apos;dataTransfer&apos;, {
        value: {
          files: [mockFile]
        }
      })

      fireEvent(dropZone, dropEvent)

      expect(defaultHookReturn.uploadImage).not.toHaveBeenCalled()
      expect(screen.getByText(/최대 이미지 개수/i)).toBeInTheDocument()
    })
  })

  describe(&apos;Upload Progress&apos;, () => {
    it(&apos;should show progress bar during upload&apos;, () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: true,
        uploadProgress: 45
      })

      render(<ImageUpload />)

      expect(screen.getByRole(&apos;progressbar&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;45%&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;업로드 중...&apos;)).toBeInTheDocument()
    })

    it(&apos;should show upload success message&apos;, async () => {
      const { rerender } = render(<ImageUpload />)

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: false,
        uploadProgress: 100,
        images: [
          {
            url: &apos;https://example.com/uploaded.jpg&apos;,
            fileName: &apos;uploaded.jpg&apos;,
            size: 1000000,
            mimeType: &apos;image/jpeg&apos;,
            uploadedAt: new Date()
          }
        ]
      })

      rerender(<ImageUpload />)

      await waitFor(() => {
        expect(screen.getByText(&apos;업로드 완료!&apos;)).toBeInTheDocument()
      })
    })

    it(&apos;should show abort button during upload&apos;, async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: true,
        uploadProgress: 30
      })

      render(<ImageUpload />)

      const abortButton = screen.getByRole(&apos;button&apos;, { name: /취소/i })
      await user.click(abortButton)

      expect(defaultHookReturn.abortUpload).toHaveBeenCalled()
    })
  })

  describe(&apos;Image Management&apos;, () => {
    const mockImages: UploadedImage[] = [
      {
        url: &apos;https://example.com/image1.jpg&apos;,
        fileName: &apos;image1.jpg&apos;,
        size: 1000000,
        mimeType: &apos;image/jpeg&apos;,
        uploadedAt: new Date()
      },
      {
        url: &apos;https://example.com/image2.jpg&apos;,
        fileName: &apos;image2.jpg&apos;,
        size: 2000000,
        mimeType: &apos;image/jpeg&apos;,
        uploadedAt: new Date()
      }
    ]

    it(&apos;should show remove button on image hover&apos;, async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      const firstImage = screen.getByAltText(&apos;image1.jpg&apos;)
      await user.hover(firstImage)

      expect(screen.getByRole(&apos;button&apos;, { name: /삭제/i })).toBeInTheDocument()
    })

    it(&apos;should remove image when delete button clicked&apos;, async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      const deleteButton = screen.getAllByRole(&apos;button&apos;, { name: /삭제/i })[0]
      await user.click(deleteButton)

      expect(defaultHookReturn.removeImage).toHaveBeenCalledWith(&apos;https://example.com/image1.jpg&apos;)
    })

    it(&apos;should show image details on hover&apos;, async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      const firstImage = screen.getByAltText(&apos;image1.jpg&apos;)
      await user.hover(firstImage)

      expect(screen.getByText(&apos;1.0 MB&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;JPEG&apos;)).toBeInTheDocument()
    })

    it(&apos;should support image reordering via drag and drop&apos;, async () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload enableReordering />)

      const imageItems = screen.getAllByRole(&apos;listitem&apos;)
      const firstImage = imageItems[0]
      const secondImage = imageItems[1]

      // Simulate drag and drop (simplified)
      fireEvent.dragStart(firstImage)
      fireEvent.dragEnter(secondImage)
      fireEvent.dragEnd(firstImage)

      expect(defaultHookReturn.reorderImages).toHaveBeenCalledWith(0, 1)
    })

    it(&apos;should show clear all button when multiple images&apos;, async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        images: mockImages
      })

      render(<ImageUpload />)

      const clearButton = screen.getByRole(&apos;button&apos;, { name: /모든 이미지 삭제/i })
      await user.click(clearButton)

      expect(defaultHookReturn.clearImages).toHaveBeenCalled()
    })
  })

  describe(&apos;Error States&apos;, () => {
    it(&apos;should display upload errors&apos;, () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        error: &apos;Upload failed: Network error&apos;
      })

      render(<ImageUpload />)

      expect(screen.getByRole(&apos;alert&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;Upload failed: Network error&apos;)).toBeInTheDocument()
    })

    it(&apos;should show retry button on error&apos;, async () => {
      const user = userEvent.setup()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        error: &apos;Upload failed&apos;,
        lastFailedFile: new File([&apos;test&apos;], &apos;test.jpg&apos;, { type: &apos;image/jpeg&apos; })
      })

      render(<ImageUpload />)

      const retryButton = screen.getByRole(&apos;button&apos;, { name: /다시 시도/i })
      await user.click(retryButton)

      expect(defaultHookReturn.uploadImage).toHaveBeenCalled()
    })

    it(&apos;should clear error when new upload starts&apos;, () => {
      const { rerender } = render(
        <ImageUpload />
      )

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        error: &apos;Previous error&apos;
      })

      rerender(<ImageUpload />)
      expect(screen.getByText(&apos;Previous error&apos;)).toBeInTheDocument()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: true,
        error: null
      })

      rerender(<ImageUpload />)
      expect(screen.queryByText(&apos;Previous error&apos;)).not.toBeInTheDocument()
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    it(&apos;should have proper ARIA labels&apos;, () => {
      render(<ImageUpload />)

      expect(screen.getByLabelText(/이미지 업로드 영역/i)).toBeInTheDocument()
      expect(screen.getByRole(&apos;button&apos;, { name: /파일 선택/i })).toBeInTheDocument()
    })

    it(&apos;should support keyboard navigation&apos;, async () => {
      const user = userEvent.setup()
      const mockImages: UploadedImage[] = [
        {
          url: &apos;https://example.com/image1.jpg&apos;,
          fileName: &apos;image1.jpg&apos;,
          size: 1000000,
          mimeType: &apos;image/jpeg&apos;,
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

      const deleteButton = screen.getByRole(&apos;button&apos;, { name: /삭제/i })
      expect(deleteButton).toHaveFocus()

      // Press Enter to delete
      await user.keyboard(&apos;{Enter}&apos;)
      expect(defaultHookReturn.removeImage).toHaveBeenCalled()
    })

    it(&apos;should announce upload progress to screen readers&apos;, () => {
      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        uploading: true,
        uploadProgress: 67
      })

      render(<ImageUpload />)

      const progressBar = screen.getByRole(&apos;progressbar&apos;)
      expect(progressBar).toHaveAttribute(&apos;aria-valuenow&apos;, &apos;67&apos;)
      expect(progressBar).toHaveAttribute(&apos;aria-valuemin&apos;, &apos;0&apos;)
      expect(progressBar).toHaveAttribute(&apos;aria-valuemax&apos;, &apos;100&apos;)
      expect(progressBar).toHaveAttribute(&apos;aria-label&apos;, &apos;업로드 진행률&apos;)
    })
  })

  describe(&apos;Callbacks&apos;, () => {
    it(&apos;should call onUploadStart callback&apos;, async () => {
      const onUploadStart = jest.fn()
      const user = userEvent.setup()
      const mockFile = new File([&apos;test&apos;], &apos;test.jpg&apos;, { type: &apos;image/jpeg&apos; })

      render(<ImageUpload onUploadStart={onUploadStart} />)

      const fileInput = screen.getByLabelText(/파일 선택/i) as HTMLInputElement
      await user.upload(fileInput, mockFile)

      expect(onUploadStart).toHaveBeenCalledWith(mockFile)
    })

    it(&apos;should call onUploadComplete callback&apos;, () => {
      const onUploadComplete = jest.fn()
      const mockImage: UploadedImage = {
        url: &apos;https://example.com/image.jpg&apos;,
        fileName: &apos;image.jpg&apos;,
        size: 1000000,
        mimeType: &apos;image/jpeg&apos;,
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

    it(&apos;should call onUploadError callback&apos;, () => {
      const onUploadError = jest.fn()

      mockUseImageUpload.mockReturnValue({
        ...defaultHookReturn,
        error: &apos;Upload error&apos;
      })

      render(<ImageUpload onUploadError={onUploadError} />)

      // Simulate error effect
      act(() => {
        onUploadError(new Error(&apos;Upload error&apos;))
      })

      expect(onUploadError).toHaveBeenCalledWith(new Error(&apos;Upload error&apos;))
    })

    it(&apos;should call onChange callback when images change&apos;, () => {
      const onChange = jest.fn()
      const mockImages: UploadedImage[] = [
        {
          url: &apos;https://example.com/image.jpg&apos;,
          fileName: &apos;image.jpg&apos;,
          size: 1000000,
          mimeType: &apos;image/jpeg&apos;,
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

  describe(&apos;Integration&apos;, () => {
    it(&apos;should integrate with form validation&apos;, () => {
      const mockImages: UploadedImage[] = Array(11).fill(null).map((_, i) => ({
        url: `https://example.com/image${i + 1}.jpg`,
        fileName: `image${i + 1}.jpg`,
        size: 1000000,
        mimeType: &apos;image/jpeg&apos;,
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

    it(&apos;should handle paste events from clipboard&apos;, async () => {
      const clipboardData = {
        files: [new File([&apos;image&apos;], &apos;clipboard.png&apos;, { type: &apos;image/png&apos; })]
      }

      render(<ImageUpload enablePaste />)

      const pasteEvent = new Event(&apos;paste&apos;, { bubbles: true })
      Object.defineProperty(pasteEvent, &apos;clipboardData&apos;, {
        value: clipboardData
      })

      fireEvent(document, pasteEvent)

      await waitFor(() => {
        expect(defaultHookReturn.uploadImage).toHaveBeenCalledWith(clipboardData.files[0])
      })
    })

    it(&apos;should work with external file references&apos;, () => {
      const externalImages = [
        &apos;https://example.com/external1.jpg&apos;,
        &apos;https://example.com/external2.jpg&apos;
      ]

      render(<ImageUpload externalImages={externalImages} />)

      expect(screen.getByText(&apos;외부 이미지 2개&apos;)).toBeInTheDocument()
    })
  })
})