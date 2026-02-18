import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('formValidation utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validatePostTitle function', () => {
    it('should validate correct title length', () => {
      const validatePostTitle = require('../formValidation').validatePostTitle

      const result = validatePostTitle('유효한 게시물 제목입니다')

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should reject empty title', () => {
      const validatePostTitle = require('../formValidation').validatePostTitle

      const result = validatePostTitle('')

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'TITLE_REQUIRED',
          message: '제목은 필수입니다',
          field: 'title'
        }]
      })
    })

    it('should reject title that is too short', () => {
      const validatePostTitle = require('../formValidation').validatePostTitle

      const result = validatePostTitle('짧음')

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'TITLE_TOO_SHORT',
          message: '제목은 최소 5자 이상이어야 합니다',
          field: 'title'
        }]
      })
    })

    it('should reject title that is too long', () => {
      const validatePostTitle = require('../formValidation').validatePostTitle

      const longTitle = 'A'.repeat(301)
      const result = validatePostTitle(longTitle)

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'TITLE_TOO_LONG',
          message: '제목은 300자를 초과할 수 없습니다',
          field: 'title'
        }]
      })
    })

    it('should reject title with only whitespace', () => {
      const validatePostTitle = require('../formValidation').validatePostTitle

      const result = validatePostTitle('     ')

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'TITLE_REQUIRED',
          message: '제목은 필수입니다',
          field: 'title'
        }]
      })
    })

    it('should reject title with forbidden characters', () => {
      const validatePostTitle = require('../formValidation').validatePostTitle

      const result = validatePostTitle('제목에 금지된 <script> 태그')

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'TITLE_INVALID_CHARACTERS',
          message: '제목에 허용되지 않는 문자가 포함되어 있습니다',
          field: 'title'
        }]
      })
    })

    it('should handle Unicode characters correctly', () => {
      const validatePostTitle = require('../formValidation').validatePostTitle

      const result = validatePostTitle('한글과 영어 Mixed Title 🔥')

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should trim whitespace before validation', () => {
      const validatePostTitle = require('../formValidation').validatePostTitle

      const result = validatePostTitle('   유효한 제목   ')

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })
  })

  describe('validatePostContent function', () => {
    it('should validate empty content (optional)', () => {
      const validatePostContent = require('../formValidation').validatePostContent

      const result = validatePostContent('')

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should validate regular content', () => {
      const validatePostContent = require('../formValidation').validatePostContent

      const result = validatePostContent('유효한 게시물 내용입니다.')

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should reject content that is too long', () => {
      const validatePostContent = require('../formValidation').validatePostContent

      const longContent = 'A'.repeat(10001)
      const result = validatePostContent(longContent)

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'CONTENT_TOO_LONG',
          message: '내용은 10,000자를 초과할 수 없습니다',
          field: 'content'
        }]
      })
    })

    it('should sanitize and validate HTML content', () => {
      const validatePostContent = require('../formValidation').validatePostContent

      const htmlContent = '<p>안전한 내용</p><script>alert("xss")</script>'
      const result = validatePostContent(htmlContent)

      expect(result).toEqual({
        valid: true,
        errors: [],
        sanitizedContent: '<p>안전한 내용</p>'
      })
    })

    it('should detect and flag spam patterns', () => {
      const validatePostContent = require('../formValidation').validatePostContent

      const spamContent = 'BUY NOW! AMAZING OFFER! CLICK HERE!!!'
      const result = validatePostContent(spamContent)

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'CONTENT_SPAM_DETECTED',
          message: '스팸성 내용이 감지되었습니다',
          field: 'content'
        }]
      })
    })

    it('should validate markdown content', () => {
      const validatePostContent = require('../formValidation').validatePostContent

      const markdownContent = '# 제목\n\n**굵은 텍스트**와 *기울임*'
      const result = validatePostContent(markdownContent)

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should handle code blocks correctly', () => {
      const validatePostContent = require('../formValidation').validatePostContent

      const result = validatePostContent(codeContent)

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })
  })

  describe('validatePostFlair function', () => {
    it('should validate valid flair', () => {
      const validatePostFlair = require('../formValidation').validatePostFlair

      const availableFlairs = ['질문', '토론', '정보', '유머']
      const result = validatePostFlair('질문', availableFlairs)

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should validate empty flair (optional)', () => {
      const validatePostFlair = require('../formValidation').validatePostFlair

      const availableFlairs = ['질문', '토론']
      const result = validatePostFlair('', availableFlairs)

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should reject invalid flair', () => {
      const validatePostFlair = require('../formValidation').validatePostFlair

      const availableFlairs = ['질문', '토론', '정보']
      const result = validatePostFlair('잘못된플레어', availableFlairs)

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'INVALID_FLAIR',
          message: '올바른 플레어를 선택해주세요',
          field: 'flair'
        }]
      })
    })

    it('should handle case sensitivity', () => {
      const validatePostFlair = require('../formValidation').validatePostFlair

      const availableFlairs = ['질문', '토론']
      const result = validatePostFlair('질문', availableFlairs) // Exact match

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should handle null availableFlairs', () => {
      const validatePostFlair = require('../formValidation').validatePostFlair

      const result = validatePostFlair('질문', null)

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'FLAIR_NOT_AVAILABLE',
          message: '이 서브레딧에서는 플레어를 사용할 수 없습니다',
          field: 'flair'
        }]
      })
    })
  })

  describe('validateImageUploads function', () => {
    it('should validate empty image array', () => {
      const validateImageUploads = require('../formValidation').validateImageUploads

      const result = validateImageUploads([])

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should validate single valid image', () => {
      const validateImageUploads = require('../formValidation').validateImageUploads

      const mockFile = new File(['image-data'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1000000 }) // 1MB

      const result = validateImageUploads([mockFile])

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should reject too many images', () => {
      const validateImageUploads = require('../formValidation').validateImageUploads

      const mockFiles = Array.from({ length: 11 }, (_, i) =>
        new File(['data'], `image${i}.jpg`, { type: 'image/jpeg' })
      )

      const result = validateImageUploads(mockFiles)

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'TOO_MANY_IMAGES',
          message: '이미지는 최대 10개까지 업로드할 수 있습니다',
          field: 'images'
        }]
      })
    })

    it('should reject images that are too large', () => {
      const validateImageUploads = require('../formValidation').validateImageUploads

      const mockFile = new File(['large-image-data'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 11 * 1024 * 1024 }) // 11MB

      const result = validateImageUploads([mockFile])

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'IMAGE_TOO_LARGE',
          message: '이미지 크기는 10MB를 초과할 수 없습니다',
          field: 'images'
        }]
      })
    })

    it('should reject unsupported file types', () => {
      const validateImageUploads = require('../formValidation').validateImageUploads

      const mockFile = new File(['data'], 'document.pdf', { type: 'application/pdf' })

      const result = validateImageUploads([mockFile])

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'INVALID_IMAGE_TYPE',
          message: '지원되지 않는 이미지 형식입니다',
          field: 'images'
        }]
      })
    })

    it('should validate multiple valid images', () => {
      const validateImageUploads = require('../formValidation').validateImageUploads

      const mockFiles = [
        new File(['data1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['data2'], 'image2.png', { type: 'image/png' }),
        new File(['data3'], 'image3.webp', { type: 'image/webp' })
      ]

      mockFiles.forEach(file => {
        Object.defineProperty(file, 'size', { value: 1000000 })
      })

      const result = validateImageUploads(mockFiles)

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should return specific errors for each invalid file', () => {
      const validateImageUploads = require('../formValidation').validateImageUploads

      const mockFiles = [
        new File(['data1'], 'valid.jpg', { type: 'image/jpeg' }),
        new File(['data2'], 'invalid.txt', { type: 'text/plain' }),
        new File(['data3'], 'toolarge.jpg', { type: 'image/jpeg' })
      ]

      Object.defineProperty(mockFiles[0], 'size', { value: 1000000 }) // 1MB - valid
      Object.defineProperty(mockFiles[1], 'size', { value: 1000000 }) // Invalid type
      Object.defineProperty(mockFiles[2], 'size', { value: 12000000 }) // 12MB - too large

      const result = validateImageUploads(mockFiles)

      expect(result).toEqual({
        valid: false,
        errors: [
          {
            code: 'INVALID_IMAGE_TYPE',
            message: '지원되지 않는 이미지 형식입니다',
            field: 'images',
            fileName: 'invalid.txt'
          },
          {
            code: 'IMAGE_TOO_LARGE',
            message: '이미지 크기는 10MB를 초과할 수 없습니다',
            field: 'images',
            fileName: 'toolarge.jpg'
          }
        ]
      })
    })
  })

  describe('validatePostForm function', () => {
    it('should validate complete valid form', () => {
      const validatePostForm = require('../formValidation').validatePostForm

      const formData = {
        title: '유효한 게시물 제목',
        content: '유효한 게시물 내용',
        channel_name: 'test-channel',
        flair: '질문',
        images: []
      }

      const availableFlairs = ['질문', '토론', '정보']

      const result = validatePostForm(formData, availableFlairs)

      expect(result).toEqual({
        valid: true,
        errors: [],
        warnings: []
      })
    })

    it('should collect all validation errors', () => {
      const validatePostForm = require('../formValidation').validatePostForm

      const formData = {
        title: '', // Invalid
        content: 'A'.repeat(10001), // Too long
        channel_name: 'test-channel',
        flair: '잘못된플레어', // Invalid
        images: []
      }

      const availableFlairs = ['질문', '토론']

      const result = validatePostForm(formData, availableFlairs)

      expect(result).toEqual({
        valid: false,
        errors: [
          {
            code: 'TITLE_REQUIRED',
            message: '제목은 필수입니다',
            field: 'title'
          },
          {
            code: 'CONTENT_TOO_LONG',
            message: '내용은 10,000자를 초과할 수 없습니다',
            field: 'content'
          },
          {
            code: 'INVALID_FLAIR',
            message: '올바른 플레어를 선택해주세요',
            field: 'flair'
          }
        ],
        warnings: []
      })
    })

    it('should generate warnings for potential issues', () => {
      const validatePostForm = require('../formValidation').validatePostForm

      const formData = {
        title: '아주 짧은 제목입니다만 유효합니다',
        content: '', // Empty content
        channel_name: 'test-channel',
        flair: '',
        images: []
      }

      const result = validatePostForm(formData, [])

      expect(result).toEqual({
        valid: true,
        errors: [],
        warnings: [
          '내용이 비어있습니다. 더 많은 정보를 추가해보세요.',
          '플레어를 선택하면 게시물을 더 쉽게 찾을 수 있습니다.'
        ]
      })
    })

    it('should validate with images', () => {
      const validatePostForm = require('../formValidation').validatePostForm

      const mockFile = new File(['data'], 'image.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1000000 })

      const formData = {
        title: '이미지가 있는 게시물',
        content: '이미지와 함께하는 내용',
        channel_name: 'test-channel',
        flair: '',
        images: [mockFile]
      }

      const result = validatePostForm(formData, [])

      expect(result).toEqual({
        valid: true,
        errors: [],
        warnings: []
      })
    })

    it('should handle missing required fields', () => {
      const validatePostForm = require('../formValidation').validatePostForm

      const formData = {
        title: '제목',
        content: '내용',
        // channel_name missing
        flair: '',
        images: []
      }

      const result = validatePostForm(formData, [])

      expect(result).toEqual({
        valid: false,
        errors: [
          {
            code: 'CHANNEL_REQUIRED',
            message: '서브레딧을 선택해야 합니다',
            field: 'channel_name'
          }
        ],
        warnings: []
      })
    })
  })

  describe('sanitizeFormData function', () => {
    it('should sanitize HTML content', () => {
      const sanitizeFormData = require('../formValidation').sanitizeFormData

      const formData = {
        title: '<script>alert("xss")</script>Clean Title',
        content: '<p>Safe content</p><script>malicious()</script>',
        channel_name: 'test-channel'
      }

      const result = sanitizeFormData(formData)

      expect(result).toEqual({
        title: 'Clean Title',
        content: '<p>Safe content</p>',
        channel_name: 'test-channel'
      })
    })

    it('should trim whitespace', () => {
      const sanitizeFormData = require('../formValidation').sanitizeFormData

      const formData = {
        title: '  제목  ',
        content: '  내용  ',
        channel_name: '  channel  '
      }

      const result = sanitizeFormData(formData)

      expect(result).toEqual({
        title: '제목',
        content: '내용',
        channel_name: 'channel'
      })
    })

    it('should preserve safe HTML tags', () => {
      const sanitizeFormData = require('../formValidation').sanitizeFormData

      const formData = {
        title: 'Title',
        content: '<p><strong>Bold</strong> and <em>italic</em> text</p>',
        channel_name: 'test'
      }

      const result = sanitizeFormData(formData)

      expect(result.content).toContain('<p>')
      expect(result.content).toContain('<strong>')
      expect(result.content).toContain('<em>')
    })

    it('should handle null and undefined values', () => {
      const sanitizeFormData = require('../formValidation').sanitizeFormData

      const formData = {
        title: null,
        content: undefined,
        channel_name: 'test'
      }

      const result = sanitizeFormData(formData)

      expect(result).toEqual({
        title: '',
        content: '',
        channel_name: 'test'
      })
    })
  })

  describe('validateCaptcha function', () => {
    it('should validate correct captcha answer', () => {
      const validateCaptcha = require('../formValidation').validateCaptcha

      const result = validateCaptcha('10', '10')

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should reject incorrect captcha answer', () => {
      const validateCaptcha = require('../formValidation').validateCaptcha

      const result = validateCaptcha('10', '15')

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'CAPTCHA_INCORRECT',
          message: 'CAPTCHA 답이 올바르지 않습니다',
          field: 'captcha'
        }]
      })
    })

    it('should reject empty captcha answer', () => {
      const validateCaptcha = require('../formValidation').validateCaptcha

      const result = validateCaptcha('', '10')

      expect(result).toEqual({
        valid: false,
        errors: [{
          code: 'CAPTCHA_REQUIRED',
          message: 'CAPTCHA를 완료해주세요',
          field: 'captcha'
        }]
      })
    })

    it('should handle numeric string comparison', () => {
      const validateCaptcha = require('../formValidation').validateCaptcha

      const result = validateCaptcha('007', '7')

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should be case insensitive for text captcha', () => {
      const validateCaptcha = require('../formValidation').validateCaptcha

      const result = validateCaptcha('HELLO', 'hello')

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })
  })

  describe('getValidationRules function', () => {
    it('should return default validation rules', () => {
      const getValidationRules = require('../formValidation').getValidationRules

      const rules = getValidationRules()

      expect(rules).toEqual({
        title: {
          min_length: 5,
          max_length: 300,
          required: true,
          pattern: null
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
      })
    })

    it('should return channel-specific validation rules', () => {
      const getValidationRules = require('../formValidation').getValidationRules

      const channelSettings = {
        title: {
          min_length: 10,
          max_length: 200
        },
        images: {
          max_count: 5
        }
      }

      const rules = getValidationRules(channelSettings)

      expect(rules.title.min_length).toBe(10)
      expect(rules.title.max_length).toBe(200)
      expect(rules.images.max_count).toBe(5)
    })
  })
})