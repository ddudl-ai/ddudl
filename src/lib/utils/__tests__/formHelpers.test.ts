// T016: Unit test for form helpers - TDD Phase
// This test MUST FAIL before implementation

import {
  sanitizeFormData,
  validatePostData,
  formatFileSize,
  generateSlug,
  extractUrls,
  convertMarkdownToHtml,
  convertHtmlToMarkdown,
  debounceValidation,
  createFormDataSnapshot,
  mergeDraftWithCurrent,
  calculateReadingTime,
  truncateText,
  normalizeWhitespace,
  validateImageDimensions,
  generateImageThumbnail,
  compressImageFile,
  createCaptchaChallenge,
  verifyCaptchaResponse
} from '../formHelpers'
import type { PostFormData, ValidationError, UploadedImage } from '../../../types/forms'

// Mock file API and canvas for image processing tests
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
} as any

// Mock canvas API
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) }))
})) as any

describe('formHelpers', () => {
  describe('sanitizeFormData', () => {
    it('should remove dangerous HTML tags', () => {
      const input: Partial<PostFormData> = {
        title: '<script>alert("xss")</script>Safe Title',
        content: '<img src="x" onerror="alert(1)">Safe content',
        authorName: '<b>Author</b>'
      }

      const result = sanitizeFormData(input)

      expect(result.title).toBe('Safe Title')
      expect(result.content).toBe('Safe content')
      expect(result.authorName).toBe('Author')
    })

    it('should preserve safe HTML tags', () => {
      const input: Partial<PostFormData> = {
        content: '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>'
      }

      const result = sanitizeFormData(input, { allowSafeHtml: true })

      expect(result.content).toBe('<p>Paragraph</p><strong>Bold</strong><em>Italic</em>')
    })

    it('should trim whitespace', () => {
      const input: Partial<PostFormData> = {
        title: '  Spaced Title  ',
        authorName: '\tTabbed Author\n'
      }

      const result = sanitizeFormData(input)

      expect(result.title).toBe('Spaced Title')
      expect(result.authorName).toBe('Tabbed Author')
    })

    it('should normalize unicode characters', () => {
      const input: Partial<PostFormData> = {
        title: 'Caf\u00e9', // é as combined character
        content: 'Caf\u0065\u0301' // é as base + combining character
      }

      const result = sanitizeFormData(input, { normalizeUnicode: true })

      expect(result.title).toBe('Café')
      expect(result.content).toBe('Café')
    })

    it('should handle empty and null values', () => {
      const input: Partial<PostFormData> = {
        title: '',
        content: null as any,
        authorName: undefined as any
      }

      const result = sanitizeFormData(input)

      expect(result.title).toBe('')
      expect(result.content).toBe('')
      expect(result.authorName).toBe('')
    })
  })

  describe('validatePostData', () => {
    it('should validate required fields', () => {
      const data: Partial<PostFormData> = {
        title: '',
        authorName: '',
        channelName: ''
      }

      const errors = validatePostData(data)

      expect(errors).toContainEqual({
        field: 'title',
        message: expect.stringContaining('필수'),
        code: 'REQUIRED'
      })
      expect(errors).toContainEqual({
        field: 'authorName',
        message: expect.stringContaining('필수'),
        code: 'REQUIRED'
      })
    })

    it('should validate title length limits', () => {
      const shortTitle: Partial<PostFormData> = {
        title: 'abc',
        authorName: 'author',
        channelName: 'test'
      }

      const longTitle: Partial<PostFormData> = {
        title: 'a'.repeat(301),
        authorName: 'author',
        channelName: 'test'
      }

      const shortErrors = validatePostData(shortTitle)
      const longErrors = validatePostData(longTitle)

      expect(shortErrors).toContainEqual({
        field: 'title',
        message: expect.stringContaining('최소'),
        code: 'MIN_LENGTH'
      })

      expect(longErrors).toContainEqual({
        field: 'title',
        message: expect.stringContaining('최대'),
        code: 'MAX_LENGTH'
      })
    })

    it('should validate author name pattern', () => {
      const invalidNames = [
        '123user', // starts with number
        'user@name', // contains @
        'a', // too short
        'a'.repeat(21) // too long
      ]

      invalidNames.forEach(name => {
        const data: Partial<PostFormData> = {
          title: 'Valid Title',
          authorName: name,
          channelName: 'test'
        }

        const errors = validatePostData(data)

        expect(errors.some(error =>
          error.field === 'authorName' &&
          (error.code === 'PATTERN' || error.code === 'MIN_LENGTH' || error.code === 'MAX_LENGTH')
        )).toBe(true)
      })
    })

    it('should validate reserved author names', () => {
      const reservedNames = ['admin', 'moderator', 'system', 'null']

      reservedNames.forEach(name => {
        const data: Partial<PostFormData> = {
          title: 'Valid Title',
          authorName: name,
          channelName: 'test'
        }

        const errors = validatePostData(data)

        expect(errors).toContainEqual({
          field: 'authorName',
          message: expect.stringContaining('예약된'),
          code: 'RESERVED_WORD'
        })
      })
    })

    it('should return empty array for valid data', () => {
      const data: PostFormData = {
        title: 'Valid Post Title',
        content: 'Valid content with enough length',
        authorName: 'validuser',
        channelName: 'testchannel',
        captchaVerified: true,
        allowGuestComments: true
      }

      const errors = validatePostData(data)

      expect(errors).toHaveLength(0)
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should handle negative and decimal values', () => {
      expect(formatFileSize(-1024)).toBe('0 B')
      expect(formatFileSize(1536.7)).toBe('1.5 KB')
    })

    it('should support different decimal places', () => {
      expect(formatFileSize(1536, 2)).toBe('1.50 KB')
      expect(formatFileSize(1536, 0)).toBe('2 KB')
    })
  })

  describe('generateSlug', () => {
    it('should convert Korean text to slug', () => {
      expect(generateSlug('안녕하세요 세계')).toBe('annyeonghaseyo-segye')
      expect(generateSlug('한국어 제목입니다')).toBe('hangugeo-jemogipnida')
    })

    it('should handle mixed Korean/English text', () => {
      expect(generateSlug('Hello 안녕 World')).toBe('hello-annyeong-world')
      expect(generateSlug('React 리액트 Tutorial')).toBe('react-riaegteu-tutorial')
    })

    it('should remove special characters and numbers', () => {
      expect(generateSlug('Title with $pecial Ch@rs!')).toBe('title-with-pecial-chrs')
      expect(generateSlug('Test 123 Title')).toBe('test-title')
    })

    it('should limit slug length', () => {
      const longTitle = '아주 긴 제목입니다 '.repeat(20)
      const slug = generateSlug(longTitle, { maxLength: 50 })

      expect(slug.length).toBeLessThanOrEqual(50)
      expect(slug).not.toEndWith('-')
    })

    it('should handle empty and whitespace-only strings', () => {
      expect(generateSlug('')).toBe('')
      expect(generateSlug('   ')).toBe('')
      expect(generateSlug('---')).toBe('')
    })
  })

  describe('extractUrls', () => {
    it('should extract HTTP and HTTPS URLs', () => {
      const text = 'Visit https://example.com and http://test.org for info'
      const urls = extractUrls(text)

      expect(urls).toEqual(['https://example.com', 'http://test.org'])
    })

    it('should extract URLs with query parameters and fragments', () => {
      const text = 'Search at https://google.com/search?q=test#top'
      const urls = extractUrls(text)

      expect(urls).toEqual(['https://google.com/search?q=test#top'])
    })

    it('should extract YouTube URLs', () => {
      const text = 'Watch: https://www.youtube.com/watch?v=dQw4w9WgXcQ and https://youtu.be/abc123'
      const urls = extractUrls(text)

      expect(urls).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(urls).toContain('https://youtu.be/abc123')
    })

    it('should not extract invalid URLs', () => {
      const text = 'Not URLs: example.com, www.test.org, mailto:test@example.com'
      const urls = extractUrls(text)

      expect(urls).toHaveLength(0)
    })

    it('should return unique URLs', () => {
      const text = 'Same URL: https://example.com and https://example.com again'
      const urls = extractUrls(text)

      expect(urls).toEqual(['https://example.com'])
    })

    it('should handle Korean text with URLs', () => {
      const text = '이 링크를 확인하세요: https://naver.com 그리고 https://daum.net도요'
      const urls = extractUrls(text)

      expect(urls).toEqual(['https://naver.com', 'https://daum.net'])
    })
  })

  describe('convertMarkdownToHtml', () => {
    it('should convert basic markdown syntax', () => {
      const markdown = '**Bold** and *italic* text'
      const html = convertMarkdownToHtml(markdown)

      expect(html).toContain('<strong>Bold</strong>')
      expect(html).toContain('<em>italic</em>')
    })

    it('should convert links', () => {
      const markdown = '[Link text](https://example.com)'
      const html = convertMarkdownToHtml(markdown)

      expect(html).toContain('<a href="https://example.com">Link text</a>')
    })

    it('should convert headers', () => {
      const markdown = '# H1\n## H2\n### H3'
      const html = convertMarkdownToHtml(markdown)

      expect(html).toContain('<h1>H1</h1>')
      expect(html).toContain('<h2>H2</h2>')
      expect(html).toContain('<h3>H3</h3>')
    })

    it('should convert code blocks', () => {
      const html = convertMarkdownToHtml(markdown)

      expect(html).toContain('<pre><code class="language-javascript">')
    })

    it('should sanitize HTML by default', () => {
      const markdown = '**Bold** <script>alert("xss")</script>'
      const html = convertMarkdownToHtml(markdown)

      expect(html).toContain('<strong>Bold</strong>')
      expect(html).not.toContain('<script>')
    })
  })

  describe('convertHtmlToMarkdown', () => {
    it('should convert basic HTML tags', () => {
      const html = '<strong>Bold</strong> and <em>italic</em> text'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toBe('**Bold** and *italic* text')
    })

    it('should convert links', () => {
      const html = '<a href="https://example.com">Link text</a>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toBe('[Link text](https://example.com)')
    })

    it('should convert headers', () => {
      const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toContain('# H1')
      expect(markdown).toContain('## H2')
      expect(markdown).toContain('### H3')
    })

    it('should handle nested elements', () => {
      const html = '<p><strong>Bold</strong> text in <em>paragraph</em></p>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toContain('**Bold** text in *paragraph*')
    })

    it('should strip unsupported HTML tags', () => {
      const html = '<div>Content</div><span>More content</span>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toBe('Content More content')
    })
  })

  describe('debounceValidation', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should debounce validation calls', () => {
      const validator = jest.fn()
      const debounced = debounceValidation(validator, 300)

      debounced('value1')
      debounced('value2')
      debounced('value3')

      expect(validator).not.toHaveBeenCalled()

      jest.advanceTimersByTime(300)

      expect(validator).toHaveBeenCalledTimes(1)
      expect(validator).toHaveBeenCalledWith('value3')
    })

    it('should cancel previous calls', () => {
      const validator = jest.fn()
      const debounced = debounceValidation(validator, 300)

      debounced('value1')
      jest.advanceTimersByTime(100)

      debounced('value2')
      jest.advanceTimersByTime(300)

      expect(validator).toHaveBeenCalledTimes(1)
      expect(validator).toHaveBeenCalledWith('value2')
    })
  })

  describe('createFormDataSnapshot', () => {
    it('should create deep copy of form data', () => {
      const originalData: PostFormData = {
        title: 'Original Title',
        content: 'Original Content',
        authorName: 'author',
        channelName: 'test',
        captchaVerified: true,
        allowGuestComments: false,
        createdAt: new Date('2023-01-01')
      }

      const snapshot = createFormDataSnapshot(originalData)

      expect(snapshot).toEqual(originalData)
      expect(snapshot).not.toBe(originalData)
      expect(snapshot.createdAt).not.toBe(originalData.createdAt)
    })

    it('should include metadata in snapshot', () => {
      const data: PostFormData = {
        title: 'Test',
        content: '',
        authorName: 'author',
        channelName: 'test',
        captchaVerified: true,
        allowGuestComments: true
      }

      const snapshot = createFormDataSnapshot(data, { includeMetadata: true })

      expect(snapshot.metadata).toBeDefined()
      expect(snapshot.metadata.snapshotTime).toBeInstanceOf(Date)
      expect(snapshot.metadata.version).toBeDefined()
    })
  })

  describe('mergeDraftWithCurrent', () => {
    it('should merge draft data with current form data', () => {
      const currentData: Partial<PostFormData> = {
        title: 'Current Title',
        content: 'Current Content',
        channelName: 'current'
      }

      const draftData: Partial<PostFormData> = {
        title: 'Draft Title',
        authorName: 'draftAuthor'
      }

      const merged = mergeDraftWithCurrent(currentData, draftData)

      expect(merged.title).toBe('Draft Title')
      expect(merged.content).toBe('Current Content')
      expect(merged.authorName).toBe('draftAuthor')
      expect(merged.channelName).toBe('current')
    })

    it('should prefer non-empty draft values', () => {
      const currentData: Partial<PostFormData> = {
        title: 'Current Title',
        content: 'Current Content'
      }

      const draftData: Partial<PostFormData> = {
        title: '',
        content: 'Draft Content'
      }

      const merged = mergeDraftWithCurrent(currentData, draftData, { preferNonEmpty: true })

      expect(merged.title).toBe('Current Title')
      expect(merged.content).toBe('Draft Content')
    })
  })

  describe('calculateReadingTime', () => {
    it('should calculate reading time for Korean text', () => {
      const koreanText = '안녕하세요. '.repeat(100) // 500 characters
      const readingTime = calculateReadingTime(koreanText)

      expect(readingTime).toBeGreaterThan(0)
      expect(typeof readingTime).toBe('number')
    })

    it('should calculate reading time for English text', () => {
      const englishText = 'Hello world. '.repeat(100) // ~1300 characters
      const readingTime = calculateReadingTime(englishText)

      expect(readingTime).toBeGreaterThan(0)
    })

    it('should handle mixed Korean/English text', () => {
      const mixedText = 'Hello 안녕하세요 World 세계'.repeat(50)
      const readingTime = calculateReadingTime(mixedText)

      expect(readingTime).toBeGreaterThan(0)
    })

    it('should return 0 for empty text', () => {
      expect(calculateReadingTime('')).toBe(0)
      expect(calculateReadingTime('   ')).toBe(0)
    })
  })

  describe('truncateText', () => {
    it('should truncate text at word boundary', () => {
      const text = '안녕하세요 세계입니다 반갑습니다'
      const truncated = truncateText(text, 10)

      expect(truncated.length).toBeLessThanOrEqual(13) // includes ellipsis
      expect(truncated).toEndWith('...')
    })

    it('should not truncate if text is shorter than limit', () => {
      const text = '짧은 텍스트'
      const truncated = truncateText(text, 50)

      expect(truncated).toBe(text)
    })

    it('should handle custom ellipsis', () => {
      const text = '긴 텍스트입니다'
      const truncated = truncateText(text, 5, { ellipsis: ' [더보기]' })

      expect(truncated).toEndWith(' [더보기]')
    })
  })

  describe('normalizeWhitespace', () => {
    it('should normalize multiple spaces', () => {
      const text = 'Multiple    spaces   here'
      const normalized = normalizeWhitespace(text)

      expect(normalized).toBe('Multiple spaces here')
    })

    it('should normalize line breaks', () => {
      const text = 'Line1\n\n\n\nLine2'
      const normalized = normalizeWhitespace(text)

      expect(normalized).toBe('Line1\n\nLine2')
    })

    it('should trim leading and trailing whitespace', () => {
      const text = '   Content with spaces   '
      const normalized = normalizeWhitespace(text)

      expect(normalized).toBe('Content with spaces')
    })
  })

  describe('validateImageDimensions', () => {
    it('should validate image dimensions', async () => {
      const mockImage = {
        width: 800,
        height: 600
      }

      // Mock Image constructor
      global.Image = jest.fn().mockImplementation(() => ({
        ...mockImage,
        addEventListener: jest.fn((event, callback) => {
          if (event === 'load') {
            setTimeout(callback, 0)
          }
        })
      }))

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      const constraints = {
        minWidth: 100,
        maxWidth: 1000,
        minHeight: 100,
        maxHeight: 800
      }

      const result = await validateImageDimensions(file, constraints)

      expect(result.isValid).toBe(true)
      expect(result.width).toBe(800)
      expect(result.height).toBe(600)
    })

    it('should reject oversized images', async () => {
      const mockImage = {
        width: 2000,
        height: 1500
      }

      global.Image = jest.fn().mockImplementation(() => ({
        ...mockImage,
        addEventListener: jest.fn((event, callback) => {
          if (event === 'load') {
            setTimeout(callback, 0)
          }
        })
      }))

      const file = new File(['image'], 'large.jpg', { type: 'image/jpeg' })
      const constraints = { maxWidth: 1000, maxHeight: 800 }

      const result = await validateImageDimensions(file, constraints)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('크기')
    })
  })

  describe('generateImageThumbnail', () => {
    it('should generate thumbnail', async () => {
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      const thumbnailBlob = await generateImageThumbnail(file, { width: 150, height: 150 })

      expect(thumbnailBlob).toBeInstanceOf(Blob)
      expect(thumbnailBlob.type).toBe('image/jpeg')
    })

    it('should maintain aspect ratio', async () => {
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      const thumbnailBlob = await generateImageThumbnail(file, {
        width: 150,
        height: 150,
        maintainAspectRatio: true
      })

      expect(thumbnailBlob).toBeInstanceOf(Blob)
    })
  })

  describe('compressImageFile', () => {
    it('should compress image file', async () => {
      const file = new File([new ArrayBuffer(1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const compressedBlob = await compressImageFile(file, { quality: 0.7, maxSizeMB: 0.5 })

      expect(compressedBlob).toBeInstanceOf(Blob)
      expect(compressedBlob.size).toBeLessThan(file.size)
    })

    it('should convert to WebP format', async () => {
      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
      const compressedBlob = await compressImageFile(file, {
        outputFormat: 'webp',
        quality: 0.8
      })

      expect(compressedBlob.type).toBe('image/webp')
    })
  })

  describe('createCaptchaChallenge', () => {
    it('should create math captcha challenge', () => {
      const challenge = createCaptchaChallenge('math')

      expect(challenge.type).toBe('math')
      expect(challenge.question).toContain('+')
      expect(typeof challenge.answer).toBe('number')
      expect(challenge.token).toBeDefined()
    })

    it('should create text captcha challenge', () => {
      const challenge = createCaptchaChallenge('text')

      expect(challenge.type).toBe('text')
      expect(challenge.question).toContain('입력하세요')
      expect(typeof challenge.answer).toBe('string')
      expect(challenge.token).toBeDefined()
    })

    it('should create image captcha challenge', () => {
      const challenge = createCaptchaChallenge('image')

      expect(challenge.type).toBe('image')
      expect(challenge.imageData).toBeDefined()
      expect(challenge.token).toBeDefined()
    })
  })

  describe('verifyCaptchaResponse', () => {
    it('should verify correct math answer', () => {
      const challenge = createCaptchaChallenge('math')
      const result = verifyCaptchaResponse(challenge.token, challenge.answer.toString())

      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should reject incorrect answer', () => {
      const challenge = createCaptchaChallenge('math')
      const result = verifyCaptchaResponse(challenge.token, 'wrong answer')

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('잘못된')
    })

    it('should reject expired tokens', () => {
      const challenge = createCaptchaChallenge('math')

      // Mock expired token
      jest.advanceTimersByTime(10 * 60 * 1000) // 10 minutes

      const result = verifyCaptchaResponse(challenge.token, challenge.answer.toString())

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('만료')
    })

    it('should reject invalid tokens', () => {
      const result = verifyCaptchaResponse('invalid-token', 'answer')

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('유효하지 않은')
    })
  })
})