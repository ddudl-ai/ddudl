// T017: Unit test for validation rules - TDD Phase
// This test MUST FAIL before implementation

import {
  createRequiredRule,
  createLengthRule,
  createPatternRule,
  createCustomRule,
  createAsyncRule,
  createFileValidationRule,
  createEmailRule,
  createUrlRule,
  createKoreanTextRule,
  createReservedWordRule,
  createCaptchaRule,
  composeRules,
  validateField,
  validateFieldAsync,
  createValidationSchema,
  validateSchema
} from '../rules'
import type {
  ValidationResult,
  AsyncValidationResult,
  FieldValidationConfig,
  ValidationRule,
  AsyncValidationRule
} from '../types'

describe('validation rules', () => {
  describe('createRequiredRule', () => {
    it('should create required validation rule', () => {
      const rule = createRequiredRule('필드는 필수입니다')

      expect(rule.name).toBe('required')
      expect(rule.code).toBe('REQUIRED')
      expect(rule.message).toBe('필드는 필수입니다')
    })

    it('should validate required string field', () => {
      const rule = createRequiredRule('필수 필드입니다')

      expect(rule.validator('')).toEqual({
        isValid: false,
        error: '필수 필드입니다',
        code: 'REQUIRED'
      })

      expect(rule.validator('   ')).toEqual({
        isValid: false,
        error: '필수 필드입니다',
        code: 'REQUIRED'
      })

      expect(rule.validator('valid')).toEqual({
        isValid: true,
        value: 'valid'
      })
    })

    it('should validate required array field', () => {
      const rule = createRequiredRule('배열이 필요합니다')

      expect(rule.validator([])).toEqual({
        isValid: false,
        error: '배열이 필요합니다',
        code: 'REQUIRED'
      })

      expect(rule.validator(['item'])).toEqual({
        isValid: true,
        value: ['item']
      })
    })

    it('should validate required boolean field', () => {
      const rule = createRequiredRule('확인이 필요합니다')

      expect(rule.validator(false)).toEqual({
        isValid: false,
        error: '확인이 필요합니다',
        code: 'REQUIRED'
      })

      expect(rule.validator(true)).toEqual({
        isValid: true,
        value: true
      })
    })
  })

  describe('createLengthRule', () => {
    it('should create length validation rule', () => {
      const rule = createLengthRule({ min: 5, max: 100 }, '5-100자 사이여야 합니다')

      expect(rule.name).toBe('length')
      expect(rule.code).toBe('LENGTH')
    })

    it('should validate minimum length', () => {
      const rule = createLengthRule({ min: 5 })

      expect(rule.validator('abc')).toEqual({
        isValid: false,
        error: expect.stringContaining('최소 5자'),
        code: 'MIN_LENGTH'
      })

      expect(rule.validator('valid input')).toEqual({
        isValid: true,
        value: 'valid input'
      })
    })

    it('should validate maximum length', () => {
      const rule = createLengthRule({ max: 10 })

      expect(rule.validator('this is too long')).toEqual({
        isValid: false,
        error: expect.stringContaining('최대 10자'),
        code: 'MAX_LENGTH'
      })

      expect(rule.validator('short')).toEqual({
        isValid: true,
        value: 'short'
      })
    })

    it('should validate both min and max length', () => {
      const rule = createLengthRule({ min: 3, max: 10 })

      expect(rule.validator('ab')).toEqual({
        isValid: false,
        error: expect.stringContaining('최소 3자'),
        code: 'MIN_LENGTH'
      })

      expect(rule.validator('this is way too long')).toEqual({
        isValid: false,
        error: expect.stringContaining('최대 10자'),
        code: 'MAX_LENGTH'
      })

      expect(rule.validator('perfect')).toEqual({
        isValid: true,
        value: 'perfect'
      })
    })

    it('should handle Korean character length correctly', () => {
      const rule = createLengthRule({ min: 2, max: 5 })

      expect(rule.validator('한')).toEqual({
        isValid: false,
        error: expect.stringContaining('최소'),
        code: 'MIN_LENGTH'
      })

      expect(rule.validator('한글테스트완료')).toEqual({
        isValid: false,
        error: expect.stringContaining('최대'),
        code: 'MAX_LENGTH'
      })

      expect(rule.validator('한글')).toEqual({
        isValid: true,
        value: '한글'
      })
    })
  })

  describe('createPatternRule', () => {
    it('should create pattern validation rule', () => {
      const rule = createPatternRule(/^[a-zA-Z]+$/, '영문자만 허용됩니다')

      expect(rule.name).toBe('pattern')
      expect(rule.code).toBe('PATTERN')
    })

    it('should validate against regex pattern', () => {
      const rule = createPatternRule(/^[a-zA-Z]+$/, '영문자만 허용됩니다')

      expect(rule.validator('123')).toEqual({
        isValid: false,
        error: '영문자만 허용됩니다',
        code: 'PATTERN'
      })

      expect(rule.validator('ValidText')).toEqual({
        isValid: true,
        value: 'ValidText'
      })
    })

    it('should validate Korean username pattern', () => {
      const rule = createPatternRule(/^[가-힣a-zA-Z][가-힣a-zA-Z0-9_]{2,19}$/, '올바른 User명 형식이 아닙니다')

      expect(rule.validator('1user')).toEqual({
        isValid: false,
        error: '올바른 User명 형식이 아닙니다',
        code: 'PATTERN'
      })

      expect(rule.validator('user@name')).toEqual({
        isValid: false,
        error: '올바른 User명 형식이 아닙니다',
        code: 'PATTERN'
      })

      expect(rule.validator('한글User')).toEqual({
        isValid: true,
        value: '한글User'
      })

      expect(rule.validator('englishUser')).toEqual({
        isValid: true,
        value: 'englishUser'
      })
    })

    it('should validate email pattern', () => {
      const rule = createPatternRule(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        '올바른 이메일 형식이 아닙니다'
      )

      expect(rule.validator('invalid.email')).toEqual({
        isValid: false,
        error: '올바른 이메일 형식이 아닙니다',
        code: 'PATTERN'
      })

      expect(rule.validator('user@example.com')).toEqual({
        isValid: true,
        value: 'user@example.com'
      })
    })
  })

  describe('createCustomRule', () => {
    it('should create custom validation rule', () => {
      const customValidator = (value: string) => {
        if (value === 'forbidden') {
          return { isValid: false, error: '금지된 값입니다', code: 'FORBIDDEN' }
        }
        return { isValid: true, value }
      }

      const rule = createCustomRule('custom', customValidator, '커스텀 규칙')

      expect(rule.name).toBe('custom')
      expect(rule.message).toBe('커스텀 규칙')
    })

    it('should execute custom validation logic', () => {
      const customValidator = (value: number) => {
        if (value % 2 !== 0) {
          return { isValid: false, error: '짝수만 허용됩니다', code: 'NOT_EVEN' }
        }
        return { isValid: true, value }
      }

      const rule = createCustomRule('even', customValidator, '짝수 검증')

      expect(rule.validator(3)).toEqual({
        isValid: false,
        error: '짝수만 허용됩니다',
        code: 'NOT_EVEN'
      })

      expect(rule.validator(4)).toEqual({
        isValid: true,
        value: 4
      })
    })
  })

  describe('createAsyncRule', () => {
    it('should create async validation rule', () => {
      const asyncValidator = async (value: string) => {
        return { isValid: true, value }
      }

      const rule = createAsyncRule('async', asyncValidator, '비동기 검증')

      expect(rule.name).toBe('async')
      expect(rule.message).toBe('비동기 검증')
    })

    it('should execute async validation', async () => {
      const asyncValidator = async (value: string): Promise<ValidationResult<string>> => {
        await new Promise(resolve => setTimeout(resolve, 100))

        if (value === 'taken') {
          return { isValid: false, error: '이미 사용 중입니다', code: 'ALREADY_TAKEN' }
        }
        return { isValid: true, value }
      }

      const rule = createAsyncRule('availability', asyncValidator, '사용 가능성 검증')

      const result1 = await rule.validator('taken')
      expect(result1).toEqual({
        isValid: false,
        error: '이미 사용 중입니다',
        code: 'ALREADY_TAKEN'
      })

      const result2 = await rule.validator('available')
      expect(result2).toEqual({
        isValid: true,
        value: 'available'
      })
    })

    it('should handle async validation timeout', async () => {
      const asyncValidator = async (value: string) => {
        await new Promise(resolve => setTimeout(resolve, 10000))
        return { isValid: true, value }
      }

      const rule = createAsyncRule('slow', asyncValidator, '느린 검증', { timeout: 1000 })

      const result = await rule.validator('test')
      expect(result).toEqual({
        isValid: false,
        error: expect.stringContaining('시간 초과'),
        code: 'TIMEOUT'
      })
    })
  })

  describe('createFileValidationRule', () => {
    it('should validate file type', () => {
      const rule = createFileValidationRule({
        allowedTypes: ['image/jpeg', 'image/png'],
        maxSize: 1024 * 1024 // 1MB
      })

      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      expect(rule.validator([invalidFile])).toEqual({
        isValid: false,
        error: expect.stringContaining('지원하지 않는 파일 형식'),
        code: 'INVALID_FILE_TYPE'
      })

      expect(rule.validator([validFile])).toEqual({
        isValid: true,
        value: [validFile]
      })
    })

    it('should validate file size', () => {
      const rule = createFileValidationRule({
        maxSize: 1024, // 1KB
        allowedTypes: ['image/jpeg']
      })

      const largeFile = new File([new ArrayBuffer(2048)], 'large.jpg', { type: 'image/jpeg' })
      const smallFile = new File([new ArrayBuffer(512)], 'small.jpg', { type: 'image/jpeg' })

      expect(rule.validator([largeFile])).toEqual({
        isValid: false,
        error: expect.stringContaining('파일 크기'),
        code: 'FILE_TOO_LARGE'
      })

      expect(rule.validator([smallFile])).toEqual({
        isValid: true,
        value: [smallFile]
      })
    })

    it('should validate file count', () => {
      const rule = createFileValidationRule({
        maxCount: 2,
        allowedTypes: ['image/jpeg']
      })

      const files = [
        new File(['1'], '1.jpg', { type: 'image/jpeg' }),
        new File(['2'], '2.jpg', { type: 'image/jpeg' }),
        new File(['3'], '3.jpg', { type: 'image/jpeg' })
      ]

      expect(rule.validator(files)).toEqual({
        isValid: false,
        error: expect.stringContaining('최대 2개'),
        code: 'TOO_MANY_FILES'
      })

      expect(rule.validator(files.slice(0, 2))).toEqual({
        isValid: true,
        value: files.slice(0, 2)
      })
    })
  })

  describe('createEmailRule', () => {
    it('should validate email addresses', () => {
      const rule = createEmailRule()

      const invalidEmails = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid@.com',
        'invalid@com',
        'invalid..email@example.com'
      ]

      const validEmails = [
        'user@example.com',
        'test.email+tag@example.co.kr',
        'user123@sub.domain.com'
      ]

      invalidEmails.forEach(email => {
        const result = rule.validator(email)
        expect(result.isValid).toBe(false)
        expect(result.code).toBe('INVALID_EMAIL')
      })

      validEmails.forEach(email => {
        const result = rule.validator(email)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('createUrlRule', () => {
    it('should validate URLs', () => {
      const rule = createUrlRule()

      const invalidUrls = [
        'not-a-url',
        'http://',
        'https://',
        'ftp://example.com',
        'javascript:alert(1)'
      ]

      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://sub.domain.com/path?query=1#hash',
        'https://한글도메인.kr'
      ]

      invalidUrls.forEach(url => {
        const result = rule.validator(url)
        expect(result.isValid).toBe(false)
        expect(result.code).toBe('INVALID_URL')
      })

      validUrls.forEach(url => {
        const result = rule.validator(url)
        expect(result.isValid).toBe(true)
      })
    })

    it('should allow custom URL protocols', () => {
      const rule = createUrlRule({ allowedProtocols: ['https', 'ftp'] })

      expect(rule.validator('http://example.com')).toEqual({
        isValid: false,
        error: expect.stringContaining('허용되지 않는'),
        code: 'INVALID_PROTOCOL'
      })

      expect(rule.validator('ftp://example.com')).toEqual({
        isValid: true,
        value: 'ftp://example.com'
      })
    })
  })

  describe('createKoreanTextRule', () => {
    it('should validate Korean text content', () => {
      const rule = createKoreanTextRule({ requireKorean: true })

      expect(rule.validator('English only text')).toEqual({
        isValid: false,
        error: expect.stringContaining('한글'),
        code: 'NO_KOREAN_TEXT'
      })

      expect(rule.validator('한글이 포함된 텍스트')).toEqual({
        isValid: true,
        value: '한글이 포함된 텍스트'
      })

      expect(rule.validator('Mixed 한글 and English')).toEqual({
        isValid: true,
        value: 'Mixed 한글 and English'
      })
    })

    it('should validate Korean text ratio', () => {
      const rule = createKoreanTextRule({ minKoreanRatio: 0.5 })

      expect(rule.validator('English 한')).toEqual({
        isValid: false,
        error: expect.stringContaining('한글 비율'),
        code: 'LOW_KOREAN_RATIO'
      })

      expect(rule.validator('한글이 더 많은 텍스트 English')).toEqual({
        isValid: true,
        value: '한글이 더 많은 텍스트 English'
      })
    })

    it('should detect inappropriate Korean content', () => {
      const rule = createKoreanTextRule({ checkProfanity: true })

      const profanityWords = ['욕설1', '비속어2', '부적절한표현']

      profanityWords.forEach(word => {
        const result = rule.validator(`일반 텍스트 ${word} 추가 텍스트`)
        expect(result.isValid).toBe(false)
        expect(result.code).toBe('PROFANITY_DETECTED')
      })

      expect(rule.validator('깨끗한 한글 텍스트입니다')).toEqual({
        isValid: true,
        value: '깨끗한 한글 텍스트입니다'
      })
    })
  })

  describe('createReservedWordRule', () => {
    it('should validate against reserved words', () => {
      const reservedWords = ['admin', 'moderator', 'system', 'null', 'undefined']
      const rule = createReservedWordRule(reservedWords)

      reservedWords.forEach(word => {
        expect(rule.validator(word)).toEqual({
          isValid: false,
          error: expect.stringContaining('예약된'),
          code: 'RESERVED_WORD'
        })

        expect(rule.validator(word.toUpperCase())).toEqual({
          isValid: false,
          error: expect.stringContaining('예약된'),
          code: 'RESERVED_WORD'
        })
      })

      expect(rule.validator('normaluser')).toEqual({
        isValid: true,
        value: 'normaluser'
      })
    })

    it('should support case-sensitive reserved words', () => {
      const rule = createReservedWordRule(['Admin'], { caseSensitive: true })

      expect(rule.validator('admin')).toEqual({
        isValid: true,
        value: 'admin'
      })

      expect(rule.validator('Admin')).toEqual({
        isValid: false,
        error: expect.stringContaining('예약된'),
        code: 'RESERVED_WORD'
      })
    })
  })

  describe('createCaptchaRule', () => {
    it('should validate captcha response', () => {
      const rule = createCaptchaRule()

      expect(rule.validator(false)).toEqual({
        isValid: false,
        error: expect.stringContaining('CAPTCHA'),
        code: 'CAPTCHA_REQUIRED'
      })

      expect(rule.validator(true)).toEqual({
        isValid: true,
        value: true
      })
    })

    it('should validate captcha with token verification', async () => {
      const asyncRule = createCaptchaRule({ verifyToken: true })

      // Mock token verification
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: false })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true })
        })

      const result1 = await asyncRule.validator({ token: 'invalid-token', verified: true })
      expect(result1.isValid).toBe(false)

      const result2 = await asyncRule.validator({ token: 'valid-token', verified: true })
      expect(result2.isValid).toBe(true)
    })
  })

  describe('composeRules', () => {
    it('should compose multiple validation rules', () => {
      const rules = [
        createRequiredRule('필수입니다'),
        createLengthRule({ min: 5, max: 20 })
      ]

      const composedValidator = composeRules(rules)

      expect(composedValidator('')).toEqual({
        isValid: false,
        errors: [{ error: '필수입니다', code: 'REQUIRED' }]
      })

      expect(composedValidator('abc')).toEqual({
        isValid: false,
        errors: [{ error: expect.stringContaining('최소'), code: 'MIN_LENGTH' }]
      })

      expect(composedValidator('perfect length')).toEqual({
        isValid: true,
        value: 'perfect length'
      })
    })

    it('should stop on first error when configured', () => {
      const rules = [
        createRequiredRule('필수입니다'),
        createLengthRule({ min: 10 })
      ]

      const composedValidator = composeRules(rules, { stopOnFirstError: true })

      const result = composedValidator('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('REQUIRED')
    })
  })

  describe('validateField', () => {
    it('should validate field with single rule', () => {
      const config: FieldValidationConfig = {
        required: true,
        rules: [createLengthRule({ min: 3, max: 10 })]
      }

      expect(validateField('ab', config)).toEqual({
        isValid: false,
        errors: expect.arrayContaining([
          { error: expect.stringContaining('최소'), code: 'MIN_LENGTH' }
        ])
      })

      expect(validateField('perfect', config)).toEqual({
        isValid: true,
        value: 'perfect'
      })
    })

    it('should validate field with multiple rules', () => {
      const config: FieldValidationConfig = {
        required: true,
        rules: [
          createLengthRule({ min: 5 }),
          createPatternRule(/^[a-zA-Z]+$/, '영문자만 허용')
        ]
      }

      expect(validateField('123', config)).toEqual({
        isValid: false,
        errors: expect.arrayContaining([
          { error: expect.stringContaining('최소'), code: 'MIN_LENGTH' },
          { error: '영문자만 허용', code: 'PATTERN' }
        ])
      })
    })
  })

  describe('validateFieldAsync', () => {
    it('should validate field with async rules', async () => {
      const asyncRule = createAsyncRule('uniqueness', async (value: string) => {
        if (value === 'taken') {
          return { isValid: false, error: '이미 사용됨', code: 'ALREADY_TAKEN' }
        }
        return { isValid: true, value }
      })

      const config: FieldValidationConfig = {
        rules: [createLengthRule({ min: 3 })],
        asyncRules: [asyncRule]
      }

      const result = await validateFieldAsync('taken', config)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual({
        error: '이미 사용됨',
        code: 'ALREADY_TAKEN'
      })
    })
  })

  describe('createValidationSchema', () => {
    it('should create validation schema for form', () => {
      const schema = createValidationSchema({
        title: {
          required: true,
          rules: [createLengthRule({ min: 5, max: 300 })]
        },
        content: {
          rules: [createLengthRule({ max: 10000 })]
        },
        authorName: {
          required: true,
          rules: [
            createLengthRule({ min: 3, max: 20 }),
            createPatternRule(/^[가-힣a-zA-Z][가-힣a-zA-Z0-9_]*$/, '올바른 형식이 아닙니다')
          ]
        }
      })

      expect(schema.title).toBeDefined()
      expect(schema.content).toBeDefined()
      expect(schema.authorName).toBeDefined()
    })
  })

  describe('validateSchema', () => {
    it('should validate entire form data against schema', () => {
      const schema = createValidationSchema({
        title: {
          required: true,
          rules: [createLengthRule({ min: 5 })]
        },
        authorName: {
          required: true,
          rules: [createLengthRule({ min: 3 })]
        }
      })

      const formData = {
        title: 'abc',
        authorName: '',
        content: 'Some content'
      }

      const result = validateSchema(formData, schema)

      expect(result.isValid).toBe(false)
      expect(result.fieldErrors.title).toBeDefined()
      expect(result.fieldErrors.authorName).toBeDefined()
    })

    it('should return valid result for correct data', () => {
      const schema = createValidationSchema({
        title: {
          required: true,
          rules: [createLengthRule({ min: 5 })]
        }
      })

      const formData = {
        title: 'Perfect Title'
      }

      const result = validateSchema(formData, schema)

      expect(result.isValid).toBe(true)
      expect(Object.keys(result.fieldErrors)).toHaveLength(0)
    })
  })
})