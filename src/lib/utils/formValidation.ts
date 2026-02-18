// Form Validation Utilities for Post Writing System
import DOMPurify from 'isomorphic-dompurify'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings?: string[]
  sanitizedContent?: string
}

export interface ValidationError {
  code: string
  message: string
  field: string
  fileName?: string
}

export interface ValidationRules {
  title: {
    min_length: number
    max_length: number
    required: boolean
    pattern?: string
  }
  content: {
    max_length: number
    required: boolean
  }
  images: {
    max_count: number
    max_size: number
    allowed_types: string[]
  }
}

// 기본 검증 규칙
const DEFAULT_VALIDATION_RULES: ValidationRules = {
  title: {
    min_length: 5,
    max_length: 300,
    required: true,
    pattern: undefined
  },
  content: {
    max_length: 10000,
    required: false
  },
  images: {
    max_count: 10,
    max_size: 10485760, // 10MB
    allowed_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  }
}

// 스팸 패턴 감지용 키워드
const SPAM_PATTERNS = [
  /buy now/gi,
  /click here/gi,
  /amazing offer/gi,
  /free money/gi,
  /guaranteed/gi,
  /!!!+/g, // 연속된 느낌표
  /\b[A-Z]{5,}\b/g, // 연속된 대문자
  /bit\.ly|tinyurl\.com|goo\.gl/gi // 단축 URL (의심스러운 경우)
]

// 금지된 HTML 태그
const FORBIDDEN_HTML_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'button',
  'style', 'link', 'meta', 'base', 'head', 'html', 'body'
]

/**
 * post 제목 검증
 */
export function validatePostTitle(title: string, customRules?: Partial<ValidationRules['title']>): ValidationResult {
  const errors: ValidationError[] = []
  const rules = { ...DEFAULT_VALIDATION_RULES.title, ...customRules }

  // 빈 문자열 및 공백 확인
  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    errors.push({
      code: 'TITLE_REQUIRED',
      message: 'Title is required',
      field: 'title'
    })
    return { valid: false, errors }
  }

  // 길이 검증
  if (trimmedTitle.length < rules.min_length) {
    errors.push({
      code: 'TITLE_TOO_SHORT',
      message: `Title must be at least ${rules.min_length} characters long`,
      field: 'title'
    })
  }

  if (trimmedTitle.length > rules.max_length) {
    errors.push({
      code: 'TITLE_TOO_LONG',
      message: `Title cannot exceed ${rules.max_length} characters`,
      field: 'title'
    })
  }

  // 금지된 문자 확인
  if (containsForbiddenCharacters(trimmedTitle)) {
    errors.push({
      code: 'TITLE_INVALID_CHARACTERS',
      message: 'Title contains forbidden characters',
      field: 'title'
    })
  }

  // 패턴 검증 (설정된 경우)
  if (rules.pattern) {
    const pattern = new RegExp(rules.pattern)
    if (!pattern.test(trimmedTitle)) {
      errors.push({
        code: 'TITLE_PATTERN_MISMATCH',
        message: 'Title does not match the required format',
        field: 'title'
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * post 내용 검증
 */
export function validatePostContent(content: string, customRules?: Partial<ValidationRules['content']>): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []
  const rules = { ...DEFAULT_VALIDATION_RULES.content, ...customRules }

  // 내용은 선택사항이므로 빈 문자열 허용
  if (!content || !content.trim()) {
    return {
      valid: true,
      errors: [],
      warnings: rules.required ? ['Please enter content'] : []
    }
  }

  const trimmedContent = content.trim()

  // 길이 검증
  if (trimmedContent.length > rules.max_length) {
    errors.push({
      code: 'CONTENT_TOO_LONG',
      message: `내용은 ${rules.max_length.toLocaleString()}자를 초과할 수 없습니다`,
      field: 'content'
    })
  }

  // 스팸 패턴 감지
  if (detectSpamPatterns(trimmedContent)) {
    errors.push({
      code: 'CONTENT_SPAM_DETECTED',
      message: 'Spam content detected',
      field: 'content'
    })
  }

  // HTML 정리 및 검증
  let sanitizedContent: string | undefined
  try {
    sanitizedContent = sanitizeHtmlContent(trimmedContent)
  } catch (error) {
    errors.push({
      code: 'CONTENT_SANITIZATION_FAILED',
      message: 'Content contains invalid HTML',
      field: 'content'
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitizedContent
  }
}

/**
 * post 플레어 검증
 */
export function validatePostFlair(flair: string, availableFlairs: string[] | null): ValidationResult {
  const errors: ValidationError[] = []

  // 빈 플레어는 허용 (선택사항)
  if (!flair || !flair.trim()) {
    return { valid: true, errors }
  }

  // 사용 가능한 플레어 목록이 없는 경우
  if (!availableFlairs) {
    errors.push({
      code: 'FLAIR_NOT_AVAILABLE',
      message: 'Flair is not available in this channel',
      field: 'flair'
    })
    return { valid: false, errors }
  }

  // 플레어 유효성 검증
  if (!availableFlairs.includes(flair.trim())) {
    errors.push({
      code: 'INVALID_FLAIR',
      message: 'Please select a valid flair',
      field: 'flair'
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 이미지 업로드 검증
 */
export function validateImageUploads(images: File[], customRules?: Partial<ValidationRules['images']>): ValidationResult {
  const errors: ValidationError[] = []
  const rules = { ...DEFAULT_VALIDATION_RULES.images, ...customRules }

  // 빈 배열은 허용 (이미지는 선택사항)
  if (!images || images.length === 0) {
    return { valid: true, errors }
  }

  // 이미지 개수 확인
  if (images.length > rules.max_count) {
    errors.push({
      code: 'TOO_MANY_IMAGES',
      message: `이미지는 최대 ${rules.max_count}개까지 업로드할 수 있습니다`,
      field: 'images'
    })
  }

  // 각 이미지 검증
  images.forEach((file, index) => {
    // 파일 크기 확인
    if (file.size > rules.max_size) {
      errors.push({
        code: 'IMAGE_TOO_LARGE',
        message: `이미지 크기는 ${(rules.max_size / (1024 * 1024)).toFixed(0)}MB를 초과할 수 없습니다`,
        field: 'images',
        fileName: file.name
      })
    }

    // 파일 타입 확인
    if (!rules.allowed_types.includes(file.type)) {
      errors.push({
        code: 'INVALID_IMAGE_TYPE',
        message: 'Unsupported image format',
        field: 'images',
        fileName: file.name
      })
    }

    // 파일명 검증
    if (!isValidFileName(file.name)) {
      errors.push({
        code: 'INVALID_FILE_NAME',
        message: 'Invalid file name',
        field: 'images',
        fileName: file.name
      })
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 전체 post 폼 검증
 */
export function validatePostForm(
  formData: {
    title: string
    content: string
    channel_name?: string
    flair?: string
    images?: File[]
  },
  availableFlairs?: string[],
  customRules?: Partial<ValidationRules>
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // 제목 검증
  const titleValidation = validatePostTitle(formData.title, customRules?.title)
  errors.push(...titleValidation.errors)

  // 내용 검증
  const contentValidation = validatePostContent(formData.content, customRules?.content)
  errors.push(...contentValidation.errors)
  if (contentValidation.warnings) {
    warnings.push(...contentValidation.warnings)
  }

  // channel 검증
  if (!formData.channel_name || !formData.channel_name.trim()) {
    errors.push({
      code: 'CHANNEL_REQUIRED',
      message: 'You must select a channel',
      field: 'channel_name'
    })
  }

  // 플레어 검증
  if (formData.flair) {
    const flairValidation = validatePostFlair(formData.flair, availableFlairs || null)
    errors.push(...flairValidation.errors)
  } else if (availableFlairs && availableFlairs.length > 0) {
    warnings.push('Selecting a flair makes posts easier to find.')
  }

  // 이미지 검증
  if (formData.images && formData.images.length > 0) {
    const imageValidation = validateImageUploads(formData.images, customRules?.images)
    errors.push(...imageValidation.errors)
  }

  // 내용 관련 경고
  if (!formData.content || !formData.content.trim()) {
    warnings.push('Content is empty. Please add more information.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 폼 데이터 정리
 */
export function sanitizeFormData(formData: {
  title?: string | null
  content?: string | null
  channel_name?: string | null
  flair?: string | null
}): {
  title: string
  content: string
  channel_name: string
  flair?: string
} {
  return {
    title: sanitizeText(formData.title || ''),
    content: sanitizeHtmlContent(formData.content || ''),
    channel_name: sanitizeText(formData.channel_name || ''),
    flair: formData.flair ? sanitizeText(formData.flair) : undefined
  }
}

/**
 * CAPTCHA 검증
 */
export function validateCaptcha(userAnswer: string, expectedAnswer: string): ValidationResult {
  const errors: ValidationError[] = []

  if (!userAnswer || !userAnswer.trim()) {
    errors.push({
      code: 'CAPTCHA_REQUIRED',
      message: 'Please complete the CAPTCHA',
      field: 'captcha'
    })
    return { valid: false, errors }
  }

  // 숫자 비교 (문자열을 숫자로 변환하여 비교)
  const userNum = parseFloat(userAnswer.trim())
  const expectedNum = parseFloat(expectedAnswer.trim())

  if (!isNaN(userNum) && !isNaN(expectedNum)) {
    if (userNum !== expectedNum) {
      errors.push({
        code: 'CAPTCHA_INCORRECT',
        message: 'CAPTCHA answer is incorrect',
        field: 'captcha'
      })
    }
  } else {
    // 문자열 비교 (대소문자 구분 안함)
    if (userAnswer.trim().toLowerCase() !== expectedAnswer.trim().toLowerCase()) {
      errors.push({
        code: 'CAPTCHA_INCORRECT',
        message: 'CAPTCHA answer is incorrect',
        field: 'captcha'
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 검증 규칙 가져오기
 */
export function getValidationRules(channelSettings?: Partial<ValidationRules>): ValidationRules {
  return {
    title: { ...DEFAULT_VALIDATION_RULES.title, ...channelSettings?.title },
    content: { ...DEFAULT_VALIDATION_RULES.content, ...channelSettings?.content },
    images: { ...DEFAULT_VALIDATION_RULES.images, ...channelSettings?.images }
  }
}

// Helper Functions

/**
 * 금지된 문자 확인
 */
function containsForbiddenCharacters(text: string): boolean {
  // HTML 태그 감지
  const htmlTagPattern = /<[^>]+>/
  if (htmlTagPattern.test(text)) {
    return true
  }

  // 제어 문자 감지 (줄바꿈, 탭 제외)
  const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
  if (controlCharPattern.test(text)) {
    return true
  }

  return false
}

/**
 * 스팸 패턴 감지
 */
function detectSpamPatterns(text: string): boolean {
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return true
    }
  }

  // 연속된 같은 문자 (5개 이상)
  const repeatedCharPattern = /(.)\1{4,}/
  if (repeatedCharPattern.test(text)) {
    return true
  }

  // 과도한 이모지 사용
  const emojiPattern = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu
  const emojiMatches = text.match(emojiPattern)
  if (emojiMatches && emojiMatches.length > 10) {
    return true
  }

  return false
}

/**
 * HTML 내용 정리
 */
function sanitizeHtmlContent(html: string): string {
  // 기본 HTML 태그만 허용
  const allowedTags = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    'a', 'img'
  ]

  const allowedAttributes = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height']
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: Object.keys(allowedAttributes).reduce((acc, tag) => {
      return acc.concat(allowedAttributes[tag as keyof typeof allowedAttributes])
    }, [] as string[]),
    ALLOW_DATA_ATTR: false,
    FORBID_CONTENTS: FORBIDDEN_HTML_TAGS,
    FORBID_TAGS: FORBIDDEN_HTML_TAGS
  })
}

/**
 * 일반 텍스트 정리
 */
function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }).trim()
}

/**
 * 파일명 유효성 검증
 */
function isValidFileName(fileName: string): boolean {
  // 빈 파일명
  if (!fileName || !fileName.trim()) {
    return false
  }

  // 금지된 문자 (Windows/Linux/macOS 호환)
  const forbiddenChars = /[<>:"/\\|?*]/
  if (forbiddenChars.test(fileName)) {
    return false
  }

  // 예약된 이름 (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ]

  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '').toUpperCase()
  if (reservedNames.includes(nameWithoutExt)) {
    return false
  }

  // 길이 제한 (255자)
  if (fileName.length > 255) {
    return false
  }

  return true
}