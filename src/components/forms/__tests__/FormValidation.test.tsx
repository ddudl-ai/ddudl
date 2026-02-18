// T014: Unit test for FormValidation module - TDD Phase
// This test MUST FAIL before implementation

import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor, act } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import { FormValidation } from &apos;../FormValidation&apos;
import type { ValidationState, ValidationError, ValidationWarning } from &apos;../../../types/forms&apos;

// Mock useFormValidation hook
jest.mock(&apos;../../../hooks/useFormValidation&apos;, () => ({
  useFormValidation: jest.fn()
}))

const mockUseFormValidation = require(&apos;../../../hooks/useFormValidation&apos;).useFormValidation

describe(&apos;FormValidation&apos;, () => {
  const defaultValidationState: ValidationState = {
    isValid: true,
    errors: [],
    warnings: [],
    touched: new Set()
  }

  const defaultHookReturn = {
    validationState: defaultValidationState,
    validateField: jest.fn(),
    validateForm: jest.fn(),
    clearFieldError: jest.fn(),
    clearAllErrors: jest.fn(),
    isFieldValid: jest.fn(),
    getFieldError: jest.fn(),
    getFieldWarning: jest.fn(),
    hasFieldError: jest.fn(),
    isFieldTouched: jest.fn()
  }

  beforeEach(() => {
    mockUseFormValidation.mockReturnValue(defaultHookReturn)
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe(&apos;Error Display&apos;, () => {
    it(&apos;should render field errors&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목은 필수입니다&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;content&apos;, message: &apos;내용이 너무 깁니다&apos;, code: &apos;MAX_LENGTH&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation />)

      expect(screen.getByText(&apos;제목은 필수입니다&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;내용이 너무 깁니다&apos;)).toBeInTheDocument()
    })

    it(&apos;should render warnings separately from errors&apos;, () => {
      const warnings: ValidationWarning[] = [
        { field: &apos;title&apos;, message: &apos;제목이 너무 짧습니다&apos; },
        { field: &apos;authorName&apos;, message: &apos;추천하지 않는 User명입니다&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          warnings
        }
      })

      render(<FormValidation showWarnings />)

      expect(screen.getByText(&apos;제목이 너무 짧습니다&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;추천하지 않는 User명입니다&apos;)).toBeInTheDocument()
    })

    it(&apos;should group errors by field&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목은 필수입니다&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;title&apos;, message: &apos;제목이 너무 짧습니다&apos;, code: &apos;MIN_LENGTH&apos; },
        { field: &apos;content&apos;, message: &apos;내용이 필요합니다&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation groupByField />)

      const titleSection = screen.getByTestId(&apos;validation-field-title&apos;)
      expect(titleSection).toContainHTML(&apos;제목은 필수입니다&apos;)
      expect(titleSection).toContainHTML(&apos;제목이 너무 짧습니다&apos;)

      const contentSection = screen.getByTestId(&apos;validation-field-content&apos;)
      expect(contentSection).toContainHTML(&apos;내용이 필요합니다&apos;)
    })

    it(&apos;should show error icons for different error types&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;필수 필드입니다&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;content&apos;, message: &apos;패턴이 맞지 않습니다&apos;, code: &apos;PATTERN&apos; },
        { field: &apos;images&apos;, message: &apos;파일이 너무 큽니다&apos;, code: &apos;FILE_TOO_LARGE&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation showIcons />)

      expect(screen.getByTestId(&apos;error-icon-required&apos;)).toBeInTheDocument()
      expect(screen.getByTestId(&apos;error-icon-pattern&apos;)).toBeInTheDocument()
      expect(screen.getByTestId(&apos;error-icon-file&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Validation Summary&apos;, () => {
    it(&apos;should show validation summary when errors exist&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;content&apos;, message: &apos;내용 오류&apos;, code: &apos;MAX_LENGTH&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation showSummary />)

      expect(screen.getByText(&apos;2개의 오류가 발견되었습니다&apos;)).toBeInTheDocument()
    })

    it(&apos;should show success message when form is valid&apos;, () => {
      render(<FormValidation showSummary />)

      expect(screen.getByText(&apos;폼이 유효합니다&apos;)).toBeInTheDocument()
      expect(screen.getByTestId(&apos;success-icon&apos;)).toBeInTheDocument()
    })

    it(&apos;should show mixed summary with errors and warnings&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]
      const warnings: ValidationWarning[] = [
        { field: &apos;content&apos;, message: &apos;내용 경고&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors,
          warnings
        }
      })

      render(<FormValidation showSummary showWarnings />)

      expect(screen.getByText(&apos;1개의 오류, 1개의 경고&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Real-time Validation&apos;, () => {
    it(&apos;should trigger field validation on blur&apos;, async () => {
      const mockValidateField = jest.fn()

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validateField: mockValidateField
      })

      render(
        <FormValidation mode=&quot;onBlur&quot;>
          <input name=&quot;title&quot; data-testid=&quot;title-input&quot; />
        </FormValidation>
      )

      const titleInput = screen.getByTestId(&apos;title-input&apos;)

      fireEvent.blur(titleInput)

      expect(mockValidateField).toHaveBeenCalledWith(&apos;title&apos;, expect.anything())
    })

    it(&apos;should trigger field validation on change in onChange mode&apos;, async () => {
      const mockValidateField = jest.fn()

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validateField: mockValidateField
      })

      render(
        <FormValidation mode=&quot;onChange&quot;>
          <input name=&quot;title&quot; data-testid=&quot;title-input&quot; />
        </FormValidation>
      )

      const titleInput = screen.getByTestId(&apos;title-input&apos;)

      fireEvent.change(titleInput, { target: { value: &apos;new value&apos; } })

      expect(mockValidateField).toHaveBeenCalledWith(&apos;title&apos;, &apos;new value&apos;)
    })

    it(&apos;should debounce validation in onChange mode&apos;, async () => {
      jest.useFakeTimers()
      const mockValidateField = jest.fn()

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validateField: mockValidateField
      })

      render(
        <FormValidation mode=&quot;onChange&quot; debounceMs={500}>
          <input name=&quot;title&quot; data-testid=&quot;title-input&quot; />
        </FormValidation>
      )

      const titleInput = screen.getByTestId(&apos;title-input&apos;)

      // Rapid typing
      fireEvent.change(titleInput, { target: { value: &apos;a&apos; } })
      fireEvent.change(titleInput, { target: { value: &apos;ab&apos; } })
      fireEvent.change(titleInput, { target: { value: &apos;abc&apos; } })

      expect(mockValidateField).not.toHaveBeenCalled()

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(mockValidateField).toHaveBeenCalledTimes(1)
      expect(mockValidateField).toHaveBeenCalledWith(&apos;title&apos;, &apos;abc&apos;)

      jest.useRealTimers()
    })
  })

  describe(&apos;Error Dismissal&apos;, () => {
    it(&apos;should allow dismissing individual field errors&apos;, async () => {
      const user = userEvent.setup()
      const mockClearFieldError = jest.fn()

      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        },
        clearFieldError: mockClearFieldError
      })

      render(<FormValidation dismissible />)

      const dismissButton = screen.getByRole(&apos;button&apos;, { name: /닫기/i })
      await user.click(dismissButton)

      expect(mockClearFieldError).toHaveBeenCalledWith(&apos;title&apos;)
    })

    it(&apos;should allow dismissing all errors at once&apos;, async () => {
      const user = userEvent.setup()
      const mockClearAllErrors = jest.fn()

      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;content&apos;, message: &apos;내용 오류&apos;, code: &apos;MAX_LENGTH&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        },
        clearAllErrors: mockClearAllErrors
      })

      render(<FormValidation dismissible showSummary />)

      const dismissAllButton = screen.getByRole(&apos;button&apos;, { name: /모든 오류 닫기/i })
      await user.click(dismissAllButton)

      expect(mockClearAllErrors).toHaveBeenCalled()
    })

    it(&apos;should auto-dismiss errors after timeout&apos;, () => {
      jest.useFakeTimers()

      const mockClearFieldError = jest.fn()
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        },
        clearFieldError: mockClearFieldError
      })

      render(<FormValidation autoDismiss={3000} />)

      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(mockClearFieldError).toHaveBeenCalledWith(&apos;title&apos;)

      jest.useRealTimers()
    })
  })

  describe(&apos;Custom Styling&apos;, () => {
    it(&apos;should apply custom error styles&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation errorClassName=&quot;custom-error&quot; />)

      const errorElement = screen.getByText(&apos;제목 오류&apos;)
      expect(errorElement).toHaveClass(&apos;custom-error&apos;)
    })

    it(&apos;should apply custom warning styles&apos;, () => {
      const warnings: ValidationWarning[] = [
        { field: &apos;title&apos;, message: &apos;제목 경고&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          warnings
        }
      })

      render(<FormValidation showWarnings warningClassName=&quot;custom-warning&quot; />)

      const warningElement = screen.getByText(&apos;제목 경고&apos;)
      expect(warningElement).toHaveClass(&apos;custom-warning&apos;)
    })

    it(&apos;should support custom error templates&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      const ErrorTemplate = ({ error }: { error: ValidationError }) => (
        <div data-testid=&quot;custom-error&quot;>
          <strong>{error.field}:</strong> {error.message}
        </div>
      )

      render(<FormValidation ErrorComponent={ErrorTemplate} />)

      const customError = screen.getByTestId(&apos;custom-error&apos;)
      expect(customError).toHaveTextContent(&apos;title: 제목 오류&apos;)
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    it(&apos;should have proper ARIA attributes&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation />)

      const errorList = screen.getByRole(&apos;list&apos;)
      expect(errorList).toHaveAttribute(&apos;aria-label&apos;, &apos;폼 검증 오류&apos;)

      const errorItem = screen.getByRole(&apos;listitem&apos;)
      expect(errorItem).toHaveAttribute(&apos;aria-describedby&apos;)
    })

    it(&apos;should announce errors to screen readers&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation announceErrors />)

      expect(screen.getByRole(&apos;status&apos;)).toBeInTheDocument()
      expect(screen.getByRole(&apos;status&apos;)).toHaveTextContent(&apos;제목 오류&apos;)
    })

    it(&apos;should support keyboard navigation for dismissible errors&apos;, async () => {
      const user = userEvent.setup()
      const mockClearFieldError = jest.fn()

      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        },
        clearFieldError: mockClearFieldError
      })

      render(<FormValidation dismissible />)

      const dismissButton = screen.getByRole(&apos;button&apos;, { name: /닫기/i })

      dismissButton.focus()
      expect(dismissButton).toHaveFocus()

      await user.keyboard(&apos;{Enter}&apos;)
      expect(mockClearFieldError).toHaveBeenCalledWith(&apos;title&apos;)
    })
  })

  describe(&apos;Field Targeting&apos;, () => {
    it(&apos;should show errors only for specific fields&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;content&apos;, message: &apos;내용 오류&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;author&apos;, message: &apos;작성자 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation fields={[&apos;title&apos;, &apos;content&apos;]} />)

      expect(screen.getByText(&apos;제목 오류&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;내용 오류&apos;)).toBeInTheDocument()
      expect(screen.queryByText(&apos;작성자 오류&apos;)).not.toBeInTheDocument()
    })

    it(&apos;should exclude specified fields from validation display&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;content&apos;, message: &apos;내용 오류&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;captcha&apos;, message: &apos;CAPTCHA 필요&apos;, code: &apos;CAPTCHA_REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation excludeFields={[&apos;captcha&apos;]} />)

      expect(screen.getByText(&apos;제목 오류&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;내용 오류&apos;)).toBeInTheDocument()
      expect(screen.queryByText(&apos;CAPTCHA 필요&apos;)).not.toBeInTheDocument()
    })
  })

  describe(&apos;Animation and Transitions&apos;, () => {
    it(&apos;should animate error appearance and disappearance&apos;, () => {
      const { rerender } = render(<FormValidation animated />)

      // Add error
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      rerender(<FormValidation animated />)

      const errorElement = screen.getByText(&apos;제목 오류&apos;)
      expect(errorElement.closest(&apos;.validation-error&apos;)).toHaveClass(&apos;error-enter&apos;)
    })

    it(&apos;should stagger multiple error animations&apos;, async () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;content&apos;, message: &apos;내용 오류&apos;, code: &apos;REQUIRED&apos; },
        { field: &apos;author&apos;, message: &apos;작성자 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation animated staggerDelay={100} />)

      const errorElements = screen.getAllByRole(&apos;listitem&apos;)

      errorElements.forEach((element, index) => {
        expect(element).toHaveStyle(`animation-delay: ${index * 100}ms`)
      })
    })
  })

  describe(&apos;Integration with Form Context&apos;, () => {
    it(&apos;should integrate with form submission state&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(
        <form>
          <FormValidation preventSubmit />
          <button type=&quot;submit&quot;>제출</button>
        </form>
      )

      const submitButton = screen.getByRole(&apos;button&apos;, { name: /제출/i })
      expect(submitButton).toBeDisabled()
    })

    it(&apos;should focus first error field on validation trigger&apos;, () => {
      const errors: ValidationError[] = [
        { field: &apos;title&apos;, message: &apos;제목 오류&apos;, code: &apos;REQUIRED&apos; }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(
        <div>
          <input name=&quot;title&quot; data-testid=&quot;title-input&quot; />
          <FormValidation focusFirstError />
        </div>
      )

      const titleInput = screen.getByTestId(&apos;title-input&apos;)
      expect(titleInput).toHaveFocus()
    })
  })
})