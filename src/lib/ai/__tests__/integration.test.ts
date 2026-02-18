/**
 * Integration tests for AI fallback system and error handling
 * Tests the complete OpenAI → Claude → rule-based fallback chain
 */

import { moderateContent, analyzeImage } from '../moderation'
import { mockOpenAI, mockAnthropic, mockContent, mockModerationResults } from '@/lib/test/mocks'

// Mock the AI libraries
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI)
})

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => mockAnthropic)
})

describe('AI Fallback System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.AI_MODERATION_CONFIDENCE_THRESHOLD = '95'
  })

  describe('Complete fallback chain testing', () => {
    it('should successfully use OpenAI when available', async () => {
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

      expect(result.aiProvider).toBe('openai')
      expect(result.isApproved).toBe(true)
      expect(result.confidence).toBe(98)

      // Verify only OpenAI was called
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1)
      expect(mockAnthropic.messages.create).not.toHaveBeenCalled()
    })

    it('should fallback to Claude when OpenAI fails', async () => {
      // OpenAI fails with network error
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI service temporarily unavailable')
      )

      // Claude succeeds
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify({
            isApproved: false,
            confidence: 94,
            reasons: ['Potentially inappropriate content'],
            category: ['review_needed']
          })
        }]
      })

      const result = await moderateContent(mockContent.inappropriate)

      expect(result.aiProvider).toBe('claude')
      expect(result.isApproved).toBe(false)
      expect(result.confidence).toBe(94)
      expect(result.requiresHumanReview).toBe(true) // <95% confidence

      // Verify fallback chain
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1)
      expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(1)
    })

    it('should fallback to rule-based when both AI services fail', async () => {
      // OpenAI fails
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI rate limit exceeded')
      )

      // Claude also fails
      mockAnthropic.messages.create.mockRejectedValueOnce(
        new Error('Claude service unavailable')
      )

      const result = await moderateContent(mockContent.inappropriate)

      expect(result.aiProvider).toBe('rule-based')
      expect(result.isApproved).toBe(false)
      expect(result.reasons).toContain('Contains inappropriate language: 씨발')
      expect(result.category).toContain('profanity')
      expect(result.requiresHumanReview).toBe(true) // Always true for rule-based

      // Verify both AI services were attempted
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1)
      expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(1)
    })

    it('should handle partial failures in AI responses gracefully', async () => {
      // OpenAI returns malformed JSON
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'This is not valid JSON'
          }
        }]
      })

      // Claude succeeds with valid response
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify(mockModerationResults.approved)
        }]
      })

      const result = await moderateContent(mockContent.clean)

      // Should fallback to Claude due to JSON parsing error in OpenAI
      expect(result.aiProvider).toBe('claude')
    })
  })

  describe('Error handling resilience', () => {
    it('should handle API timeout scenarios', async () => {
      // Simulate timeout on OpenAI
      mockOpenAI.chat.completions.create.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      // Claude provides backup
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify(mockModerationResults.approved)
        }]
      })

      const result = await moderateContent(mockContent.clean)

      expect(result.aiProvider).toBe('claude')
      expect(result.isApproved).toBe(true)
    })

    it('should handle authentication errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('Invalid API key')
      )

      mockAnthropic.messages.create.mockRejectedValueOnce(
        new Error('Authentication failed')
      )

      const result = await moderateContent(mockContent.clean)

      // Should fallback to rule-based
      expect(result.aiProvider).toBe('rule-based')
    })

    it('should handle rate limiting gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('Rate limit exceeded. Please try again later.')
      )

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify(mockModerationResults.approved)
        }]
      })

      const result = await moderateContent(mockContent.clean)

      expect(result.aiProvider).toBe('claude')
    })

    it('should handle empty or null responses', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: null
          }
        }]
      })

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: []
      })

      const result = await moderateContent(mockContent.clean)

      // Should fallback to rule-based when AI responses are empty
      expect(result.aiProvider).toBe('rule-based')
    })
  })

  describe('AI service recovery scenarios', () => {
    it('should retry OpenAI after temporary failure', async () => {
      // First call fails
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Temporary service error'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify(mockModerationResults.approved)
            }
          }]
        })

      // Test two consecutive calls
      const result1 = await moderateContent(mockContent.clean)
      expect(result1.aiProvider).toBe('rule-based') // Fallback on first call

      const result2 = await moderateContent(mockContent.clean)
      expect(result2.aiProvider).toBe('openai') // Recovery on second call
    })

    it('should handle intermittent network issues', async () => {
      // Simulate network flakiness
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify(mockModerationResults.approved)
            }
          }]
        })

      // Multiple calls with network recovery
      const results = await Promise.all([
        moderateContent(mockContent.clean),
        moderateContent(mockContent.clean),
        moderateContent(mockContent.clean)
      ])

      expect(results[0].aiProvider).toBe('rule-based')
      expect(results[1].aiProvider).toBe('rule-based')
      expect(results[2].aiProvider).toBe('openai')
    })
  })

  describe('Performance and reliability under load', () => {
    it('should handle concurrent moderation requests', async () => {
      mockOpenAI.chat.completions.create.mockImplementation(() =>
        Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify(mockModerationResults.approved)
            }
          }]
        })
      )

      const concurrentRequests = Array(10).fill(0).map(() => 
        moderateContent(mockContent.clean)
      )

      const results = await Promise.all(concurrentRequests)

      // All should succeed with OpenAI
      results.forEach(result => {
        expect(result.aiProvider).toBe('openai')
        expect(result.isApproved).toBe(true)
      })

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(10)
    })

    it('should handle mixed success/failure scenarios under load', async () => {
      // Alternate between success and failure
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockModerationResults.approved) } }]
        })
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockModerationResults.rejected) } }]
        })

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify(mockModerationResults.lowConfidence)
        }]
      })

      const requests = [
        moderateContent(mockContent.clean),
        moderateContent(mockContent.inappropriate),
        moderateContent(mockContent.clean)
      ]

      const results = await Promise.all(requests)

      expect(results[0].aiProvider).toBe('openai')
      expect(results[1].aiProvider).toBe('claude') // Fallback due to OpenAI error
      expect(results[2].aiProvider).toBe('openai')
    })
  })

  describe('Image analysis fallback system', () => {
    it('should handle image analysis failures gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('Vision API unavailable')
      )

      const result = await analyzeImage('https://example.com/test-image.jpg')

      expect(result.isApproved).toBe(false)
      expect(result.confidence).toBe(0)
      expect(result.reasons).toContain('Image analysis failed')
      expect(result.category).toContain('error')
      expect(result.requiresHumanReview).toBe(true)
      expect(result.aiProvider).toBe('rule-based')
    })

    it('should handle image analysis success after text moderation failure', async () => {
      // Text moderation fails
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Text API error'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                isApproved: true,
                confidence: 96,
                reasons: [],
                category: []
              })
            }
          }]
        })

      const textResult = await moderateContent(mockContent.clean)
      expect(textResult.aiProvider).toBe('rule-based')

      const imageResult = await analyzeImage('https://example.com/safe-image.jpg')
      expect(imageResult.aiProvider).toBe('openai')
      expect(imageResult.isApproved).toBe(true)
    })
  })

  describe('Configuration and environment handling', () => {
    it('should adapt confidence threshold dynamically', async () => {
      // Set high confidence threshold
      process.env.AI_MODERATION_CONFIDENCE_THRESHOLD = '99'

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isApproved: true,
              confidence: 95, // Below threshold
              reasons: [],
              category: []
            })
          }
        }]
      })

      const result = await moderateContent(mockContent.clean)

      expect(result.requiresHumanReview).toBe(true) // 95 < 99
      expect(result.confidence).toBe(95)
    })

    it('should handle missing environment variables gracefully', async () => {
      // Remove confidence threshold
      delete process.env.AI_MODERATION_CONFIDENCE_THRESHOLD

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
      expect(result.requiresHumanReview).toBe(true) // 90 < 95 (default)
    })
  })

  describe('Cross-service consistency', () => {
    it('should maintain consistent output format across all providers', async () => {
      // Test OpenAI format
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(mockModerationResults.approved)
          }
        }]
      })

      const openaiResult = await moderateContent(mockContent.clean)

      // Test Claude format (after OpenAI failure)
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI error'))
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify(mockModerationResults.approved)
        }]
      })

      const claudeResult = await moderateContent(mockContent.clean)

      // Test rule-based format (after both AI failures)
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI error'))
      mockAnthropic.messages.create.mockRejectedValueOnce(new Error('Claude error'))

      const ruleBasedResult = await moderateContent(mockContent.clean)

      // All should have consistent structure
      const expectedKeys = ['isApproved', 'confidence', 'reasons', 'category', 'requiresHumanReview', 'aiProvider']
      
      expectedKeys.forEach(key => {
        expect(openaiResult).toHaveProperty(key)
        expect(claudeResult).toHaveProperty(key)
        expect(ruleBasedResult).toHaveProperty(key)
      })

      expect(openaiResult.aiProvider).toBe('openai')
      expect(claudeResult.aiProvider).toBe('claude')
      expect(ruleBasedResult.aiProvider).toBe('rule-based')
    })
  })

  describe('Real-world failure simulation', () => {
    it('should handle API deprecation scenario', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('This model has been deprecated')
      )

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify(mockModerationResults.approved)
        }]
      })

      const result = await moderateContent(mockContent.clean)

      expect(result.aiProvider).toBe('claude')
      expect(result.isApproved).toBe(true)
    })

    it('should handle billing/quota exceeded scenario', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('You exceeded your current quota')
      )

      mockAnthropic.messages.create.mockRejectedValueOnce(
        new Error('Insufficient credits')
      )

      const result = await moderateContent(mockContent.inappropriate)

      // Should fallback to rule-based when both services have billing issues
      expect(result.aiProvider).toBe('rule-based')
      expect(result.isApproved).toBe(false) // Rule-based catches Korean profanity
    })

    it('should handle regional service restrictions', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('This service is not available in your region')
      )

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: JSON.stringify(mockModerationResults.approved)
        }]
      })

      const result = await moderateContent(mockContent.clean)

      expect(result.aiProvider).toBe('claude')
    })
  })
})