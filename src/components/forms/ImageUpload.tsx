// T023: Implementation of ImageUpload component
// Following TDD GREEN phase - making tests pass

'use client'

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { useImageUpload, type UseImageUploadOptions } from '../../hooks/useImageUpload'
import type { UploadedImage } from '../../types/forms'

export interface ImageUploadProps extends UseImageUploadOptions {
  className?: string
  onChange?: (images: UploadedImage[]) => void
  onUploadStart?: (file: File) => void
  onUploadComplete?: (image: UploadedImage) => void
  onUploadError?: (error: Error) => void
  enableReordering?: boolean
  enablePaste?: boolean
  externalImages?: string[]
  showToolbar?: boolean
}

export function ImageUpload({
  className,
  maxImages = 10,
  maxFileSize = 5 * 1024 * 1024,
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  onChange,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  enableReordering = false,
  enablePaste = false,
  externalImages = [],
  showToolbar = false,
  ...hookOptions
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const {
    images,
    uploading,
    uploadProgress,
    error,
    canAddMore,
    uploadImage,
    removeImage,
    clearImages,
    reorderImages,
    uploadBatch,
    abortUpload,
    lastFailedFile
  } = useImageUpload({
    maxImages,
    maxFileSize,
    allowedTypes,
    ...hookOptions
  })

  // Notify parent of changes
  useEffect(() => {
    onChange?.(images)
  }, [images, onChange])

  // Show success message briefly after upload
  useEffect(() => {
    if (!uploading && uploadProgress === 100 && images.length > 0) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [uploading, uploadProgress, images.length])

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `Unsupported file type: ${file.type}` }
    }

    if (file.size > maxFileSize) {
      const sizeMB = Math.round(file.size / 1024 / 1024 * 100) / 100
      const maxSizeMB = Math.round(maxFileSize / 1024 / 1024 * 100) / 100
      return { valid: false, error: `File too large: ${sizeMB}MB (max: ${maxSizeMB}MB)` }
    }

    return { valid: true }
  }

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    if (!canAddMore) {
      return
    }

    // Validate all files first
    for (const file of fileArray) {
      const validation = validateFile(file)
      if (!validation.valid) {
        onUploadError?.(new Error(validation.error))
        return
      }
    }

    // Upload files
    if (fileArray.length === 1) {
      const file = fileArray[0]
      onUploadStart?.(file)

      const result = await uploadImage(file)
      if (result.success && result.url) {
        const uploadedImage = images.find(img => img.url === result.url)
        if (uploadedImage) {
          onUploadComplete?.(uploadedImage)
        }
      } else if (result.error) {
        onUploadError?.(new Error(result.error))
      }
    } else {
      // Batch upload
      for (const file of fileArray) {
        onUploadStart?.(file)
      }

      await uploadBatch(fileArray)
    }
  }, [canAddMore, uploadImage, uploadBatch, images, onUploadStart, onUploadComplete, onUploadError, validateFile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (!canAddMore) {
      return
    }

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleRemove = (url: string) => {
    removeImage(url)
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (enableReordering) {
      reorderImages(fromIndex, toIndex)
    }
  }

  const handleRetry = async () => {
    if (lastFailedFile) {
      await uploadImage(lastFailedFile)
    }
  }

  // Paste handling
  useEffect(() => {
    if (!enablePaste) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            handleFileSelect([file])
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [enablePaste, handleFileSelect])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const getFileTypeText = (types: string[]): string => {
    const typeNames = types.map(type => {
      switch (type) {
        case 'image/jpeg': return 'JPEG'
        case 'image/png': return 'PNG'
        case 'image/gif': return 'GIF'
        case 'image/webp': return 'WebP'
        default: return type.split('/')[1]?.toUpperCase() || type
      }
    })
    return `Only ${typeNames.join(', ')} supported`
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          ref={dropZoneRef}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-400',
            !canAddMore && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          aria-label="Image upload area"
          tabIndex={0}
        >
          <div className="space-y-2">
            <div className="text-lg">📁</div>
            <div className="text-sm text-gray-300">
              Drag & drop images here, or click to select
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canAddMore}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              aria-label="Choose files"
            >
              Choose Files
            </button>
            <div className="text-xs text-gray-400">
              Up to {maxImages} files, max {formatFileSize(maxFileSize)} each
            </div>
            {allowedTypes.length < 4 && (
              <div className="text-xs text-gray-500">
                {getFileTypeText(allowedTypes)}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={allowedTypes.join(',')}
            multiple
            onChange={handleInputChange}
            className="hidden"
            aria-label="File input"
          />
        </div>
      )}

      {/* Max Images Warning */}
      {!canAddMore && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
          Maximum images reached ({images.length}/{maxImages})
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Uploading...</span>
            <button
              onClick={abortUpload}
              className="text-sm text-red-400 hover:text-red-300"
              aria-label="Cancel upload"
            >
              Cancel
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Upload progress"
            />
          </div>
          <div className="text-sm text-gray-400">{uploadProgress}%</div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
          Upload complete!
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded" role="alert">
          {error}
          {lastFailedFile && (
            <button
              onClick={handleRetry}
              className="ml-2 text-blue-600 hover:text-blue-700 underline"
              aria-label="Retry"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* External Images Info */}
      {externalImages.length > 0 && (
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
{externalImages.length} external image{externalImages.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          {images.length > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">
                Uploaded images ({images.length})
              </span>
              <button
                onClick={clearImages}
                className="text-sm text-red-400 hover:text-red-300"
                aria-label="Remove all images"
              >
                Remove All
              </button>
            </div>
          )}

          <ul
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            role="list"
            aria-label="Uploaded images"
          >
            {images.map((image, index) => (
              <li
                key={image.url}
                className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
                role="listitem"
              >
                <img
                  src={image.url}
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Overlay with controls */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleRemove(image.url)}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    aria-label={`Remove ${image.fileName}`}
                    tabIndex={0}
                  >
                    ✕
                  </button>
                </div>

                {/* Image Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div>{formatFileSize(image.size)}</div>
                  <div>{image.mimeType.split('/')[1]?.toUpperCase()}</div>
                  {image.width && image.height && (
                    <div>{image.width}×{image.height}</div>
                  )}
                </div>

                {/* Drag Handle for reordering */}
                {enableReordering && (
                  <div
                    className="absolute top-2 left-2 bg-white/90 p-1 rounded cursor-move opacity-0 group-hover:opacity-100"
                    draggable
                    onDragStart={() => {/* drag start logic */}}
                    onDragEnd={() => handleReorder(index, index)} // Simplified for demo
                    aria-label="Reorder image"
                  >
                    ⋮⋮
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}