// T021: Implementation of validation rules
// Following TDD GREEN phase - making tests pass

import type {
  ValidationResult,
  AsyncValidationResult,
  ValidationRule,
  AsyncValidationRule,
  FieldValidationConfig,
  LengthValidationOptions,
  PatternValidationOptions,
  FileValidationOptions
} from './types'

export function createRequiredRule<T>(message = 'required 필드입니다'): ValidationRule<T> {
  return {
    name: 'required',
    message,
    code: 'REQUIRED',
    validator: (value: T): ValidationResult<T> => {
      let isEmpty = false

      if (value === null || value === undefined) {
        isEmpty = true
      } else if (typeof value === 'string') {
        isEmpty = value.trim() === ''
      } else if (Array.isArray(value)) {
        isEmpty = value.length === 0
      } else if (typeof value === 'boolean') {
        isEmpty = !value
      }

      if (isEmpty) {
        return { isValid: false, error: message, code: 'REQUIRED' }
      }

      return { isValid: true, value }
    }
  }
}

export function createLengthRule(
  options: LengthValidationOptions,
  customMessage?: string
): ValidationRule<string> {
  const { min, max } = options

  return {
    name: 'length',
    message: customMessage || `길이는 ${min ? `${min}자 이상` : ''}${min && max ? ', ' : ''}${max ? `${max}자 이하` : ''}여야 합니다`,
    code: 'LENGTH',
    validator: (value: string): ValidationResult<string> => {
      const length = value ? value.length : 0

      if (min !== undefined && length < min) {
        return {
          isValid: false,
          error: customMessage || `최소 ${min}자 이상이어야 합니다`,
          code: 'MIN_LENGTH'
        }
      }

      if (max !== undefined && length > max) {
        return {
          isValid: false,
          error: customMessage || `최대 ${max}자까지 가능합니다`,
          code: 'MAX_LENGTH'
        }
      }

      return { isValid: true, value }
    }
  }
}

export function createPatternRule(
  pattern: RegExp,
  message = '올바른 형식이 아닙니다'
): ValidationRule<string> {
  return {
    name: 'pattern',
    message,
    code: 'PATTERN',
    validator: (value: string): ValidationResult<string> => {
      if (!value) {
        return { isValid: true, value }
      }

      if (!pattern.test(value)) {
        return { isValid: false, error: message, code: 'PATTERN' }
      }

      return { isValid: true, value }
    }
  }
}

export function createCustomRule<T>(
  name: string,
  validator: (value: T) => ValidationResult<T>,
  message: string,
  code?: string
): ValidationRule<T> {
  return {
    name,
    message,
    code: code || 'CUSTOM',
    validator
  }
}

export function createAsyncRule<T>(
  name: string,
  validator: (value: T) => AsyncValidationResult<T>,
  message: string,
  options?: { timeout?: number }
): AsyncValidationRule<T> {
  const { timeout = 5000 } = options || {}

  const wrappedValidator = async (value: T): AsyncValidationResult<T> => {
    const timeoutPromise = new Promise<ValidationResult<T>>((_, reject) => {
      setTimeout(() => reject(new Error('시간 초과')), timeout)
    })

    try {
      return await Promise.race([validator(value), timeoutPromise])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '검증 error'
      return {
        isValid: false,
        error: errorMessage.includes('시간 초과') ? '검증 시간 초과' : errorMessage,
        code: errorMessage.includes('시간 초과') ? 'TIMEOUT' : 'VALIDATION_ERROR'
      }
    }
  }

  return {
    name,
    message,
    code: 'ASYNC',
    validator: wrappedValidator
  }
}

export function createFileValidationRule(
  options: FileValidationOptions
): ValidationRule<File[]> {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    maxCount = 10,
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    message = '파일 검증 error'
  } = options

  return {
    name: 'file',
    message,
    code: 'FILE_VALIDATION',
    validator: (files: File[]): ValidationResult<File[]> => {
      // Check file count
      if (files.length > maxCount) {
        return {
          isValid: false,
          error: `최대 ${maxCount}개의 파일만 업로드 가능합니다`,
          code: 'TOO_MANY_FILES'
        }
      }

      // Check each file
      for (const file of files) {
        // Check file type
        if (!allowedTypes.includes(file.type)) {
          return {
            isValid: false,
            error: `지원하지 않는 파일 형식입니다: ${file.type}`,
            code: 'INVALID_FILE_TYPE'
          }
        }

        // Check file size
        if (file.size > maxSize) {
          const sizeMB = Math.round(file.size / 1024 / 1024 * 100) / 100
          const maxSizeMB = Math.round(maxSize / 1024 / 1024 * 100) / 100
          return {
            isValid: false,
            error: `파일 크기가 너무 큽니다: ${sizeMB}MB (최대: ${maxSizeMB}MB)`,
            code: 'FILE_TOO_LARGE'
          }
        }
      }

      return { isValid: true, value: files }
    }
  }
}

export function createEmailRule(message = '올바른 이메일 주소를 입력해주세요'): ValidationRule<string> {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return {
    name: 'email',
    message,
    code: 'INVALID_EMAIL',
    validator: (value: string): ValidationResult<string> => {
      if (!value) {
        return { isValid: true, value }
      }

      if (!emailPattern.test(value)) {
        return { isValid: false, error: message, code: 'INVALID_EMAIL' }
      }

      return { isValid: true, value }
    }
  }
}

export function createUrlRule(
  options: { allowedProtocols?: string[] } = {},
  message = '올바른 URL을 입력해주세요'
): ValidationRule<string> {
  const { allowedProtocols = ['http', 'https'] } = options

  return {
    name: 'url',
    message,
    code: 'INVALID_URL',
    validator: (value: string): ValidationResult<string> => {
      if (!value) {
        return { isValid: true, value }
      }

      try {
        const url = new URL(value)
        const protocol = url.protocol.replace(':', '')

        if (!allowedProtocols.includes(protocol)) {
          return {
            isValid: false,
            error: `허용되지 않는 프로토콜입니다: ${protocol}`,
            code: 'INVALID_PROTOCOL'
          }
        }

        return { isValid: true, value }
      } catch {
        return { isValid: false, error: message, code: 'INVALID_URL' }
      }
    }
  }
}

export function createKoreanTextRule(
  options: {
    requireKorean?: boolean
    minKoreanRatio?: number
    checkProfanity?: boolean
  } = {}
): ValidationRule<string> {
  const { requireKorean = false, minKoreanRatio, checkProfanity = false } = options

  // Simple profanity list for demo
  const profanityWords = ['욕설1', '비속어2', '부적절한표현']

  return {
    name: 'korean-text',
    message: '한글 텍스트 검증',
    code: 'KOREAN_TEXT',
    validator: (value: string): ValidationResult<string> => {
      if (!value) {
        return { isValid: true, value }
      }

      const koreanRegex = /[가-힣]/g
      const koreanMatches = value.match(koreanRegex)
      const koreanCount = koreanMatches ? koreanMatches.length : 0
      const totalCount = value.length

      // Check if Korean text is required
      if (requireKorean && koreanCount === 0) {
        return {
          isValid: false,
          error: '한글이 포함되어야 합니다',
          code: 'NO_KOREAN_TEXT'
        }
      }

      // Check Korean ratio
      if (minKoreanRatio && totalCount > 0) {
        const ratio = koreanCount / totalCount
        if (ratio < minKoreanRatio) {
          return {
            isValid: false,
            error: `한글 비율이 ${Math.round(minKoreanRatio * 100)}% 이상이어야 합니다`,
            code: 'LOW_KOREAN_RATIO'
          }
        }
      }

      // Check profanity
      if (checkProfanity) {
        const lowerValue = value.toLowerCase()
        for (const word of profanityWords) {
          if (lowerValue.includes(word)) {
            return {
              isValid: false,
              error: '부적절한 내용이 포함되어 있습니다',
              code: 'PROFANITY_DETECTED'
            }
          }
        }
      }

      return { isValid: true, value }
    }
  }
}

export function createReservedWordRule(
  reservedWords: string[],
  options: { caseSensitive?: boolean } = {}
): ValidationRule<string> {
  const { caseSensitive = false } = options

  return {
    name: 'reserved-word',
    message: '예약된 단어는 사용할 수 없습니다',
    code: 'RESERVED_WORD',
    validator: (value: string): ValidationResult<string> => {
      if (!value) {
        return { isValid: true, value }
      }

      const checkValue = caseSensitive ? value : value.toLowerCase()
      const reserved = reservedWords.map(word => caseSensitive ? word : word.toLowerCase())

      if (reserved.includes(checkValue)) {
        return {
          isValid: false,
          error: '예약된 단어는 사용할 수 없습니다',
          code: 'RESERVED_WORD'
        }
      }

      return { isValid: true, value }
    }
  }
}

export function createCaptchaRule(
  options: { verifyToken?: boolean } = {}
): ValidationRule<boolean> | AsyncValidationRule<{ token: string; verified: boolean }> {
  const { verifyToken = false } = options

  if (verifyToken) {
    return {
      name: 'captcha-async',
      message: 'CAPTCHA 검증이 필요합니다',
      code: 'CAPTCHA_REQUIRED',
      validator: async (value: { token: string; verified: boolean }): AsyncValidationResult<{ token: string; verified: boolean }> => {
        if (!value.verified) {
          return {
            isValid: false,
            error: 'CAPTCHA authentication이 필요합니다',
            code: 'CAPTCHA_REQUIRED'
          }
        }

        try {
          const response = await fetch('/api/captcha/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: value.token })
          })

          const result = await response.json()

          if (!result.valid) {
            return {
              isValid: false,
              error: 'CAPTCHA authentication에 failed했습니다',
              code: 'CAPTCHA_INVALID'
            }
          }

          return { isValid: true, value }
        } catch {
          return {
            isValid: false,
            error: 'CAPTCHA 검증 중 error가 발생했습니다',
            code: 'CAPTCHA_ERROR'
          }
        }
      }
    }
  }

  return {
    name: 'captcha',
    message: 'CAPTCHA authentication이 필요합니다',
    code: 'CAPTCHA_REQUIRED',
    validator: (value: boolean): ValidationResult<boolean> => {
      if (!value) {
        return {
          isValid: false,
          error: 'CAPTCHA authentication이 필요합니다',
          code: 'CAPTCHA_REQUIRED'
        }
      }

      return { isValid: true, value }
    }
  } as ValidationRule<boolean>
}

export function composeRules<T>(
  rules: ValidationRule<T>[],
  options: { stopOnFirstError?: boolean } = {}
) {
  const { stopOnFirstError = false } = options

  return (value: T): ValidationResult<T> & { errors?: Array<{ error: string; code: string }> } => {
    const errors: Array<{ error: string; code: string }> = []
    let isValid = true

    for (const rule of rules) {
      const result = rule.validator(value)

      if (!result.isValid) {
        isValid = false
        errors.push({
          error: result.error || rule.message,
          code: result.code || rule.code
        })

        if (stopOnFirstError) {
          break
        }
      }
    }

    if (isValid) {
      return { isValid: true, value }
    }

    return { isValid: false, errors }
  }
}

export function validateField<T>(
  value: T,
  config: FieldValidationConfig<T>
): ValidationResult<T> & { errors?: Array<{ error: string; code: string }> } {
  const allRules: ValidationRule<T>[] = []

  // Add required rule if needed
  if (config.required) {
    allRules.push(createRequiredRule<T>() as ValidationRule<T>)
  }

  // Add configured rules
  allRules.push(...config.rules)

  const composedValidator = composeRules(allRules)
  return composedValidator(value)
}

export async function validateFieldAsync<T>(
  value: T,
  config: FieldValidationConfig<T>
): AsyncValidationResult<T & { errors?: Array<{ error: string; code: string }> }> {
  // First run synchronous validation
  const syncResult = validateField(value, config)
  if (!syncResult.isValid) {
    return Promise.resolve(syncResult as unknown as ValidationResult<T & { errors?: Array<{ error: string; code: string }> }>)
  }

  // Then run async validation if configured
  if (config.asyncRules && config.asyncRules.length > 0) {
    const asyncErrors: Array<{ error: string; code: string }> = []

    for (const rule of config.asyncRules) {
      const result = await rule.validator(value)
      if (!result.isValid) {
        asyncErrors.push({
          error: result.error || rule.message,
          code: result.code || rule.code
        })
      }
    }

    if (asyncErrors.length > 0) {
      return {
        isValid: false,
        error: asyncErrors.map(e => e.error).join(', '),
        code: asyncErrors[0]?.code || 'VALIDATION_ERROR'
      }
    }
  }

  return { isValid: true, value: value as T & { errors?: Array<{ error: string; code: string }> } }
}

export function createValidationSchema<T extends Record<string, any>>(
  config: Record<keyof T, FieldValidationConfig>
): Record<keyof T, FieldValidationConfig> {
  return config
}

export function validateSchema<T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, FieldValidationConfig>
): {
  isValid: boolean
  fieldErrors: Partial<Record<keyof T, string>>
  errors: string[]
} {
  const fieldErrors: Partial<Record<keyof T, string>> = {}
  const errors: string[] = []

  for (const [fieldName, fieldConfig] of Object.entries(schema)) {
    const fieldValue = data[fieldName as keyof T]
    const result = validateField(fieldValue, fieldConfig as FieldValidationConfig)

    if (!result.isValid) {
      if (result.errors && result.errors.length > 0) {
        fieldErrors[fieldName as keyof T] = result.errors[0].error
        errors.push(`${fieldName}: ${result.errors[0].error}`)
      }
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    errors
  }
}