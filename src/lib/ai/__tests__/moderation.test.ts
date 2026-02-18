// Mock the AI libraries first before any imports
jest.mock('openai')
jest.mock('@anthropic-ai/sdk')

import { 
  moderateContent, 
  analyzeImage,
  ModerationResult,
  ContentToModerate 
} from '../moderation'
import { 
  mockOpenAI, 
  mockAnthropic, 
  mockModerationResults, 
  mockContent 
} from '@/lib/test/mocks'

// Set up the mock implementations
const OpenAI = require('openai')
const Anthropic = require('@anthropic-ai/sdk')

OpenAI.mockImplementation(() => mockOpenAI)
Anthropic.mockImplementation(() => mockAnthropic)

describe('AI Moderation System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    process.env.AI_MODERATION_CONFIDENCE_THRESHOLD = '95'
  })

  describe('moderateContent', () => {
    describe('OpenAI moderation (primary)', () => {
      it('should approve clean content with high confidence', async () => {
        mockOpenAI.chat.completions.create.mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                isApproved: true,
                confidence: 98,
                reasons: [],
                category: []
              })
            }
          }]
        })

        const result = await moderateContent(mockContent.clean)

        expect(result).toEqual({
          isApproved: true,
          confidence: 98,
          reasons: [],
          category: [],
          requiresHumanReview: false,
          aiProvider: 'openai'
        })

        expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
          model: 'gpt-4-turbo-preview',
          messages: expect.arrayContaining([
            {
              role: 'system',
              content: expect.stringContaining('Korean Reddit-like platform')
            },
            {
              role: 'user',
              content: expect.stringContaining('안녕하세요! 좋은 하루 되세요.')
            }
          ]),
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 500
        })
      })

      it('should reject inappropriate content with Korean profanity', async () => {
        mockOpenAI.chat.completions.create.mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                isApproved: false,
                confidence: 96,
                reasons: ['Contains Korean profanity'],
                category: ['profanity', 'hate_speech']
              })
            }
          }]
        })

        const result = await moderateContent(mockContent.inappropriate)

        expect(result).toEqual({
          isApproved: false,
          confidence: 96,
          reasons: ['Contains Korean profanity'],
          category: ['profanity', 'hate_speech'],
          requiresHumanReview: false,
          aiProvider: 'openai'
        })
      })

      it('should require human review for low confidence scores', async () => {
        mockOpenAI.chat.completions.create.mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                isApproved: true,
                confidence: 85,
                reasons: ['Ambiguous context'],
                category: []
              })
            }
          }]
        })

        const result = await moderateContent(mockContent.clean)

        expect(result.requiresHumanReview).toBe(true)
        expect(result.confidence).toBe(85)
      })

      it('should include channel rules in moderation prompt', async () => {
        mockOpenAI.chat.completions.create.mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify(mockModerationResults.approved)
            }
          }]
        })

        await moderateContent(mockContent.clean)

        const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0]
        const userMessage = callArgs.messages[1].content
        
        expect(userMessage).toContain('Be respectful')
        expect(userMessage).toContain('No spam')
      })

      it('should include report count in moderation context', async () => {
        mockOpenAI.chat.completions.create.mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify(mockModerationResults.approved)
            }
          }]
        })

        await moderateContent(mockContent.inappropriate)

        const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0]
        const userMessage = callArgs.messages[1].content
        
        expect(userMessage).toContain('reported 2 times')
      })

      it('should handle malformed JSON response gracefully', async () => {
        mockOpenAI.chat.completions.create.mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'invalid json'
            }
          }]
        })

        const result = await moderateContent(mockContent.clean)

        // Should use default values when JSON parsing fails
        expect(result.isApproved).toBe(true)
        expect(result.confidence).toBe(50)
        expect(result.reasons).toEqual([])
      })
    })

    describe('Claude moderation (fallback)', () => {
      it('should fallback to Claude when OpenAI fails', async () => {
        // OpenAI fails
        mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI API error'))

        // Claude succeeds
        mockAnthropic.messages.create.mockResolvedValueOnce({
          content: [{
            type: 'text',
            text: JSON.stringify({
              isApproved: false,
              confidence: 92,
              reasons: ['Inappropriate content detected'],
              category: ['profanity']
            })
          }]
        })

        const result = await moderateContent(mockContent.inappropriate)

        expect(result).toEqual({
          isApproved: false,
          confidence: 92,
          reasons: ['Inappropriate content detected'],
          category: ['profanity'],
          requiresHumanReview: false,
          aiProvider: 'claude'
        })

        expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
        expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
          model: 'claude-3-opus-20240229',
          max_tokens: 500,
          temperature: 0.1,
          messages: [{
            role: 'user',
            content: expect.stringContaining('Korean Reddit-like platform')
          }]
        })
      })

      it('should handle Claude response with non-text content', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI error'))
        
        mockAnthropic.messages.create.mockResolvedValueOnce({
          content: [{
            type: 'image',
            source: { type: 'base64', data: 'test' }
          }]
        })

        const result = await moderateContent(mockContent.clean)

        // Should use default values when content is not text
        expect(result.isApproved).toBe(true)
        expect(result.confidence).toBe(50)
        expect(result.aiProvider).toBe('claude')
      })
    })

    describe('Rule-based moderation (final fallback)', () => {
      it('should fallback to rule-based when both AI services fail', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI error'))
        mockAnthropic.messages.create.mockRejectedValueOnce(new Error('Claude error'))

        const result = await moderateContent(mockContent.inappropriate)

        expect(result.aiProvider).toBe('rule-based')
        expect(result.requiresHumanReview).toBe(true)
        expect(result.isApproved).toBe(false)
        expect(result.reasons).toContain('Contains inappropriate language: 씨발')
        expect(result.category).toContain('profanity')
      })

      it('should detect Korean profanity', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'))
        mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API error'))

        const koreanProfanity = { text: '이 개새끼가' }
        const result = await moderateContent(koreanProfanity)

        expect(result.isApproved).toBe(false)
        expect(result.reasons).toContain('Contains inappropriate language: 개새끼')
        expect(result.category).toContain('profanity')
      })

      it('should detect English profanity', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'))
        mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API error'))

        const englishProfanity = { text: 'What the fuck is this shit' }
        const result = await moderateContent(englishProfanity)

        expect(result.isApproved).toBe(false)
        expect(result.reasons).toContain('Contains inappropriate language: fuck')
        expect(result.category).toContain('profanity')
      })

      it('should detect spam patterns', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'))
        mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API error'))

        const result = await moderateContent(mockContent.spam)

        expect(result.isApproved).toBe(false)
        expect(result.reasons).toContain('Excessive URLs detected')
        expect(result.category).toContain('spam')
      })

      it('should detect personal information', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'))
        mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API error'))

        const personalInfo = { text: 'Call me at 010-1234-5678 or email test@example.com' }
        const result = await moderateContent(personalInfo)

        expect(result.isApproved).toBe(false)
        expect(result.reasons).toContain('Personal information detected')
        expect(result.category).toContain('privacy')
      })

      it('should flag very short content as low quality', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'))
        mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API error'))

        const result = await moderateContent(mockContent.shortContent)

        expect(result.isApproved).toBe(false)
        expect(result.reasons).toContain('Content too short')
        expect(result.category).toContain('low_quality')
      })

      it('should approve clean content', async () => {
        mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'))
        mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API error'))

        const cleanContent = { text: '안녕하세요! 오늘 날씨가 정말 좋네요. 어떻게 지내시나요?' }
        const result = await moderateContent(cleanContent)

        expect(result.isApproved).toBe(true)
        expect(result.confidence).toBe(80)
        expect(result.reasons).toEqual([])
        expect(result.requiresHumanReview).toBe(true) // Always true for rule-based
      })
    })
  })

  describe('analyzeImage', () => {
    it('should analyze image content successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isApproved: true,
              confidence: 95,
              reasons: [],
              category: []
            })
          }
        }]
      })

      const result = await analyzeImage('https://example.com/image.jpg')

      expect(result).toEqual({
        isApproved: true,
        confidence: 95,
        reasons: [],
        category: [],
        requiresHumanReview: false,
        aiProvider: 'openai'
      })

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Analyze this image')
            },
            {
              type: 'image_url',
              image_url: {
                url: 'https://example.com/image.jpg'
              }
            }
          ]
        }],
        max_tokens: 300
      })
    })

    it('should reject inappropriate images', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isApproved: false,
              confidence: 98,
              reasons: ['Contains NSFW content'],
              category: ['nsfw', 'adult_content']
            })
          }
        }]
      })

      const result = await analyzeImage('https://example.com/nsfw-image.jpg')

      expect(result.isApproved).toBe(false)
      expect(result.reasons).toContain('Contains NSFW content')
      expect(result.category).toContain('nsfw')
    })

    it('should handle image analysis API failures gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('Vision API error'))

      const result = await analyzeImage('https://example.com/image.jpg')

      expect(result).toEqual({
        isApproved: false,
        confidence: 0,
        reasons: ['Image analysis failed'],
        category: ['error'],
        requiresHumanReview: true,
        aiProvider: 'rule-based'
      })
    })

    it('should handle malformed JSON in image analysis', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'invalid json response'
          }
        }]
      })

      const result = await analyzeImage('https://example.com/image.jpg')

      // Should use default values
      expect(result.isApproved).toBe(true)
      expect(result.confidence).toBe(50)
    })
  })

  describe('Confidence threshold configuration', () => {
    it('should use environment variable for confidence threshold', async () => {
      process.env.AI_MODERATION_CONFIDENCE_THRESHOLD = '85'

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isApproved: true,
              confidence: 90,
              reasons: [],
              category: []
            })
          }
        }]
      })

      const result = await moderateContent(mockContent.clean)

      expect(result.requiresHumanReview).toBe(false) // 90 >= 85
    })

    it('should use default threshold when environment variable is invalid', async () => {
      process.env.AI_MODERATION_CONFIDENCE_THRESHOLD = 'invalid'

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isApproved: true,
              confidence: 90,
              reasons: [],
              category: []
            })
          }
        }]
      })

      const result = await moderateContent(mockContent.clean)

      // Should use default threshold of 95
      expect(result.requiresHumanReview).toBe(true) // 90 < 95
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle empty content', async () => {
      const emptyContent = { text: '' }
      
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'))
      mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API error'))

      const result = await moderateContent(emptyContent)

      expect(result.aiProvider).toBe('rule-based')
      expect(result.isApproved).toBe(false)
      expect(result.category).toContain('low_quality')
    })

    it('should handle null or undefined content gracefully', async () => {
      const nullContent = { text: null as any }
      
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'))
      mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API error'))

      const result = await moderateContent(nullContent)

      expect(result.aiProvider).toBe('rule-based')
      // Should not crash and should return a result
      expect(result).toHaveProperty('isApproved')
      expect(result).toHaveProperty('confidence')
    })

    it('should handle content with images', async () => {
      const contentWithImages: ContentToModerate = {
        text: '여기 이미지들을 확인해주세요',
        imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
      }

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(mockModerationResults.approved)
          }
        }]
      })

      await moderateContent(contentWithImages)

      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0]
      const userMessage = callArgs.messages[1].content
      
      expect(userMessage).toContain('Images attached: 2 images')
    })
  })

  describe('Performance and reliability', () => {
    it('should complete moderation within reasonable time', async () => {
      mockOpenAI.chat.completions.create.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          choices: [{ message: { content: JSON.stringify(mockModerationResults.approved) } }]
        }), 100))
      )

      const startTime = Date.now()
      await moderateContent(mockContent.clean)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle concurrent moderation requests', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockModerationResults.approved) } }]
      })

      const promises = Array(5).fill(0).map(() => moderateContent(mockContent.clean))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.aiProvider).toBe('openai')
        expect(result.isApproved).toBe(true)
      })
    })
  })
})