import { useCallback, useEffect } from 'react'
import { getImageFromPasteEvent, formatFileSize } from '@/lib/utils/imageProcessor'

interface UseClipboardPasteOptions {
  onImagePaste?: (imageUrl: string, fileName: string, size: number) => void
  onError?: (error: string) => void
  onUploadStart?: (fileName?: string) => void
  onUploadEnd?: () => void
  enabled?: boolean
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export function useClipboardPaste({
  onImagePaste,
  onError,
  onUploadStart,
  onUploadEnd,
  enabled = true,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.85
}: UseClipboardPasteOptions) {
  
  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (!enabled) return

    // 텍스트 입력 필드에서 붙여넣기 하는 경우 무시
    const target = event.target as HTMLElement
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
      return
    }

    try {
      const imageFile = getImageFromPasteEvent(event)
      
      if (!imageFile) {
        return // 이미지가 아니면 무시
      }

      // 기본 붙여넣기 동작 방지
      event.preventDefault()

      onUploadStart?.(imageFile.name)


      // 서버에 직접 업로드 (서버에서 WebP 변환 및 최적화 처리)
      const formData = new FormData()
      formData.append('file', imageFile)
      
      const response = await fetch('/api/uploads/image', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || 'Upload failed')
      }
      
      const uploadResult = await response.json()
      

      // 콜백 실행
      onImagePaste?.(uploadResult.url, imageFile.name, uploadResult.processedSize || imageFile.size)

    } catch (error) {
      console.error('❌ 클립보드 이미지 처리 failed:', error)
      onError?.(error instanceof Error ? error.message : '이미지 Processing failed')
    } finally {
      onUploadEnd?.()
    }
  }, [enabled, maxWidth, maxHeight, quality, onImagePaste, onError, onUploadStart, onUploadEnd])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('paste', handlePaste)
    
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste, enabled])

  return {
    // 수동으로 클립보드 확인하는 함수도 제공
    checkClipboard: handlePaste
  }
}

export default useClipboardPaste