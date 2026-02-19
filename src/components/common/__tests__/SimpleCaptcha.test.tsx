import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import SimpleCaptcha from '../SimpleCaptcha'

describe('SimpleCaptcha Integration Tests', () => {
  const mockOnVerify = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock Math.random to make tests deterministic
    jest.spyOn(Math, 'random').mockImplementation(() => 0.5)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should render captcha with question and input', () => {
      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      // Should display a math question
      expect(screen.getByText(/[\d\s+\-×=?]+/)).toBeInTheDocument()

      // Should have an input field
      expect(screen.getByPlaceholderText('Enter your answer')).toBeInTheDocument()

      // Should have a refresh button
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should generate addition question', () => {
      // Mock Math.random to generate addition (first operation)
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Select addition operation (index 0)
        .mockReturnValueOnce(0.5) // First number: floor(0.5 * 10) + 1 = 6
        .mockReturnValueOnce(0.3) // Second number: floor(0.3 * 10) + 1 = 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText('6 + 4 = ?')).toBeInTheDocument()
    })

    it('should generate subtraction question', () => {
      // Mock Math.random to generate subtraction (second operation)
      Math.random = jest.fn()
        .mockReturnValueOnce(0.5) // Select subtraction operation (index 1)
        .mockReturnValueOnce(0.5) // First number: floor(0.5 * 10) + 5 = 10
        .mockReturnValueOnce(0.3) // Second number: floor(0.3 * 5) + 1 = 2

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText('10 - 2 = ?')).toBeInTheDocument()
    })

    it('should generate multiplication question', () => {
      // Mock Math.random to generate multiplication (third operation)
      Math.random = jest.fn()
        .mockReturnValueOnce(0.9) // Select multiplication operation (index 2)
        .mockReturnValueOnce(0.5) // First number: floor(0.5 * 5) + 2 = 4
        .mockReturnValueOnce(0.3) // Second number: floor(0.3 * 5) + 2 = 3

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText('4 × 3 = ?')).toBeInTheDocument()
    })

    it('should call onVerify with false initially', () => {
      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(mockOnVerify).toHaveBeenCalledWith(false)
    })
  })

  describe('User Interaction', () => {
    it('should verify correct answer', async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, '10')

      expect(mockOnVerify).toHaveBeenCalledWith(true)
      expect(screen.getByText('✓ Verified')).toBeInTheDocument()
      expect(input).toHaveClass('border-green-500', 'bg-green-50')
    })

    it('should not verify incorrect answer', async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, '15')

      expect(mockOnVerify).toHaveBeenCalledWith(false)
      expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument()
      expect(input).not.toHaveClass('border-green-500')
    })

    it('should update verification status as user types', async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')

      // Type wrong answer first
      await user.type(input, '9')
      expect(mockOnVerify).toHaveBeenCalledWith(false)

      // Clear and type correct answer
      await user.clear(input)
      await user.type(input, '10')
      expect(mockOnVerify).toHaveBeenCalledWith(true)
    })

    it('should handle partial input correctly', async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')

      // Type partial answer
      await user.type(input, '1')
      expect(mockOnVerify).toHaveBeenCalledWith(false)

      // Complete the answer
      await user.type(input, '0')
      expect(mockOnVerify).toHaveBeenCalledWith(true)
    })
  })

  describe('Refresh Functionality', () => {
    it('should generate new question when refresh button is clicked', async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      
      // Type a known answer
      await user.type(input, '10')

      // Check if it's verified (may or may not be depending on the random question)
      const wasVerified = screen.queryByText('✓ Verified') !== null

      // Click refresh button
      const refreshButton = screen.getByRole('button')
      await user.click(refreshButton)

      // Should reset state regardless
      expect(input.value).toBe('')
      expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument()
      expect(mockOnVerify).toHaveBeenLastCalledWith(false)
    })

    it('should reset verification state when refreshing', async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')

      // Answer correctly first
      await user.type(input, '10') // Assuming this matches the generated answer

      // Click refresh
      const refreshButton = screen.getByRole('button')
      await user.click(refreshButton)

      // Verification should be reset
      expect(input).not.toHaveClass('border-green-500')
      expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument()
    })
  })

  describe('Different Operation Types', () => {
    it('should handle subtraction verification correctly', async () => {
      const user = userEvent.setup()

      // Set up subtraction: 10 - 2 = 8
      Math.random = jest.fn()
        .mockReturnValueOnce(0.5) // Subtraction operation
        .mockReturnValueOnce(0.5) // 10
        .mockReturnValueOnce(0.2) // 2

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText('10 - 2 = ?')).toBeInTheDocument()

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, '8')

      expect(mockOnVerify).toHaveBeenCalledWith(true)
      expect(screen.getByText('✓ Verified')).toBeInTheDocument()
    })

    it('should handle multiplication verification correctly', async () => {
      const user = userEvent.setup()

      // Set up multiplication: 4 × 3 = 12
      Math.random = jest.fn()
        .mockReturnValueOnce(0.9) // Multiplication operation
        .mockReturnValueOnce(0.4) // 4
        .mockReturnValueOnce(0.2) // 3

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText('4 × 3 = ?')).toBeInTheDocument()

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, '12')

      expect(mockOnVerify).toHaveBeenCalledWith(true)
      expect(screen.getByText('✓ Verified')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')

      // Type and then clear
      await user.type(input, '10')
      await user.clear(input)

      expect(mockOnVerify).toHaveBeenLastCalledWith(false)
      expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument()
    })

    it('should handle non-numeric input', async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, 'abc')

      expect(mockOnVerify).toHaveBeenCalledWith(false)
      expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument()
    })

    it('should handle leading/trailing whitespace', async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, ' 10 ')

      // Should not verify with whitespace
      expect(mockOnVerify).toHaveBeenCalledWith(false)
    })

    it('should handle very large numbers', async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, '999999')

      expect(mockOnVerify).toHaveBeenCalledWith(false)
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      // Tab to refresh button (first focusable element)
      await user.tab()
      const refreshButton = screen.getByRole('button')
      expect(refreshButton).toHaveFocus()

      // Tab to input
      await user.tab()
      const input = screen.getByPlaceholderText('Enter your answer')
      expect(input).toHaveFocus()

      // Enter should trigger refresh
      await user.keyboard('{Enter}')
      expect(mockOnVerify).toHaveBeenLastCalledWith(false)
    })

    it('should have proper ARIA attributes', () => {
      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      expect(input).toHaveAttribute('type', 'text')

      const refreshButton = screen.getByRole('button')
      expect(refreshButton).toHaveAttribute('type', 'button')
    })
  })

  describe('Visual States', () => {
    it('should apply success styling when verified', async () => {
      const user = userEvent.setup()

      // Set up a predictable answer
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, '10')

      expect(input).toHaveClass('border-green-500', 'bg-green-50')
      expect(screen.getByText('✓ Verified')).toHaveClass('text-green-600')
    })

    it('should not apply success styling for wrong answer', async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, '999')

      expect(input).not.toHaveClass('border-green-500', 'bg-green-50')
    })

    it('should apply custom className', () => {
      const customClass = 'custom-captcha-class'
      render(<SimpleCaptcha onVerify={mockOnVerify} className={customClass} />)

      // Find the top-level container div
      const container = screen.getByText(/[\d\s+\-×=?]+/).closest('div').parentElement.parentElement
      expect(container).toHaveClass('space-y-3', customClass)
    })
  })

  describe('Component Lifecycle', () => {
    it('should generate question on mount', () => {
      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      // Should have a question displayed
      expect(screen.getByText(/[\d\s+\-×=?]+/)).toBeInTheDocument()
      expect(mockOnVerify).toHaveBeenCalledWith(false)
    })

    it('should handle re-renders gracefully', () => {
      const { rerender } = render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const originalQuestion = screen.getByText(/[\d\s+\-×=?]+/).textContent

      // Re-render with same props
      rerender(<SimpleCaptcha onVerify={mockOnVerify} />)

      // Question should remain the same
      expect(screen.getByText(originalQuestion!)).toBeInTheDocument()
    })

    it('should handle prop changes', async () => {
      const user = userEvent.setup()
      const newOnVerify = jest.fn()

      const { rerender } = render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')
      await user.type(input, '10')

      // Change onVerify prop
      rerender(<SimpleCaptcha onVerify={newOnVerify} />)

      await user.type(input, '5')

      expect(newOnVerify).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should handle rapid input changes', async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText('Enter your answer')

      // Rapid typing
      await user.type(input, '123456789', { delay: 1 })

      expect(mockOnVerify).toHaveBeenCalledTimes(10) // Initial + 9 characters
    })

    it('should handle multiple refresh clicks', async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const refreshButton = screen.getByRole('button')

      // Click refresh multiple times rapidly
      await user.click(refreshButton)
      await user.click(refreshButton)
      await user.click(refreshButton)

      // Should handle all clicks without error
      expect(screen.getByText(/[\d\s+\-×=?]+/)).toBeInTheDocument()
    })
  })
})