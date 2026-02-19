'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

export interface ResponsiveImageProps {
  src: string
  alt: string
  originalWidth?: number
  originalHeight?: number
  maxWidth?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  onError?: (error: Error) => void
}

export function ResponsiveImage({
  src,
  alt,
  originalWidth,
  originalHeight,
  maxWidth = 800,
  className = '',
  priority = false,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Calculate responsive dimensions
  const getResponsiveDimensions = (originalW?: number, originalH?: number) => {
    if (!originalW || !originalH) {
      return { width: maxWidth, height: 'auto' as const }
    }

    // For small images, use original size
    if (originalW <= maxWidth && originalH <= maxWidth) {
      return { width: originalW, height: originalH }
    }

    // For large images, calculate proportional size
    const aspectRatio = originalH / originalW
    const calculatedWidth = Math.min(originalW, maxWidth)
    const calculatedHeight = Math.round(calculatedWidth * aspectRatio)

    return { width: calculatedWidth, height: calculatedHeight }
  }

  // Load image dimensions if not provided
  useEffect(() => {
    if (originalWidth && originalHeight) {
      setDimensions({ width: originalWidth, height: originalHeight })
      return
    }

    const img = new window.Image()
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      console.warn(`Failed to load image dimensions for: ${src}`)
    }
    img.src = src
  }, [src, originalWidth, originalHeight])

  const handleLoad = () => {
    setIsLoaded(true)
    setHasError(false)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    const error = new Error(`Failed to load image: ${src}`)
    onError?.(error)
  }

  // Get responsive dimensions
  const responsiveDimensions = getResponsiveDimensions(
    dimensions?.width || originalWidth,
    dimensions?.height || originalHeight
  )

  // CSS styles for responsive behavior
  const imageStyles: React.CSSProperties = {
    maxWidth: `min(100%, ${maxWidth}px)`,
    height: 'auto',
    width: '100%',
    objectFit: 'contain',
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0.7
  }

  // Container styles
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    maxWidth: `${responsiveDimensions.width}px`,
    width: '100%'
  }

  if (hasError) {
    return (
      <div
        className={`responsive-image-error ${className}`}
        style={{
          ...containerStyles,
          backgroundColor: '#f3f4f6',
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280'
        }}
      >
        <div>Unable to load image</div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{alt}</div>
      </div>
    )
  }

  return (
    <div
      className={`responsive-image-container ${className}`}
      style={containerStyles}
    >
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        width={responsiveDimensions.width}
        height={typeof responsiveDimensions.height === 'number' ? responsiveDimensions.height : 400}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        style={imageStyles}
        onLoad={handleLoad}
        onError={handleError}
        sizes={`(max-width: 768px) 100vw, (max-width: 1200px) 80vw, ${maxWidth}px`}
      />

      {/* Loading indicator */}
      {!isLoaded && !hasError && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '0.5rem',
            borderRadius: '4px',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}
        >
          Loading...
        </div>
      )}
    </div>
  )
}

export default ResponsiveImage