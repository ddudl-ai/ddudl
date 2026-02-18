// T024: Implementation of FormValidation component
// Following TDD GREEN phase - making tests pass

'use client&apos;

import React, { useEffect, useRef, useState, ReactNode } from &apos;react&apos;
import { cn } from &apos;../../lib/utils&apos;
import { useFormValidation, type UseFormValidationReturn } from &apos;../../hooks/useFormValidation&apos;
import type { ValidationError, ValidationWarning, ValidationState } from &apos;../../types/forms&apos;

export interface FormValidationProps {
  children?: ReactNode
  className?: string
  mode?: &apos;onChange&apos; | &apos;onBlur&apos; | &apos;onSubmit&apos;
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
      case &apos;REQUIRED&apos;: return &apos;⚠️&apos;
      case &apos;PATTERN&apos;: return &apos;🔤&apos;
      case &apos;FILE_TOO_LARGE&apos;: return &apos;📁&apos;
      case &apos;MIN_LENGTH&apos;:
      case &apos;MAX_LENGTH&apos;: return &apos;📏&apos;
      default: return &apos;❌&apos;
    }
  }

  return (
    <span
      className={cn(&apos;inline-flex items-center justify-center&apos;, className)}
      data-testid={`error-icon-${code.toLowerCase().replace(&apos;_&apos;, &apos;-&apos;)}`}
    >
      {getIcon(code)}
    </span>
  )
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(&apos;inline-flex items-center justify-center text-green-600&apos;, className)}
      data-testid=&quot;success-icon&quot;
    >
      ✅
    </span>
  )
}

function DefaultErrorComponent({ error }: { error: ValidationError }) {
  return (
    <div className=&quot;text-red-600 text-sm flex items-center gap-2&quot;>
      <ErrorIcon code={error.code} />
      <span>{error.message}</span>
    </div>
  )
}

function DefaultWarningComponent({ warning }: { warning: ValidationWarning }) {
  return (
    <div className=&quot;text-amber-600 text-sm flex items-center gap-2&quot;>
      <span>⚠️</span>
      <span>{warning.message}</span>
    </div>
  )
}

export function FormValidation({
  children,
  className,
  mode = &apos;onBlur&apos;,
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

    const form = document.querySelector(&apos;form&apos;)
    if (!form) return

    const submitButton = form.querySelector(&apos;button[type=&quot;submit&quot;]&apos;) as HTMLButtonElement
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
    const element = document.querySelector(`[name=&quot;${firstError.field}&quot;]`) as HTMLElement
    element?.focus()
  }, [validationState.errors, focusFirstError])

  // Announce errors to screen readers
  useEffect(() => {
    if (!announceErrors || !announceRef.current) return

    if (validationState.errors.length > 0) {
      announceRef.current.textContent = validationState.errors[0].message
    } else {
      announceRef.current.textContent = &apos;'
    }
  }, [validationState.errors, announceErrors])

  // Handle input events for real-time validation
  useEffect(() => {
    if (!children || mode === &apos;onSubmit&apos;) return

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement
      if (target.name) {
        const eventType = e.type
        if ((mode === &apos;onChange&apos; && eventType === &apos;input&apos;) ||
            (mode === &apos;onBlur&apos; && eventType === &apos;blur&apos;)) {
          validationToUse.validateField(target.name, target.value)
        }
      }
    }

    document.addEventListener(&apos;input&apos;, handleInput)
    document.addEventListener(&apos;blur&apos;, handleInput, true)

    return () => {
      document.removeEventListener(&apos;input&apos;, handleInput)
      document.removeEventListener(&apos;blur&apos;, handleInput, true)
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
    <div className={cn(&apos;form-validation&apos;, className)}>
      {/* Screen reader announcement */}
      {announceErrors && (
        <div
          ref={announceRef}
          role=&quot;status&quot;
          aria-live=&quot;polite&quot;
          className=&quot;sr-only&quot;
        />
      )}

      {/* Validation Summary */}
      {showSummary && (
        <div className=&quot;mb-4&quot;>
          {validationState.isValid ? (
            <div className=&quot;flex items-center gap-2 text-green-600 text-sm&quot;>
              <SuccessIcon />
              <span>폼이 유효합니다</span>
            </div>
          ) : (
            <div className=&quot;text-red-600 text-sm&quot;>
              {filteredErrors.length > 0 && filteredWarnings.length > 0 ? (
                <span>{filteredErrors.length}개의 오류, {filteredWarnings.length}개의 경고</span>
              ) : filteredErrors.length > 0 ? (
                <span>{filteredErrors.length}개의 오류가 발견되었습니다</span>
              ) : null}
              {dismissible && filteredErrors.length > 0 && (
                <button
                  onClick={handleDismissAll}
                  className=&quot;ml-2 text-blue-600 hover:text-blue-700 underline&quot;
                  aria-label=&quot;모든 오류 닫기&quot;
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
        <div className=&quot;space-y-4&quot;>
          {Object.entries(groupedErrors).map(([field, fieldErrors]) => (
            <div
              key={field}
              data-testid={`validation-field-${field}`}
              className=&quot;border-l-4 border-red-500 pl-4&quot;
            >
              <div className=&quot;font-medium text-sm text-gray-700 mb-1&quot;>
                {field}
              </div>
              <ul className=&quot;space-y-1&quot; role=&quot;list&quot; aria-label=&quot;폼 검증 오류&quot;>
                {fieldErrors.map((error, index) => (
                  <li
                    key={`${error.field}-${index}`}
                    className={cn(
                      &apos;validation-error flex items-start justify-between&apos;,
                      animated && &apos;error-enter&apos;,
                      errorClassName
                    )}
                    style={animated ? { animationDelay: `${index * staggerDelay}ms` } : undefined}
                    role=&quot;listitem&quot;
                  >
                    <ErrorComponent error={error} />
                    {dismissible && (
                      <button
                        onClick={() => handleDismissError(error.field)}
                        className=&quot;ml-2 text-gray-400 hover:text-gray-600&quot;
                        aria-label=&quot;닫기&quot;
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
        <ul className=&quot;space-y-2 mb-4&quot; role=&quot;list&quot; aria-label=&quot;폼 검증 오류&quot;>
          {filteredErrors.map((error, index) => (
            <li
              key={`${error.field}-${error.code}`}
              className={cn(
                &apos;validation-error flex items-start justify-between&apos;,
                animated && &apos;error-enter&apos;,
                errorClassName
              )}
              style={animated ? { animationDelay: `${index * staggerDelay}ms` } : undefined}
              role=&quot;listitem&quot;
              aria-describedby={`error-${error.field}-${error.code}`}
            >
              <div role=&quot;alert&quot; id={`error-${error.field}-${error.code}`}>
                <ErrorComponent error={error} />
              </div>
              {dismissible && (
                <button
                  onClick={() => handleDismissError(error.field)}
                  className=&quot;ml-2 text-gray-400 hover:text-gray-600&quot;
                  aria-label=&quot;닫기&quot;
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
        <ul className=&quot;space-y-2 mb-4&quot; role=&quot;list&quot; aria-label=&quot;폼 검증 경고&quot;>
          {filteredWarnings.map((warning, index) => (
            <li
              key={`${warning.field}-${index}`}
              className={cn(
                &apos;validation-warning&apos;,
                animated && &apos;warning-enter&apos;,
                warningClassName
              )}
              style={animated ? { animationDelay: `${index * staggerDelay}ms` } : undefined}
              role=&quot;listitem&quot;
            >
              <WarningComponent warning={warning} />
            </li>
          ))}
        </ul>
      )}

      {/* Form children with validation context */}
      {children && (
        <div className=&quot;form-fields&quot;>
          {React.Children.map(children, child => {
            if (React.isValidElement(child) && typeof child.props === &apos;object&apos; && child.props !== null && &apos;name&apos; in child.props) {
              const fieldName = child.props.name as string
              const hasError = validationState.errors.some(e => e.field === fieldName)
              const errorMessage = validationState.errors.find(e => e.field === fieldName)?.message

              const childProps = child.props as any
              return React.cloneElement(child as any, {
                ...childProps,
                className: cn(
                  childProps.className,
                  hasError && &apos;error&apos;
                ),
                &apos;aria-invalid&apos;: hasError,
                &apos;aria-describedby&apos;: hasError ? `error-${fieldName}` : undefined
              })
            }
            return child
          })}
        </div>
      )}
    </div>
  )
}