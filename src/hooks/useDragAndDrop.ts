import { useCallback, useEffect, useState } from 'react'
import { extractImageFiles, formatFileSize } from '@/lib/utils/imageProcessor'

interface UseDragAndDropOptions {
  onImageDrop?: (imageUrl: string, fileName: string, size: number) => void
  onError?: (error: string) => void
  onUploadStart?: (fileName?: string) => void
  onUploadEnd?: () => void
  enabled?: boolean
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export function useDragAndDrop({
  onImageDrop,
  onError,
  onUploadStart,
  onUploadEnd,
  enabled = true,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.85
}: UseDragAndDropOptions) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((event: DragEvent) => {
    if (!enabled) return
    
    event.preventDefault()
    event.stopPropagation()
    
    if (event.dataTransfer?.items) {
      const hasFiles = Array.from(event.dataTransfer.items).some(item => 
        item.kind === 'file' && item.type.startsWith('image/')
      )
      if (hasFiles) {
        setIsDragging(true)
      }
    }
  }, [enabled])

  const handleDragOver = useCallback((event: DragEvent) => {
    if (!enabled) return
    
    event.preventDefault()
    event.stopPropagation()
  }, [enabled])

  const handleDragLeave = useCallback((event: DragEvent) => {
    if (!enabled) return
    
    event.preventDefault()
    event.stopPropagation()
    
    // 완전히 떠났는지 확인
    if (event.relatedTarget === null || !document.body.contains(event.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [enabled])

  const handleDrop = useCallback(async (event: DragEvent) => {
    if (!enabled) return
    
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)

    const files = event.dataTransfer?.files
    if (!files) return

    const imageFiles = extractImageFiles(files)
    if (imageFiles.length === 0) return

    try {
      for (const file of imageFiles) {
        onUploadStart?.(file.name)

        // 서버에 직접 업로드 (서버에서 WebP 변환 및 최적화 처리)
        const formData = new FormData()
        formData.append('file', file)
        
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
        onImageDrop?.(uploadResult.url, file.name, uploadResult.processedSize || file.size)
      }
    } catch (error) {
      console.error('❌ 드래그&드롭 이미지 처리 failed:', error)
      onError?.(error instanceof Error ? error.message : '이미지 Processing failed')
    } finally {
      onUploadEnd?.()
    }
  }, [enabled, maxWidth, maxHeight, quality, onImageDrop, onError, onUploadStart, onUploadEnd])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)
    
    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop, enabled])

  return {
    isDragging
  }
}

export default useDragAndDrop