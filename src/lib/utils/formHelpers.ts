// T022: Implementation of form helpers
// Following TDD GREEN phase - making tests pass

import DOMPurify from 'isomorphic-dompurify'
import type { PostFormData, ValidationError } from '../../types/forms'

// Sanitization functions
export function sanitizeFormData(
  input: Partial<PostFormData>,
  options: {
    allowSafeHtml?: boolean
    normalizeUnicode?: boolean
  } = {}
): Partial<PostFormData> {
  const { allowSafeHtml = false, normalizeUnicode = false } = options

  const sanitized: Partial<PostFormData> = {}

  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === 'string') {
      let cleanValue = value

      // Remove dangerous HTML but allow safe content formatting
      if (allowSafeHtml) {
        cleanValue = DOMPurify.sanitize(cleanValue, {
          ALLOWED_TAGS: ['p', 'strong', 'em', 'b', 'i', 'img', 'br'],
          ALLOWED_ATTR: ['src', 'alt', 'style', 'width', 'height', 'class', 'data-eggdome']
        })
      } else {
        // For content field, allow basic formatting, images, and YouTube iframes
        if (key === 'content') {
          cleanValue = DOMPurify.sanitize(cleanValue, {
            ALLOWED_TAGS: ['p', 'img', 'br', 'strong', 'em', 'b', 'i', 'iframe', 'div'],
            ALLOWED_ATTR: ['src', 'alt', 'style', 'width', 'height', 'class', 'data-eggdome', 'allow', 'allowfullscreen', 'frameborder', 'referrerpolicy']
          })
        } else {
          // For other fields, strip HTML completely
          cleanValue = DOMPurify.sanitize(cleanValue, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
        }
      }

      // Normalize unicode
      if (normalizeUnicode) {
        cleanValue = cleanValue.normalize('NFC')
      }

      // Trim whitespace
      cleanValue = cleanValue.trim()

      sanitized[key as keyof PostFormData] = cleanValue as any
    } else {
      sanitized[key as keyof PostFormData] = value || '' as any
    }
  })

  return sanitized
}

// Validation functions
export function validatePostData(data: Partial<PostFormData>): ValidationError[] {
  const errors: ValidationError[] = []

  // Title validation
  if (!data.title || data.title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'Title is required',
      code: 'REQUIRED'
    })
  } else {
    if (data.title.length < 5) {
      errors.push({
        field: 'title',
        message: '제목은 최소 5자 이상이어야 합니다',
        code: 'MIN_LENGTH'
      })
    }
    if (data.title.length > 300) {
      errors.push({
        field: 'title',
        message: '제목은 최대 300자까지 가능합니다',
        code: 'MAX_LENGTH'
      })
    }
  }

  // Author name validation
  if (!data.authorName || data.authorName.trim() === '') {
    errors.push({
      field: 'authorName',
      message: 'Author name is required',
      code: 'REQUIRED'
    })
  } else {
    if (data.authorName.length < 3) {
      errors.push({
        field: 'authorName',
        message: '작성자명은 최소 3자 이상이어야 합니다',
        code: 'MIN_LENGTH'
      })
    }
    if (data.authorName.length > 20) {
      errors.push({
        field: 'authorName',
        message: '작성자명은 최대 20자까지 가능합니다',
        code: 'MAX_LENGTH'
      })
    }

    // Pattern validation
    if (!/^[가-힣a-zA-Z][가-힣a-zA-Z0-9_]*$/.test(data.authorName)) {
      errors.push({
        field: 'authorName',
        message: '올바른 형식이 아닙니다',
        code: 'PATTERN'
      })
    }

    // Reserved words
    const reservedWords = ['admin', 'moderator', 'system', 'null']
    if (reservedWords.includes(data.authorName.toLowerCase())) {
      errors.push({
        field: 'authorName',
        message: '예약된 단어는 사용할 수 없습니다',
        code: 'RESERVED_WORD'
      })
    }
  }

  // Channel name validation
  if (!data.channelName || data.channelName.trim() === '') {
    errors.push({
      field: 'channelName',
      message: 'Channel name is required',
      code: 'REQUIRED'
    })
  }

  return errors
}

// File size formatting
export function formatFileSize(bytes: number, decimals = 1): string {
  if (bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const size = bytes / Math.pow(k, i)
  return `${size.toFixed(decimals)} ${sizes[i]}`
}

// Slug generation with Korean support
export function generateSlug(
  text: string,
  options: { maxLength?: number } = {}
): string {
  const { maxLength = 100 } = options

  if (!text || text.trim() === '') return ''

  // Korean to romanization (simplified mapping)
  const koreanMap: { [key: string]: string } = {
    '가': 'ga', '나': 'na', '다': 'da', '라': 'ra', '마': 'ma',
    '바': 'ba', '사': 'sa', '아': 'a', '자': 'ja', '차': 'cha',
    '카': 'ka', '타': 'ta', '파': 'pa', '하': 'ha',
    '안': 'an', '녕': 'nyeong', '세': 'se', '요': 'yo',
    '계': 'gye', '한': 'han', '국': 'gug', '어': 'eo',
    '제': 'je', '목': 'mog', '입': 'ip', '니': 'ni', '습': 'seub',
    '리': 'ri', '액': 'aeg', '트': 'teu'
  }

  let slug = text
    .toLowerCase()
    .trim()
    // Replace Korean characters
    .replace(/[가-힣]/g, char => koreanMap[char] || char)
    // Remove numbers and special characters
    .replace(/[^a-zA-Z가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (maxLength && slug.length > maxLength) {
    slug = slug.substring(0, maxLength).replace(/-[^-]*$/, '')
  }

  return slug
}

// URL extraction
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
  const matches = text.match(urlRegex)

  if (!matches) return []

  // Remove duplicates and return
  return Array.from(new Set(matches))
}

// Markdown conversion (simplified)
export function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/```(\w+)?\n([\s\S]*?)\n```/g, '<pre><code class="language-$1">$2</code></pre>')

  // Sanitize the result
  return DOMPurify.sanitize(html)
}

export function convertHtmlToMarkdown(html: string): string {
  return html
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<a href="([^"]+)">([^<]+)<\/a>/g, '[$2]($1)')
    .replace(/<h1>(.*?)<\/h1>/g, '# $1')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1')
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
    .trim()
}

// Debounced validation
export function debounceValidation<T extends any[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout

  return (...args: T) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Form data snapshot
export function createFormDataSnapshot<T>(
  data: T,
  options: { includeMetadata?: boolean } = {}
): T & { metadata?: any } {
  const { includeMetadata = false } = options

  const snapshot = JSON.parse(JSON.stringify(data, (key, value) => {
    if (value instanceof Date) {
      return { __date: value.toISOString() }
    }
    return value
  }))

  // Restore dates
  const restoreObject = (obj: any): any => {
    if (obj && typeof obj === 'object') {
      if (obj.__date) {
        return new Date(obj.__date)
      }
      for (const key in obj) {
        obj[key] = restoreObject(obj[key])
      }
    }
    return obj
  }

  const restored = restoreObject(snapshot)

  if (includeMetadata) {
    return {
      ...restored,
      metadata: {
        snapshotTime: new Date(),
        version: '1.0.0'
      }
    }
  }

  return restored
}

// Draft merging
export function mergeDraftWithCurrent<T>(
  currentData: Partial<T>,
  draftData: Partial<T>,
  options: { preferNonEmpty?: boolean } = {}
): Partial<T> {
  const { preferNonEmpty = false } = options
  const merged: Partial<T> = { ...currentData }

  Object.entries(draftData).forEach(([key, value]) => {
    const currentValue = currentData[key as keyof T]

    if (preferNonEmpty) {
      // Only use draft value if it's not empty and current is empty
      if (value && (!currentValue || (typeof currentValue === 'string' && currentValue.trim() === ''))) {
        (merged as any)[key] = value
      }
    } else {
      // Always prefer draft value if it exists
      if (value !== undefined && value !== null) {
        (merged as any)[key] = value
      }
    }
  })

  return merged
}

// Reading time calculation
export function calculateReadingTime(text: string): number {
  if (!text || text.trim() === '') return 0

  const koreanRegex = /[가-힣]/g
  const englishRegex = /[a-zA-Z]/g

  const koreanChars = (text.match(koreanRegex) || []).length
  const englishChars = (text.match(englishRegex) || []).length

  // Average reading speed: 200 Korean chars per minute, 200 English words per minute
  const koreanTime = koreanChars / 200
  const englishTime = englishChars / (200 * 5) // Assuming 5 chars per word

  return Math.max(1, Math.ceil(koreanTime + englishTime))
}

// Text truncation
export function truncateText(
  text: string,
  maxLength: number,
  options: { ellipsis?: string } = {}
): string {
  const { ellipsis = '...' } = options

  if (text.length <= maxLength) return text

  // Try to break at word boundary
  const truncated = text.substring(0, maxLength - ellipsis.length)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + ellipsis
  }

  return truncated + ellipsis
}

// Whitespace normalization
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
    .trim()
}

// Image validation
export function validateImageDimensions(
  file: File,
  constraints: {
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
  }
): Promise<{ isValid: boolean; width?: number; height?: number; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image()

    img.addEventListener('load', () => {
      const { width, height } = img
      const { minWidth, maxWidth, minHeight, maxHeight } = constraints

      if (minWidth && width < minWidth) {
        resolve({ isValid: false, width, height, error: `이미지 너비가 너무 작습니다 (최소: ${minWidth}px)` })
        return
      }

      if (maxWidth && width > maxWidth) {
        resolve({ isValid: false, width, height, error: `이미지 너비가 너무 큽니다 (최대: ${maxWidth}px)` })
        return
      }

      if (minHeight && height < minHeight) {
        resolve({ isValid: false, width, height, error: `이미지 높이가 너무 작습니다 (최소: ${minHeight}px)` })
        return
      }

      if (maxHeight && height > maxHeight) {
        resolve({ isValid: false, width, height, error: `이미지 높이가 너무 큽니다 (최대: ${maxHeight}px)` })
        return
      }

      resolve({ isValid: true, width, height })
    })

    img.addEventListener('error', () => {
      resolve({ isValid: false, error: 'Cannot load image' })
    })

    img.src = URL.createObjectURL(file)
  })
}

// Thumbnail generation
export function generateImageThumbnail(
  file: File,
  options: {
    width: number
    height: number
    maintainAspectRatio?: boolean
    quality?: number
  }
): Promise<Blob> {
  const { width, height, maintainAspectRatio = false, quality = 0.8 } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    img.addEventListener('load', () => {
      let { width: imgWidth, height: imgHeight } = img

      if (maintainAspectRatio) {
        const ratio = Math.min(width / imgWidth, height / imgHeight)
        imgWidth *= ratio
        imgHeight *= ratio
      }

      canvas.width = maintainAspectRatio ? imgWidth : width
      canvas.height = maintainAspectRatio ? imgHeight : height

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('썸네일 Creation failed'))
        }
      }, 'image/jpeg', quality)
    })

    img.addEventListener('error', () => reject(new Error('Image loading failed')))
    img.src = URL.createObjectURL(file)
  })
}

// Image compression
export function compressImageFile(
  file: File,
  options: {
    quality?: number
    maxSizeMB?: number
    outputFormat?: 'jpeg' | 'webp'
  }
): Promise<Blob> {
  const { quality = 0.7, maxSizeMB, outputFormat = 'jpeg' } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    img.addEventListener('load', () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const mimeType = outputFormat === 'webp' ? 'image/webp' : 'image/jpeg'

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Compression failed'))
          return
        }

        // Check if size constraint is met
        if (maxSizeMB && blob.size > maxSizeMB * 1024 * 1024) {
          // Recursively compress with lower quality
          const newQuality = Math.max(0.1, quality - 0.1)
          compressImageFile(file, { ...options, quality: newQuality }).then(resolve).catch(reject)
          return
        }

        resolve(blob)
      }, mimeType, quality)
    })

    img.addEventListener('error', () => reject(new Error('Image loading failed')))
    img.src = URL.createObjectURL(file)
  })
}

// CAPTCHA functions removed - authentication required for all actions
interface CaptchaChallenge {
  type: 'math' | 'text' | 'image'
  question: string
  answer: string | number
  token: string
  imageData?: string
}

const captchaStore = new Map<string, { answer: string | number; timestamp: number }>()

// Removed CAPTCHA functions - authentication required
/*
export function createCaptchaChallenge(type: 'math' | 'text' | 'image' = 'math'): CaptchaChallenge {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36)

  if (type === 'math') {
    const a = Math.floor(Math.random() * 10) + 1
    const b = Math.floor(Math.random() * 10) + 1
    const answer = a + b

    captchaStore.set(token, { answer, timestamp: Date.now() })

    return {
      type,
      question: `${a} + ${b} = ?`,
      answer,
      token
    }
  }

  if (type === 'text') {
    const words = ['안녕', '세계', '한국', 'user', '검증']
    const word = words[Math.floor(Math.random() * words.length)]

    captchaStore.set(token, { answer: word, timestamp: Date.now() })

    return {
      type,
      question: `다음 단어를 입력하세요: ${word}`,
      answer: word,
      token
    }
  }

  // Image CAPTCHA (mock)
  const code = Math.floor(Math.random() * 9000) + 1000
  captchaStore.set(token, { answer: code.toString(), timestamp: Date.now() })

  return {
    type,
    question: '이미지의 숫자를 입력하세요',
    answer: code.toString(),
    token,
    imageData: `data:image/png;base64,mock-captcha-${code}`
  }
}

export function verifyCaptchaResponse(
  token: string,
  userAnswer: string
): { isValid: boolean; error: string | null } {
  const stored = captchaStore.get(token)

  if (!stored) {
    return { isValid: false, error: 'Invalid token' }
  }

  // Check expiry (5 minutes)
  if (Date.now() - stored.timestamp > 5 * 60 * 1000) {
    captchaStore.delete(token)
    return { isValid: false, error: 'Expired token' }
  }

  const isValid = stored.answer.toString().toLowerCase() === userAnswer.toLowerCase()

  if (isValid) {
    captchaStore.delete(token)
    return { isValid: true, error: null }
  }

  return { isValid: false, error: 'Wrong answer' }
}
*/