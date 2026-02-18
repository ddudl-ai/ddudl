// T024: Implementation of FormValidation component
// Following TDD GREEN phase - making tests pass

'use client'

import React, { useEffect, useRef, useState, ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { useFormValidation, type UseFormValidationReturn } from '../../hooks/useFormValidation'
import type { ValidationError, ValidationWarning, ValidationState } from '../../types/forms'

export interface FormValidationProps {
  children?: ReactNode
  className?: string
  mode?: 'onChange' | 'onBlur' | 'onSubmit'
  debounceMs?: number
  showSummary?: boolean
  showWarnings?: boolean
  groupByField?: boolean
  showIcons?: boolean
  dismissible?: boolean
  autoDismiss?: number
  errorClassName?: string
  warningClassName?: string
  ErrorComponent?: React.ComponentType<{ error: ValidationError }>
  WarningComponent?: React.ComponentType<{ warning: ValidationWarning }>
  announceErrors?: boolean
  fields?: string[]
  excludeFields?: string[]
  animated?: boolean
  staggerDelay?: number
  preventSubmit?: boolean
  focusFirstError?: boolean
  validation?: UseFormValidationReturn
}

interface ErrorIconProps {
  code: string
  className?: string
}

function ErrorIcon({ code, className }: ErrorIconProps) {
  const getIcon = (code: string) => {
    switch (code) {
      case 'REQUIRED': return '⚠️'
      case 'PATTERN': return '🔤'
      case 'FILE_TOO_LARGE': return '📁'
      case 'MIN_LENGTH':
      case 'MAX_LENGTH': return '📏'
      default: return '❌'
    }
  }

  return (
    <span
      className={cn('inline-flex items-center justify-center', className)}
      data-testid={`error-icon-${code.toLowerCase().replace('_', '-')}`}
    >
      {getIcon(code)}
    </span>
  )
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center justify-center text-green-600', className)}
      data-testid="success-icon"
    >
      ✅
    </span>
  )
}

function DefaultErrorComponent({ error }: { error: ValidationError }) {
  return (
    <div className="text-red-600 text-sm flex items-center gap-2">
      <ErrorIcon code={error.code} />
      <span>{error.message}</span>
    </div>
  )
}

function DefaultWarningComponent({ warning }: { warning: ValidationWarning }) {
  return (
    <div className="text-amber-600 text-sm flex items-center gap-2">
      <span>⚠️</span>
      <span>{warning.message}</span>
    </div>
  )
}

export function FormValidation({
  children,
  className,
  mode = 'onBlur',
  debounceMs = 300,
  showSummary = false,
  showWarnings = false,
  groupByField = false,
  showIcons = false,
  dismissible = false,
  autoDismiss,
  errorClassName,
  warningClassName,
  ErrorComponent = DefaultErrorComponent,
  WarningComponent = DefaultWarningComponent,
  announceErrors = false,
  fields,
  excludeFields = [],
  animated = false,
  staggerDelay = 100,
  preventSubmit = false,
  focusFirstError = false,
  validation
}: FormValidationProps) {
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set())
  const announceRef = useRef<HTMLDivElement>(null)

  const formValidation = useFormValidation({}, {
    mode,
    shouldFocusError: focusFirstError,
    delayError: debounceMs
  })

  const validationToUse = validation || formValidation
  const { validationState, clearFieldError, clearAllErrors } = validationToUse

  // Auto-dismiss errors
  useEffect(() => {
    if (!autoDismiss) return

    const timer = setTimeout(() => {
      validationState.errors.forEach(error => {
        if (!dismissedErrors.has(error.field)) {
          clearFieldError(error.field)
        }
      })
    }, autoDismiss)

    return () => clearTimeout(timer)
  }, [validationState.errors, autoDismiss, dismissedErrors, clearFieldError])

  // Form submission prevention
  useEffect(() => {
    if (!preventSubmit) return

    const form = document.querySelector('form')
    if (!form) return

    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement
    if (!submitButton) return

    if (!validationState.isValid) {
      submitButton.disabled = true
    } else {
      submitButton.disabled = false
    }
  }, [validationState.isValid, preventSubmit])

  // Focus first error field
  useEffect(() => {
    if (!focusFirstError || validationState.errors.length === 0) return

    const firstError = validationState.errors[0]
    const element = document.querySelector(`[name="${firstError.field}"]`) as HTMLElement
    element?.focus()
  }, [validationState.errors, focusFirstError])

  // Announce errors to screen readers
  useEffect(() => {
    if (!announceErrors || !announceRef.current) return

    if (validationState.errors.length > 0) {
      announceRef.current.textContent = validationState.errors[0].message
    } else {
      announceRef.current.textContent = ''
    }
  }, [validationState.errors, announceErrors])

  // Handle input events for real-time validation
  useEffect(() => {
    if (!children || mode === 'onSubmit') return

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement
      if (target.name) {
        const eventType = e.type
        if ((mode === 'onChange' && eventType === 'input') ||
            (mode === 'onBlur' && eventType === 'blur')) {
          validationToUse.validateField(target.name, target.value)
        }
      }
    }

    document.addEventListener('input', handleInput)
    document.addEventListener('blur', handleInput, true)

    return () => {
      document.removeEventListener('input', handleInput)
      document.removeEventListener('blur', handleInput, true)
    }
  }, [mode, validationToUse])

  const handleDismissError = (field: string) => {
    clearFieldError(field)
    setDismissedErrors(prev => new Set([...prev, field]))
  }

  const handleDismissAll = () => {
    clearAllErrors()
    setDismissedErrors(prev => new Set([...prev, ...validationState.errors.map(e => e.field)]))
  }

  // Filter errors and warnings based on props
  const filteredErrors = validationState.errors.filter(error => {
    if (fields && !fields.includes(error.field)) return false
    if (excludeFields.includes(error.field)) return false
    if (dismissedErrors.has(error.field)) return false
    return true
  })

  const filteredWarnings = validationState.warnings.filter(warning => {
    if (fields && !fields.includes(warning.field)) return false
    if (excludeFields.includes(warning.field)) return false
    return true
  })

  // Group errors by field if requested
  const groupedErrors = groupByField
    ? filteredErrors.reduce((acc, error) => {
        if (!acc[error.field]) acc[error.field] = []
        acc[error.field].push(error)
        return acc
      }, {} as Record<string, ValidationError[]>)
    : null

  return (
    <div className={cn('form-validation', className)}>
      {/* Screen reader announcement */}
      {announceErrors && (
        <div
          ref={announceRef}
          role="status"
          aria-live="polite"
          className="sr-only"
        />
      )}

      {/* Validation Summary */}
      {showSummary && (
        <div className="mb-4">
          {validationState.isValid ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <SuccessIcon />
              <span>폼이 유효합니다</span>
            </div>
          ) : (
            <div className="text-red-600 text-sm">
              {filteredErrors.length > 0 && filteredWarnings.length > 0 ? (
                <span>{filteredErrors.length}개의 오류, {filteredWarnings.length}개의 경고</span>
              ) : filteredErrors.length > 0 ? (
                <span>{filteredErrors.length}개의 오류가 발견되었습니다</span>
              ) : null}
              {dismissible && filteredErrors.length > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="ml-2 text-blue-600 hover:text-blue-700 underline"
                  aria-label="모든 오류 닫기"
                >
                  모든 오류 닫기
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grouped Errors */}
      {groupByField && groupedErrors && (
        <div className="space-y-4">
          {Object.entries(groupedErrors).map(([field, fieldErrors]) => (
            <div
              key={field}
              data-testid={`validation-field-${field}`}
              className="border-l-4 border-red-500 pl-4"
            >
              <div className="font-medium text-sm text-gray-700 mb-1">
                {field}
              </div>
              <ul className="space-y-1" role="list" aria-label="폼 검증 오류">
                {fieldErrors.map((error, index) => (
                  <li
                    key={`${error.field}-${index}`}
                    className={cn(
                      'validation-error flex items-start justify-between',
                      animated && 'error-enter',
                      errorClassName
                    )}
                    style={animated ? { animationDelay: `${index * staggerDelay}ms` } : undefined}
                    role="listitem"
                  >
                    <ErrorComponent error={error} />
                    {dismissible && (
                      <button
                        onClick={() => handleDismissError(error.field)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        aria-label="닫기"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Regular Error List */}
      {!groupByField && filteredErrors.length > 0 && (
        <ul className="space-y-2 mb-4" role="list" aria-label="폼 검증 오류">
          {filteredErrors.map((error, index) => (
            <li
              key={`${error.field}-${error.code}`}
              className={cn(
                'validation-error flex items-start justify-between',
                animated && 'error-enter',
                errorClassName
              )}
              style={animated ? { animationDelay: `${index * staggerDelay}ms` } : undefined}
              role="listitem"
              aria-describedby={`error-${error.field}-${error.code}`}
            >
              <div role="alert" id={`error-${error.field}-${error.code}`}>
                <ErrorComponent error={error} />
              </div>
              {dismissible && (
                <button
                  onClick={() => handleDismissError(error.field)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  aria-label="닫기"
                  tabIndex={0}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Warnings */}
      {showWarnings && filteredWarnings.length > 0 && (
        <ul className="space-y-2 mb-4" role="list" aria-label="폼 검증 경고">
          {filteredWarnings.map((warning, index) => (
            <li
              key={`${warning.field}-${index}`}
              className={cn(
                'validation-warning',
                animated && 'warning-enter',
                warningClassName
              )}
              style={animated ? { animationDelay: `${index * staggerDelay}ms` } : undefined}
              role="listitem"
            >
              <WarningComponent warning={warning} />
            </li>
          ))}
        </ul>
      )}

      {/* Form children with validation context */}
      {children && (
        <div className="form-fields">
          {React.Children.map(children, child => {
            if (React.isValidElement(child) && typeof child.props === 'object' && child.props !== null && 'name' in child.props) {
              const fieldName = child.props.name as string
              const hasError = validationState.errors.some(e => e.field === fieldName)
              const errorMessage = validationState.errors.find(e => e.field === fieldName)?.message

              const childProps = child.props as any
              return React.cloneElement(child as any, {
                ...childProps,
                className: cn(
                  childProps.className,
                  hasError && 'error'
                ),
                'aria-invalid': hasError,
                'aria-describedby': hasError ? `error-${fieldName}` : undefined
              })
            }
            return child
          })}
        </div>
      )}
    </div>
  )
}