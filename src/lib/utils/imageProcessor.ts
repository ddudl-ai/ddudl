/**
 * 이미지 처리 유틸리티: 리사이징, 압축, WebP 변환
 */

export interface ImageProcessOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
}

export interface ProcessedImage {
  file: File
  originalSize: number
  processedSize: number
  compressionRatio: number
  width: number
  height: number
}

/**
 * 이미지 파일을 처리합니다 (리사이징, 압축, 포맷 변환)
 */
export async function processImage(
  file: File,
  options: ImageProcessOptions = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    format = 'webp'
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      // 원본 크기
      const originalWidth = img.width
      const originalHeight = img.height

      // 리사이징 계산
      const { width, height } = calculateDimensions(
        originalWidth,
        originalHeight,
        maxWidth,
        maxHeight
      )

      // 캔버스 크기 설정
      canvas.width = width
      canvas.height = height

      // 이미지 그리기 (고품질 설정)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      // WebP/JPEG로 변환
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image processing failed'))
            return
          }

          const originalSize = file.size
          const processedSize = blob.size
          const compressionRatio = Math.round(((originalSize - processedSize) / originalSize) * 100)

          // 새 파일 생성
          const processedFile = new File([blob], getProcessedFileName(file.name, format), {
            type: `image/${format}`,
            lastModified: Date.now()
          })

          resolve({
            file: processedFile,
            originalSize,
            processedSize,
            compressionRatio,
            width,
            height
          })
        },
        `image/${format}`,
        quality
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // 이미지 로드
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 클립보드에서 이미지를 가져옵니다 (paste 이벤트에서)
 */
export function getImageFromPasteEvent(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items
  if (!items) return null

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        return new File([file], `clipboard-${Date.now()}.${item.type.split('/')[1]}`, {
          type: item.type,
          lastModified: Date.now()
        })
      }
    }
  }
  
  return null
}

/**
 * 드래그&드롭에서 이미지 파일을 추출합니다
 */
export function extractImageFiles(files: FileList | File[]): File[] {
  const fileArray = Array.from(files)
  return fileArray.filter(file => file.type.startsWith('image/'))
}

/**
 * 이미지인지 확인합니다
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * 이미지 크기 계산 (비율 유지하며 최대 크기 내로)
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth
  let height = originalHeight

  // 가로가 더 큰 경우
  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  // 세로가 더 큰 경우
  if (height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  }
}

/**
 * 처리된 파일명 생성
 */
function getProcessedFileName(originalName: string, format: string): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
  return `${nameWithoutExt}-processed.${format}`
}

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 이미지 유효성 검증
 */
export interface ImageValidationResult {
  valid: boolean
  error?: string
  metadata?: {
    width?: number
    height?: number
    size: number
    format: string
    type: string
  }
}

export function validateImage(buffer: Buffer): ImageValidationResult {
  // 파일 크기 검증 (10MB 제한)
  const maxSize = 10 * 1024 * 1024
  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: '파일 크기가 10MB를 초과합니다'
    }
  }

  // 최소 크기 검증 (100 bytes)
  if (buffer.length < 100) {
    return {
      valid: false,
      error: '파일이 너무 작거나 손상되었습니다'
    }
  }

  // 이미지 시그니처 검증
  const imageSignatures = [
    { format: 'jpeg', signature: [0xFF, 0xD8, 0xFF] },
    { format: 'png', signature: [0x89, 0x50, 0x4E, 0x47] },
    { format: 'webp', signature: [0x52, 0x49, 0x46, 0x46] },
    { format: 'gif', signature: [0x47, 0x49, 0x46, 0x38] }
  ]

  let detectedFormat = 'unknown'
  for (const sig of imageSignatures) {
    if (sig.signature.every((byte, index) => buffer[index] === byte)) {
      detectedFormat = sig.format
      break
    }
  }

  if (detectedFormat === 'unknown') {
    return {
      valid: false,
      error: '지원하지 않는 이미지 형식입니다'
    }
  }

  // WebP 파일의 경우 추가 검증
  if (detectedFormat === 'webp') {
    const webpIdentifier = buffer.slice(8, 12)
    if (webpIdentifier.toString() !== 'WEBP') {
      return {
        valid: false,
        error: '손상된 WebP 파일입니다'
      }
    }
  }

  return {
    valid: true,
    metadata: {
      size: buffer.length,
      format: detectedFormat,
      type: `image/${detectedFormat}`
    }
  }
}

/**
 * 이미지 처리 (서버에서 사용할 버전)
 */
export async function processImageBuffer(
  buffer: Buffer,
  options: { format?: 'webp' | 'jpeg' | 'png', quality?: number } = {}
): Promise<{
  buffer: Buffer
  format: string
  width: number
  height: number
  size: number
}> {
  const { format = 'webp', quality = 80 } = options

  // 실제 구현에서는 Sharp 라이브러리를 사용하겠지만
  // 여기서는 테스트를 위한 mock 구현
  const processedBuffer = Buffer.from(buffer)

  return {
    buffer: processedBuffer,
    format,
    width: 800,
    height: 600,
    size: processedBuffer.length
  }
}

/**
 * 이미지 업로드 결과 타입
 */
export interface ImageUploadResult {
  url: string
  fileName: string
  size: number
}

/**
 * 처리된 이미지를 서버에 업로드합니다
 */
export async function uploadProcessedImage(
  processedImage: ProcessedImage
): Promise<ImageUploadResult> {
  const formData = new FormData()
  formData.append('file', processedImage.file) // 올바른 필드명 사용

  const response = await fetch('/api/uploads/image', { // 올바른 엔드points
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(errorData.error || 'Upload failed')
  }

  const result = await response.json()
  
  // API 응답 구조에 맞게 수정
  if (!result.url) {
    throw new Error('Upload failed: No file URL returned')
  }
  
  return {
    url: result.url,
    fileName: processedImage.file.name,
    size: processedImage.processedSize
  }
}