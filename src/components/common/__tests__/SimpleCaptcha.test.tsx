import { describe, it, expect, beforeEach, afterEach, jest } from &apos;@jest/globals&apos;
import { render, screen, fireEvent, waitFor } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import &apos;@testing-library/jest-dom&apos;
import SimpleCaptcha from &apos;../SimpleCaptcha&apos;

describe(&apos;SimpleCaptcha Integration Tests&apos;, () => {
  const mockOnVerify = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock Math.random to make tests deterministic
    jest.spyOn(Math, &apos;random&apos;).mockImplementation(() => 0.5)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe(&apos;Basic Functionality&apos;, () => {
    it(&apos;should render captcha with question and input&apos;, () => {
      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      // Should display a math question
      expect(screen.getByText(/[\d\s+\-×=?]+/)).toBeInTheDocument()

      // Should have an input field
      expect(screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)).toBeInTheDocument()

      // Should have a refresh button
      expect(screen.getByRole(&apos;button&apos;)).toBeInTheDocument()
    })

    it(&apos;should generate addition question&apos;, () => {
      // Mock Math.random to generate addition (first operation)
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Select addition operation (index 0)
        .mockReturnValueOnce(0.5) // First number: floor(0.5 * 10) + 1 = 6
        .mockReturnValueOnce(0.3) // Second number: floor(0.3 * 10) + 1 = 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText(&apos;6 + 4 = ?&apos;)).toBeInTheDocument()
    })

    it(&apos;should generate subtraction question&apos;, () => {
      // Mock Math.random to generate subtraction (second operation)
      Math.random = jest.fn()
        .mockReturnValueOnce(0.5) // Select subtraction operation (index 1)
        .mockReturnValueOnce(0.5) // First number: floor(0.5 * 10) + 5 = 10
        .mockReturnValueOnce(0.3) // Second number: floor(0.3 * 5) + 1 = 2

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText(&apos;10 - 2 = ?&apos;)).toBeInTheDocument()
    })

    it(&apos;should generate multiplication question&apos;, () => {
      // Mock Math.random to generate multiplication (third operation)
      Math.random = jest.fn()
        .mockReturnValueOnce(0.9) // Select multiplication operation (index 2)
        .mockReturnValueOnce(0.5) // First number: floor(0.5 * 5) + 2 = 4
        .mockReturnValueOnce(0.3) // Second number: floor(0.3 * 5) + 2 = 3

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText(&apos;4 × 3 = ?&apos;)).toBeInTheDocument()
    })

    it(&apos;should call onVerify with false initially&apos;, () => {
      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(mockOnVerify).toHaveBeenCalledWith(false)
    })
  })

  describe(&apos;User Interaction&apos;, () => {
    it(&apos;should verify correct answer&apos;, async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;10&apos;)

      expect(mockOnVerify).toHaveBeenCalledWith(true)
      expect(screen.getByText(&apos;✓ 확인됨&apos;)).toBeInTheDocument()
      expect(input).toHaveClass(&apos;border-green-500&apos;, &apos;bg-green-50&apos;)
    })

    it(&apos;should not verify incorrect answer&apos;, async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;15&apos;)

      expect(mockOnVerify).toHaveBeenCalledWith(false)
      expect(screen.queryByText(&apos;✓ 확인됨&apos;)).not.toBeInTheDocument()
      expect(input).not.toHaveClass(&apos;border-green-500&apos;)
    })

    it(&apos;should update verification status as user types&apos;, async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)

      // Type wrong answer first
      await user.type(input, &apos;9&apos;)
      expect(mockOnVerify).toHaveBeenCalledWith(false)

      // Clear and type correct answer
      await user.clear(input)
      await user.type(input, &apos;10&apos;)
      expect(mockOnVerify).toHaveBeenCalledWith(true)
    })

    it(&apos;should handle partial input correctly&apos;, async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)

      // Type partial answer
      await user.type(input, &apos;1&apos;)
      expect(mockOnVerify).toHaveBeenCalledWith(false)

      // Complete the answer
      await user.type(input, &apos;0&apos;)
      expect(mockOnVerify).toHaveBeenCalledWith(true)
    })
  })

  describe(&apos;Refresh Functionality&apos;, () => {
    it(&apos;should generate new question when refresh button is clicked&apos;, async () => {
      const user = userEvent.setup()

      // First question setup
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4
        // Second question setup (after refresh)
        .mockReturnValueOnce(1) // Different operation index
        .mockReturnValueOnce(0.7) // Different numbers
        .mockReturnValueOnce(0.2)

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      // Verify initial question
      expect(screen.getByText(&apos;6 + 4 = ?&apos;)).toBeInTheDocument()

      // Answer the initial question
      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;10&apos;)
      expect(screen.getByText(&apos;✓ 확인됨&apos;)).toBeInTheDocument()

      // Click refresh button
      const refreshButton = screen.getByRole(&apos;button&apos;)
      await user.click(refreshButton)

      // Should generate new question and reset state
      expect(input.value).toBe(&apos;')
      expect(screen.queryByText(&apos;✓ 확인됨&apos;)).not.toBeInTheDocument()
      expect(mockOnVerify).toHaveBeenLastCalledWith(false)
    })

    it(&apos;should reset verification state when refreshing&apos;, async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)

      // Answer correctly first
      await user.type(input, &apos;10&apos;) // Assuming this matches the generated answer

      // Click refresh
      const refreshButton = screen.getByRole(&apos;button&apos;)
      await user.click(refreshButton)

      // Verification should be reset
      expect(input).not.toHaveClass(&apos;border-green-500&apos;)
      expect(screen.queryByText(&apos;✓ 확인됨&apos;)).not.toBeInTheDocument()
    })
  })

  describe(&apos;Different Operation Types&apos;, () => {
    it(&apos;should handle subtraction verification correctly&apos;, async () => {
      const user = userEvent.setup()

      // Set up subtraction: 10 - 2 = 8
      Math.random = jest.fn()
        .mockReturnValueOnce(0.5) // Subtraction operation
        .mockReturnValueOnce(0.5) // 10
        .mockReturnValueOnce(0.2) // 2

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText(&apos;10 - 2 = ?&apos;)).toBeInTheDocument()

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;8&apos;)

      expect(mockOnVerify).toHaveBeenCalledWith(true)
      expect(screen.getByText(&apos;✓ 확인됨&apos;)).toBeInTheDocument()
    })

    it(&apos;should handle multiplication verification correctly&apos;, async () => {
      const user = userEvent.setup()

      // Set up multiplication: 4 × 3 = 12
      Math.random = jest.fn()
        .mockReturnValueOnce(0.9) // Multiplication operation
        .mockReturnValueOnce(0.4) // 4
        .mockReturnValueOnce(0.2) // 3

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      expect(screen.getByText(&apos;4 × 3 = ?&apos;)).toBeInTheDocument()

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;12&apos;)

      expect(mockOnVerify).toHaveBeenCalledWith(true)
      expect(screen.getByText(&apos;✓ 확인됨&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Edge Cases&apos;, () => {
    it(&apos;should handle empty input&apos;, async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)

      // Type and then clear
      await user.type(input, &apos;10&apos;)
      await user.clear(input)

      expect(mockOnVerify).toHaveBeenLastCalledWith(false)
      expect(screen.queryByText(&apos;✓ 확인됨&apos;)).not.toBeInTheDocument()
    })

    it(&apos;should handle non-numeric input&apos;, async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;abc&apos;)

      expect(mockOnVerify).toHaveBeenCalledWith(false)
      expect(screen.queryByText(&apos;✓ 확인됨&apos;)).not.toBeInTheDocument()
    })

    it(&apos;should handle leading/trailing whitespace&apos;, async () => {
      const user = userEvent.setup()

      // Set up a predictable math question: 6 + 4 = 10
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition operation
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos; 10 &apos;)

      // Should not verify with whitespace
      expect(mockOnVerify).toHaveBeenCalledWith(false)
    })

    it(&apos;should handle very large numbers&apos;, async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;999999&apos;)

      expect(mockOnVerify).toHaveBeenCalledWith(false)
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    it(&apos;should be keyboard accessible&apos;, async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      // Tab to input
      await user.tab()
      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      expect(input).toHaveFocus()

      // Tab to refresh button
      await user.tab()
      const refreshButton = screen.getByRole(&apos;button&apos;)
      expect(refreshButton).toHaveFocus()

      // Enter should trigger refresh
      await user.keyboard(&apos;{Enter}&apos;)
      expect(mockOnVerify).toHaveBeenLastCalledWith(false)
    })

    it(&apos;should have proper ARIA attributes&apos;, () => {
      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      expect(input).toHaveAttribute(&apos;type&apos;, &apos;text&apos;)

      const refreshButton = screen.getByRole(&apos;button&apos;)
      expect(refreshButton).toHaveAttribute(&apos;type&apos;, &apos;button&apos;)
    })
  })

  describe(&apos;Visual States&apos;, () => {
    it(&apos;should apply success styling when verified&apos;, async () => {
      const user = userEvent.setup()

      // Set up a predictable answer
      Math.random = jest.fn()
        .mockReturnValueOnce(0) // Addition
        .mockReturnValueOnce(0.5) // 6
        .mockReturnValueOnce(0.3) // 4

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;10&apos;)

      expect(input).toHaveClass(&apos;border-green-500&apos;, &apos;bg-green-50&apos;)
      expect(screen.getByText(&apos;✓ 확인됨&apos;)).toHaveClass(&apos;text-green-600&apos;)
    })

    it(&apos;should not apply success styling for wrong answer&apos;, async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;999&apos;)

      expect(input).not.toHaveClass(&apos;border-green-500&apos;, &apos;bg-green-50&apos;)
    })

    it(&apos;should apply custom className&apos;, () => {
      const customClass = &apos;custom-captcha-class&apos;
      render(<SimpleCaptcha onVerify={mockOnVerify} className={customClass} />)

      const container = screen.getByText(/[\d\s+\-×=?]+/).closest(&apos;div&apos;)
      expect(container).toHaveClass(customClass)
    })
  })

  describe(&apos;Component Lifecycle&apos;, () => {
    it(&apos;should generate question on mount&apos;, () => {
      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      // Should have a question displayed
      expect(screen.getByText(/[\d\s+\-×=?]+/)).toBeInTheDocument()
      expect(mockOnVerify).toHaveBeenCalledWith(false)
    })

    it(&apos;should handle re-renders gracefully&apos;, () => {
      const { rerender } = render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const originalQuestion = screen.getByText(/[\d\s+\-×=?]+/).textContent

      // Re-render with same props
      rerender(<SimpleCaptcha onVerify={mockOnVerify} />)

      // Question should remain the same
      expect(screen.getByText(originalQuestion!)).toBeInTheDocument()
    })

    it(&apos;should handle prop changes&apos;, async () => {
      const user = userEvent.setup()
      const newOnVerify = jest.fn()

      const { rerender } = render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)
      await user.type(input, &apos;10&apos;)

      // Change onVerify prop
      rerender(<SimpleCaptcha onVerify={newOnVerify} />)

      await user.type(input, &apos;5&apos;)

      expect(newOnVerify).toHaveBeenCalled()
    })
  })

  describe(&apos;Performance&apos;, () => {
    it(&apos;should handle rapid input changes&apos;, async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const input = screen.getByPlaceholderText(&apos;답을 입력하세요&apos;)

      // Rapid typing
      await user.type(input, &apos;123456789&apos;, { delay: 1 })

      expect(mockOnVerify).toHaveBeenCalledTimes(10) // Initial + 9 characters
    })

    it(&apos;should handle multiple refresh clicks&apos;, async () => {
      const user = userEvent.setup()

      render(<SimpleCaptcha onVerify={mockOnVerify} />)

      const refreshButton = screen.getByRole(&apos;button&apos;)

      // Click refresh multiple times rapidly
      await user.click(refreshButton)
      await user.click(refreshButton)
      await user.click(refreshButton)

      // Should handle all clicks without error
      expect(screen.getByText(/[\d\s+\-×=?]+/)).toBeInTheDocument()
    })
  })
})