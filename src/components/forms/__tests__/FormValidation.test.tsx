// T014: Unit test for FormValidation module - TDD Phase
// This test MUST FAIL before implementation

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormValidation } from '../FormValidation'
import type { ValidationState, ValidationError, ValidationWarning } from '../../../types/forms'

// Mock useFormValidation hook
jest.mock('../../../hooks/useFormValidation', () => ({
  useFormValidation: jest.fn()
}))

const mockUseFormValidation = require('../../../hooks/useFormValidation').useFormValidation

describe('FormValidation', () => {
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

  describe('Error Display', () => {
    it('should render field errors', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목은 필수입니다', code: 'REQUIRED' },
        { field: 'content', message: '내용이 너무 깁니다', code: 'MAX_LENGTH' }
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

      expect(screen.getByText('제목은 필수입니다')).toBeInTheDocument()
      expect(screen.getByText('내용이 너무 깁니다')).toBeInTheDocument()
    })

    it('should render warnings separately from errors', () => {
      const warnings: ValidationWarning[] = [
        { field: 'title', message: '제목이 너무 짧습니다' },
        { field: 'authorName', message: '추천하지 않는 User명입니다' }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          warnings
        }
      })

      render(<FormValidation showWarnings />)

      expect(screen.getByText('제목이 너무 짧습니다')).toBeInTheDocument()
      expect(screen.getByText('추천하지 않는 User명입니다')).toBeInTheDocument()
    })

    it('should group errors by field', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목은 필수입니다', code: 'REQUIRED' },
        { field: 'title', message: '제목이 너무 짧습니다', code: 'MIN_LENGTH' },
        { field: 'content', message: '내용이 필요합니다', code: 'REQUIRED' }
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

      const titleSection = screen.getByTestId('validation-field-title')
      expect(titleSection).toContainHTML('제목은 필수입니다')
      expect(titleSection).toContainHTML('제목이 너무 짧습니다')

      const contentSection = screen.getByTestId('validation-field-content')
      expect(contentSection).toContainHTML('내용이 필요합니다')
    })

    it('should show error icons for different error types', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '필수 필드입니다', code: 'REQUIRED' },
        { field: 'content', message: '패턴이 맞지 않습니다', code: 'PATTERN' },
        { field: 'images', message: '파일이 너무 큽니다', code: 'FILE_TOO_LARGE' }
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

      expect(screen.getByTestId('error-icon-required')).toBeInTheDocument()
      expect(screen.getByTestId('error-icon-pattern')).toBeInTheDocument()
      expect(screen.getByTestId('error-icon-file')).toBeInTheDocument()
    })
  })

  describe('Validation Summary', () => {
    it('should show validation summary when errors exist', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' },
        { field: 'content', message: '내용 오류', code: 'MAX_LENGTH' }
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

      expect(screen.getByText('2개의 오류가 발견되었습니다')).toBeInTheDocument()
    })

    it('should show success message when form is valid', () => {
      render(<FormValidation showSummary />)

      expect(screen.getByText('폼이 유효합니다')).toBeInTheDocument()
      expect(screen.getByTestId('success-icon')).toBeInTheDocument()
    })

    it('should show mixed summary with errors and warnings', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
      ]
      const warnings: ValidationWarning[] = [
        { field: 'content', message: '내용 경고' }
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

      expect(screen.getByText('1개의 오류, 1개의 경고')).toBeInTheDocument()
    })
  })

  describe('Real-time Validation', () => {
    it('should trigger field validation on blur', async () => {
      const mockValidateField = jest.fn()

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validateField: mockValidateField
      })

      render(
        <FormValidation mode="onBlur">
          <input name="title" data-testid="title-input" />
        </FormValidation>
      )

      const titleInput = screen.getByTestId('title-input')

      fireEvent.blur(titleInput)

      expect(mockValidateField).toHaveBeenCalledWith('title', expect.anything())
    })

    it('should trigger field validation on change in onChange mode', async () => {
      const mockValidateField = jest.fn()

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validateField: mockValidateField
      })

      render(
        <FormValidation mode="onChange">
          <input name="title" data-testid="title-input" />
        </FormValidation>
      )

      const titleInput = screen.getByTestId('title-input')

      fireEvent.change(titleInput, { target: { value: 'new value' } })

      expect(mockValidateField).toHaveBeenCalledWith('title', 'new value')
    })

    it('should debounce validation in onChange mode', async () => {
      jest.useFakeTimers()
      const mockValidateField = jest.fn()

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validateField: mockValidateField
      })

      render(
        <FormValidation mode="onChange" debounceMs={500}>
          <input name="title" data-testid="title-input" />
        </FormValidation>
      )

      const titleInput = screen.getByTestId('title-input')

      // Rapid typing
      fireEvent.change(titleInput, { target: { value: 'a' } })
      fireEvent.change(titleInput, { target: { value: 'ab' } })
      fireEvent.change(titleInput, { target: { value: 'abc' } })

      expect(mockValidateField).not.toHaveBeenCalled()

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(mockValidateField).toHaveBeenCalledTimes(1)
      expect(mockValidateField).toHaveBeenCalledWith('title', 'abc')

      jest.useRealTimers()
    })
  })

  describe('Error Dismissal', () => {
    it('should allow dismissing individual field errors', async () => {
      const user = userEvent.setup()
      const mockClearFieldError = jest.fn()

      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
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

      const dismissButton = screen.getByRole('button', { name: /닫기/i })
      await user.click(dismissButton)

      expect(mockClearFieldError).toHaveBeenCalledWith('title')
    })

    it('should allow dismissing all errors at once', async () => {
      const user = userEvent.setup()
      const mockClearAllErrors = jest.fn()

      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' },
        { field: 'content', message: '내용 오류', code: 'MAX_LENGTH' }
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

      const dismissAllButton = screen.getByRole('button', { name: /모든 오류 닫기/i })
      await user.click(dismissAllButton)

      expect(mockClearAllErrors).toHaveBeenCalled()
    })

    it('should auto-dismiss errors after timeout', () => {
      jest.useFakeTimers()

      const mockClearFieldError = jest.fn()
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
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

      expect(mockClearFieldError).toHaveBeenCalledWith('title')

      jest.useRealTimers()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom error styles', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation errorClassName="custom-error" />)

      const errorElement = screen.getByText('제목 오류')
      expect(errorElement).toHaveClass('custom-error')
    })

    it('should apply custom warning styles', () => {
      const warnings: ValidationWarning[] = [
        { field: 'title', message: '제목 경고' }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          warnings
        }
      })

      render(<FormValidation showWarnings warningClassName="custom-warning" />)

      const warningElement = screen.getByText('제목 경고')
      expect(warningElement).toHaveClass('custom-warning')
    })

    it('should support custom error templates', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
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
        <div data-testid="custom-error">
          <strong>{error.field}:</strong> {error.message}
        </div>
      )

      render(<FormValidation ErrorComponent={ErrorTemplate} />)

      const customError = screen.getByTestId('custom-error')
      expect(customError).toHaveTextContent('title: 제목 오류')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
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

      const errorList = screen.getByRole('list')
      expect(errorList).toHaveAttribute('aria-label', '폼 검증 오류')

      const errorItem = screen.getByRole('listitem')
      expect(errorItem).toHaveAttribute('aria-describedby')
    })

    it('should announce errors to screen readers', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
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

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('제목 오류')
    })

    it('should support keyboard navigation for dismissible errors', async () => {
      const user = userEvent.setup()
      const mockClearFieldError = jest.fn()

      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
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

      const dismissButton = screen.getByRole('button', { name: /닫기/i })

      dismissButton.focus()
      expect(dismissButton).toHaveFocus()

      await user.keyboard('{Enter}')
      expect(mockClearFieldError).toHaveBeenCalledWith('title')
    })
  })

  describe('Field Targeting', () => {
    it('should show errors only for specific fields', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' },
        { field: 'content', message: '내용 오류', code: 'REQUIRED' },
        { field: 'author', message: '작성자 오류', code: 'REQUIRED' }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation fields={['title', 'content']} />)

      expect(screen.getByText('제목 오류')).toBeInTheDocument()
      expect(screen.getByText('내용 오류')).toBeInTheDocument()
      expect(screen.queryByText('작성자 오류')).not.toBeInTheDocument()
    })

    it('should exclude specified fields from validation display', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' },
        { field: 'content', message: '내용 오류', code: 'REQUIRED' },
        { field: 'captcha', message: 'CAPTCHA 필요', code: 'CAPTCHA_REQUIRED' }
      ]

      mockUseFormValidation.mockReturnValue({
        ...defaultHookReturn,
        validationState: {
          ...defaultValidationState,
          isValid: false,
          errors
        }
      })

      render(<FormValidation excludeFields={['captcha']} />)

      expect(screen.getByText('제목 오류')).toBeInTheDocument()
      expect(screen.getByText('내용 오류')).toBeInTheDocument()
      expect(screen.queryByText('CAPTCHA 필요')).not.toBeInTheDocument()
    })
  })

  describe('Animation and Transitions', () => {
    it('should animate error appearance and disappearance', () => {
      const { rerender } = render(<FormValidation animated />)

      // Add error
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
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

      const errorElement = screen.getByText('제목 오류')
      expect(errorElement.closest('.validation-error')).toHaveClass('error-enter')
    })

    it('should stagger multiple error animations', async () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' },
        { field: 'content', message: '내용 오류', code: 'REQUIRED' },
        { field: 'author', message: '작성자 오류', code: 'REQUIRED' }
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

      const errorElements = screen.getAllByRole('listitem')

      errorElements.forEach((element, index) => {
        expect(element).toHaveStyle(`animation-delay: ${index * 100}ms`)
      })
    })
  })

  describe('Integration with Form Context', () => {
    it('should integrate with form submission state', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
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
          <button type="submit">제출</button>
        </form>
      )

      const submitButton = screen.getByRole('button', { name: /제출/i })
      expect(submitButton).toBeDisabled()
    })

    it('should focus first error field on validation trigger', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: '제목 오류', code: 'REQUIRED' }
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
          <input name="title" data-testid="title-input" />
          <FormValidation focusFirstError />
        </div>
      )

      const titleInput = screen.getByTestId('title-input')
      expect(titleInput).toHaveFocus()
    })
  })
})