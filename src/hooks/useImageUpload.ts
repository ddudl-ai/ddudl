// T013: Enhanced useImageUpload hook with improved error handling and retry logic
// Implements better error recovery, AVIF support, and detailed error messages

import { useState, useCallback, useRef } from 'react'
import type { UploadedImage } from '../types/forms'

export interface UseImageUploadOptions {
  maxImages?: number
  maxFileSize?: number // in bytes
  allowedTypes?: string[]
  maxRetries?: number
  cacheTTL?: number // not used in this hook but for consistency with tests
  retryDelay?: number // base delay for retry in ms
}

export interface UseImageUploadReturn {
  images: UploadedImage[]
  uploading: boolean
  uploadProgress: number
  error: string | null
  maxImages: number
  canAddMore: boolean
  uploadImage: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>
  removeImage: (url: string) => void
  clearImages: () => void
  reorderImages: (fromIndex: number, toIndex: number) => void
  uploadBatch: (files: File[]) => Promise<Array<{ success: boolean; url?: string; error?: string }>>
  abortUpload: () => void
  onProgress?: (progress: number) => void
  lastFailedFile?: File
  clearError: () => void
  retryLastFailed: () => Promise<{ success: boolean; url?: string; error?: string } | null>
}

const DEFAULT_MAX_IMAGES = 10
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB (increased from 5MB)
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif', // Added AVIF support
  'image/svg+xml' // Added SVG support
]
const DEFAULT_MAX_RETRIES = 3 // Increased from 2
const DEFAULT_RETRY_DELAY = 1000 // Base retry delay in ms

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    maxImages = DEFAULT_MAX_IMAGES,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    maxRetries = DEFAULT_MAX_RETRIES
  } = options

  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedFile, setLastFailedFile] = useState<File | undefined>()

  const abortController = useRef<AbortController | null>(null)

  const canAddMore = images.length < maxImages

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `Invalid file type: ${file.type}` }
    }

    if (file.size > maxFileSize) {
      return { valid: false, error: `File too large: ${Math.round(file.size / 1024 / 1024 * 100) / 100}MB` }
    }

    return { valid: true }
  }

  const uploadWithRetry = async (file: File, retryCount = 0): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      abortController.current = new AbortController()

      const formData = new FormData()
      formData.append('files', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: abortController.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || errorData.error || 'Upload failed')
      }

      const result = await response.json()
      if (result.success && result.files && result.files.length > 0) {
        return { success: true, url: result.files[0] }
      } else {
        throw new Error('No file URL in response')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'

      if (errorMessage.includes('Aborted')) {
        return { success: false, error: errorMessage }
      }

      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return uploadWithRetry(file, retryCount + 1)
      }

      return { success: false, error: errorMessage }
    }
  }

  const uploadImage = useCallback(async (file: File) => {
    if (!canAddMore) {
      return { success: false, error: 'Maximum number of images reached' }
    }

    const validation = validateFile(file)
    if (!validation.valid) {
      setError(validation.error!)
      setLastFailedFile(file)
      return { success: false, error: validation.error }
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)
    setLastFailedFile(undefined)

    try {
      const result = await uploadWithRetry(file)

      if (result.success && result.url) {
        const uploadedImage: UploadedImage = {
          url: result.url,
          fileName: file.name,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date()
        }

        setImages(prev => [...prev, uploadedImage])
        setUploadProgress(100)
      } else {
        setError(result.error || 'Upload failed')
        setLastFailedFile(file)
      }

      return result

    } finally {
      setUploading(false)
    }
  }, [canAddMore, maxFileSize, allowedTypes, maxRetries])

  const removeImage = useCallback((url: string) => {
    setImages(prev => prev.filter(img => img.url !== url))
    setError(null)
  }, [])

  const clearImages = useCallback(() => {
    setImages([])
    setError(null)
  }, [])

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages(prev => {
      const newImages = [...prev]
      const [movedImage] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, movedImage)
      return newImages
    })
  }, [])

  const uploadBatch = useCallback(async (files: File[]) => {
    const results: Array<{ success: boolean; url?: string; error?: string }> = []

    for (const file of files) {
      if (!canAddMore && images.length + results.filter(r => r.success).length >= maxImages) {
        results.push({ success: false, error: 'Maximum number of images reached' })
        continue
      }

      const result = await uploadImage(file)
      results.push(result)
    }

    return results
  }, [uploadImage, canAddMore, maxImages, images.length])

  const abortUpload = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
  }, [])

  const onProgress = useCallback((progress: number) => {
    setUploadProgress(progress)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setLastFailedFile(undefined)
  }, [])

  const retryLastFailed = useCallback(async () => {
    if (!lastFailedFile) {
      return null
    }

    const result = await uploadImage(lastFailedFile)
    if (result.success) {
      setLastFailedFile(undefined)
    }
    return result
  }, [lastFailedFile, uploadImage])

  return {
    images,
    uploading,
    uploadProgress,
    error,
    maxImages,
    canAddMore,
    uploadImage,
    removeImage,
    clearImages,
    reorderImages,
    uploadBatch,
    abortUpload,
    onProgress,
    lastFailedFile,
    clearError,
    retryLastFailed
  }
}