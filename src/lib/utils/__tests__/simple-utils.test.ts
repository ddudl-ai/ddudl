// 간단한 유틸리티 함수 테스트
describe('Simple Utility Functions', () => {
  describe('formatNumber', () => {
    const formatNumber = (num: number): string => {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`
      }
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`
      }
      return num.toString()
    }

    it('should format millions', () => {
      expect(formatNumber(1500000)).toBe('1.5M')
      expect(formatNumber(2000000)).toBe('2.0M')
    })

    it('should format thousands', () => {
      expect(formatNumber(1500)).toBe('1.5K')
      expect(formatNumber(2000)).toBe('2.0K')
    })

    it('should return string for small numbers', () => {
      expect(formatNumber(999)).toBe('999')
      expect(formatNumber(0)).toBe('0')
    })
  })

  describe('validateEmail', () => {
    const validateEmail = (email: string): boolean => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return re.test(email)
    }

    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.kr')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
    })
  })

  describe('Korean text handling', () => {
    const containsKorean = (text: string): boolean => {
      return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)
    }

    it('should detect Korean characters', () => {
      expect(containsKorean('안녕하세요')).toBe(true)
      expect(containsKorean('Hello 한글')).toBe(true)
      expect(containsKorean('ㅋㅋㅋ')).toBe(true)
    })

    it('should return false for non-Korean text', () => {
      expect(containsKorean('Hello World')).toBe(false)
      expect(containsKorean('123456')).toBe(false)
      expect(containsKorean('こんにちは')).toBe(false)
    })
  })
})