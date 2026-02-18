// T023: Implementation of ImageUpload component
// Following TDD GREEN phase - making tests pass

'use client&apos;

import React, { useCallback, useRef, useState, useEffect } from &apos;react&apos;
import { cn } from &apos;../../lib/utils&apos;
import { useImageUpload, type UseImageUploadOptions } from &apos;../../hooks/useImageUpload&apos;
import type { UploadedImage } from &apos;../../types/forms&apos;

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
  allowedTypes = [&apos;image/jpeg&apos;, &apos;image/png&apos;, &apos;image/gif&apos;, &apos;image/webp&apos;],
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
        if (item.kind === &apos;file&apos; && item.type.startsWith(&apos;image/&apos;)) {
          const file = item.getAsFile()
          if (file) {
            handleFileSelect([file])
          }
        }
      }
    }

    document.addEventListener(&apos;paste&apos;, handlePaste)
    return () => document.removeEventListener(&apos;paste&apos;, handlePaste)
  }, [enablePaste, handleFileSelect])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return &apos;0 B&apos;
    const k = 1024
    const sizes = [&apos;B&apos;, &apos;KB&apos;, &apos;MB&apos;, &apos;GB&apos;]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const getFileTypeText = (types: string[]): string => {
    const typeNames = types.map(type => {
      switch (type) {
        case &apos;image/jpeg&apos;: return &apos;JPEG&apos;
        case &apos;image/png&apos;: return &apos;PNG&apos;
        case &apos;image/gif&apos;: return &apos;GIF&apos;
        case &apos;image/webp&apos;: return &apos;WebP&apos;
        default: return type.split(&apos;/&apos;)[1]?.toUpperCase() || type
      }
    })
    return `Only ${typeNames.join(&apos;, &apos;)} supported`
  }

  return (
    <div className={cn(&apos;space-y-4&apos;, className)}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          ref={dropZoneRef}
          className={cn(
            &apos;border-2 border-dashed rounded-lg p-8 text-center transition-colors&apos;,
            dragActive ? &apos;border-blue-500 bg-blue-500/10&apos; : &apos;border-gray-600 hover:border-gray-400&apos;,
            !canAddMore && &apos;opacity-50 cursor-not-allowed&apos;
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role=&quot;button&quot;
          aria-label=&quot;Image upload area&quot;
          tabIndex={0}
        >
          <div className=&quot;space-y-2&quot;>
            <div className=&quot;text-lg&quot;>📁</div>
            <div className=&quot;text-sm text-gray-300&quot;>
              Drag & drop images here, or click to select
            </div>
            <button
              type=&quot;button&quot;
              onClick={() => fileInputRef.current?.click()}
              disabled={!canAddMore}
              className=&quot;px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50&quot;
              aria-label=&quot;Choose files&quot;
            >
              Choose Files
            </button>
            <div className=&quot;text-xs text-gray-400&quot;>
              Up to {maxImages} files, max {formatFileSize(maxFileSize)} each
            </div>
            {allowedTypes.length < 4 && (
              <div className=&quot;text-xs text-gray-500&quot;>
                {getFileTypeText(allowedTypes)}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type=&quot;file&quot;
            accept={allowedTypes.join(&apos;,&apos;)}
            multiple
            onChange={handleInputChange}
            className=&quot;hidden&quot;
            aria-label=&quot;File input&quot;
          />
        </div>
      )}

      {/* Max Images Warning */}
      {!canAddMore && (
        <div className=&quot;text-sm text-amber-600 bg-amber-50 p-3 rounded&quot;>
          Maximum images reached ({images.length}/{maxImages})
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className=&quot;space-y-2&quot;>
          <div className=&quot;flex items-center justify-between&quot;>
            <span className=&quot;text-sm text-gray-300&quot;>Uploading...</span>
            <button
              onClick={abortUpload}
              className=&quot;text-sm text-red-400 hover:text-red-300&quot;
              aria-label=&quot;Cancel upload&quot;
            >
              Cancel
            </button>
          </div>
          <div className=&quot;w-full bg-gray-200 rounded-full h-2&quot;>
            <div
              className=&quot;bg-blue-600 h-2 rounded-full transition-all&quot;
              style={{ width: `${uploadProgress}%` }}
              role=&quot;progressbar&quot;
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label=&quot;Upload progress&quot;
            />
          </div>
          <div className=&quot;text-sm text-gray-400&quot;>{uploadProgress}%</div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className=&quot;text-sm text-green-600 bg-green-50 p-3 rounded&quot;>
          Upload complete!
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className=&quot;text-sm text-red-600 bg-red-50 p-3 rounded&quot; role=&quot;alert&quot;>
          {error}
          {lastFailedFile && (
            <button
              onClick={handleRetry}
              className=&quot;ml-2 text-blue-600 hover:text-blue-700 underline&quot;
              aria-label=&quot;Retry&quot;
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* External Images Info */}
      {externalImages.length > 0 && (
        <div className=&quot;text-sm text-blue-600 bg-blue-50 p-3 rounded&quot;>
{externalImages.length} external image{externalImages.length !== 1 ? &apos;s&apos; : &apos;'}
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className=&quot;space-y-4&quot;>
          {images.length > 1 && (
            <div className=&quot;flex items-center justify-between&quot;>
              <span className=&quot;text-sm text-gray-300&quot;>
                Uploaded images ({images.length})
              </span>
              <button
                onClick={clearImages}
                className=&quot;text-sm text-red-400 hover:text-red-300&quot;
                aria-label=&quot;Remove all images&quot;
              >
                Remove All
              </button>
            </div>
          )}

          <ul
            className=&quot;grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4&quot;
            role=&quot;list&quot;
            aria-label=&quot;Uploaded images&quot;
          >
            {images.map((image, index) => (
              <li
                key={image.url}
                className=&quot;relative group aspect-square bg-gray-100 rounded-lg overflow-hidden&quot;
                role=&quot;listitem&quot;
              >
                <img
                  src={image.url}
                  alt={image.fileName}
                  className=&quot;w-full h-full object-cover&quot;
                  loading=&quot;lazy&quot;
                />

                {/* Overlay with controls */}
                <div className=&quot;absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center&quot;>
                  <button
                    onClick={() => handleRemove(image.url)}
                    className=&quot;bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors&quot;
                    aria-label={`Remove ${image.fileName}`}
                    tabIndex={0}
                  >
                    ✕
                  </button>
                </div>

                {/* Image Info */}
                <div className=&quot;absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity&quot;>
                  <div>{formatFileSize(image.size)}</div>
                  <div>{image.mimeType.split(&apos;/&apos;)[1]?.toUpperCase()}</div>
                  {image.width && image.height && (
                    <div>{image.width}×{image.height}</div>
                  )}
                </div>

                {/* Drag Handle for reordering */}
                {enableReordering && (
                  <div
                    className=&quot;absolute top-2 left-2 bg-white/90 p-1 rounded cursor-move opacity-0 group-hover:opacity-100&quot;
                    draggable
                    onDragStart={() => {/* drag start logic */}}
                    onDragEnd={() => handleReorder(index, index)} // Simplified for demo
                    aria-label=&quot;Reorder image&quot;
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