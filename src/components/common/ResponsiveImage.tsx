'use client&apos;

import React, { useState, useEffect, useRef } from &apos;react&apos;
import Image from &apos;next/image&apos;

export interface ResponsiveImageProps {
  src: string
  alt: string
  originalWidth?: number
  originalHeight?: number
  maxWidth?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: &apos;blur&apos; | &apos;empty&apos;
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
  className = &apos;',
  priority = false,
  quality = 85,
  placeholder = &apos;empty&apos;,
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
      return { width: maxWidth, height: &apos;auto&apos; as const }
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
    height: &apos;auto&apos;,
    width: &apos;100%&apos;,
    objectFit: &apos;contain&apos;,
    transition: &apos;opacity 0.3s ease-in-out&apos;,
    opacity: isLoaded ? 1 : 0.7
  }

  // Container styles
  const containerStyles: React.CSSProperties = {
    position: &apos;relative&apos;,
    display: &apos;inline-block&apos;,
    maxWidth: `${responsiveDimensions.width}px`,
    width: &apos;100%&apos;
  }

  if (hasError) {
    return (
      <div
        className={`responsive-image-error ${className}`}
        style={{
          ...containerStyles,
          backgroundColor: &apos;#f3f4f6&apos;,
          border: &apos;2px dashed #d1d5db&apos;,
          borderRadius: &apos;8px&apos;,
          padding: &apos;2rem&apos;,
          textAlign: &apos;center&apos;,
          color: &apos;#6b7280&apos;
        }}
      >
        <div>Unable to load image</div>
        <div style={{ fontSize: &apos;0.875rem&apos;, marginTop: &apos;0.5rem&apos; }}>{alt}</div>
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
        height={typeof responsiveDimensions.height === &apos;number&apos; ? responsiveDimensions.height : 400}
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
            position: &apos;absolute&apos;,
            top: &apos;50%&apos;,
            left: &apos;50%&apos;,
            transform: &apos;translate(-50%, -50%)&apos;,
            backgroundColor: &apos;rgba(255, 255, 255, 0.9)&apos;,
            padding: &apos;0.5rem&apos;,
            borderRadius: &apos;4px&apos;,
            fontSize: &apos;0.875rem&apos;,
            color: &apos;#6b7280&apos;
          }}
        >
          Loading...
        </div>
      )}
    </div>
  )
}

export default ResponsiveImage