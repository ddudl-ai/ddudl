// Validation utility types for the post writing form refactoring

export type ValidationResult<T = unknown> = {
  isValid: boolean;
  value?: T;
  error?: string;
  errors?: Array<{ error: string; code: string }>;
  code?: string;
};

export type AsyncValidationResult<T = unknown> = Promise<ValidationResult<T>>;

export type FieldValidator<T = unknown> = (value: T) => ValidationResult<T>;
export type AsyncFieldValidator<T = unknown> = (value: T) => AsyncValidationResult<T>;

export interface ValidationRule<T = unknown> {
  name: string;
  validator: FieldValidator<T>;
  message: string;
  code: string;
}

export interface AsyncValidationRule<T = unknown> {
  name: string;
  validator: AsyncFieldValidator<T>;
  message: string;
  code: string;
}

export interface FieldValidationConfig<T = unknown> {
  required?: boolean;
  rules: ValidationRule<T>[];
  asyncRules?: AsyncValidationRule<T>[];
  debounceMs?: number;
}

export interface FormValidationConfig {
  title: FieldValidationConfig<string>;
  content: FieldValidationConfig<string>;
  authorName: FieldValidationConfig<string>;
  flair: FieldValidationConfig<string>;
  images: FieldValidationConfig<File[]>;
  captcha: FieldValidationConfig<boolean>;
}

// Built-in validation rule types
export interface LengthValidationOptions {
  min?: number;
  max?: number;
  message?: string;
}

export interface PatternValidationOptions {
  pattern: RegExp;
  message?: string;
  flags?: string;
}

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  maxCount?: number;
  allowedTypes?: string[];
  dimensions?: {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
  };
  message?: string;
}

// Form field validation states
export type FieldValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export interface FieldValidationInfo {
  state: FieldValidationState;
  error?: string;
  code?: string;
  touched: boolean;
  dirty: boolean;
}

export interface FormValidationState {
  [fieldName: string]: FieldValidationInfo;
}

// Validation context
export interface ValidationContext {
  formData: Record<string, unknown>;
  fieldName: string;
  currentValue: unknown;
  previousValue?: unknown;
  isSubmitting?: boolean;
}

// Error aggregation
export interface ValidationErrorSummary {
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
  fieldErrors: Record<string, string>;
  fieldWarnings: Record<string, string>;
  globalErrors: string[];
  globalWarnings: string[];
}

// Validation event types
export type ValidationTrigger = 'onChange' | 'onBlur' | 'onSubmit' | 'manual';

export interface ValidationEvent<T = unknown> {
  trigger: ValidationTrigger;
  fieldName: string;
  value: T;
  previousValue?: T;
  context: ValidationContext;
}

// Validation hook types
export interface UseValidationOptions {
  mode?: 'onChange' | 'onBlur' | 'onSubmit';
  revalidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  shouldFocusError?: boolean;
  delayError?: number;
}

export interface UseValidationReturn<T extends Record<string, unknown>> {
  errors: Record<keyof T, string | undefined>;
  warnings: Record<keyof T, string | undefined>;
  isValid: boolean;
  isValidating: boolean;
  touched: Record<keyof T, boolean>;
  dirty: Record<keyof T, boolean>;
  validate: (field?: keyof T) => Promise<boolean>;
  validateField: <K extends keyof T>(field: K, value: T[K]) => Promise<ValidationResult<T[K]>>;
  clearError: (field: keyof T) => void;
  clearAllErrors: () => void;
  reset: () => void;
  setError: (field: keyof T, error: string) => void;
  getFieldState: (field: keyof T) => FieldValidationInfo;
}

// Specific validation types for post form
export interface PostFormValidationData {
  title: string;
  content: string;
  authorName: string;
  flair: string;
  images: File[];
  captcha: boolean;
  allowGuestComments: boolean;
}

export type PostFormValidationErrors = {
  [K in keyof PostFormValidationData]?: string;
};

export type PostFormValidationWarnings = {
  [K in keyof PostFormValidationData]?: string;
};

// Custom validation function types
export type TitleValidator = FieldValidator<string>;
export type ContentValidator = FieldValidator<string>;
export type AuthorValidator = FieldValidator<string>;
export type ImageValidator = FieldValidator<File[]>;
export type CaptchaValidator = FieldValidator<boolean>;

// Validation constants
export const VALIDATION_CODES = {
  REQUIRED: 'REQUIRED',
  MIN_LENGTH: 'MIN_LENGTH',
  MAX_LENGTH: 'MAX_LENGTH',
  PATTERN: 'PATTERN',
  RESERVED_WORD: 'RESERVED_WORD',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  DIMENSIONS_TOO_LARGE: 'DIMENSIONS_TOO_LARGE',
  DIMENSIONS_TOO_SMALL: 'DIMENSIONS_TOO_SMALL',
  INVALID_URL: 'INVALID_URL',
  CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
  CUSTOM: 'CUSTOM',
} as const;

export type ValidationCode = typeof VALIDATION_CODES[keyof typeof VALIDATION_CODES];

// Validation message templates
export interface ValidationMessages {
  [VALIDATION_CODES.REQUIRED]: string;
  [VALIDATION_CODES.MIN_LENGTH]: string;
  [VALIDATION_CODES.MAX_LENGTH]: string;
  [VALIDATION_CODES.PATTERN]: string;
  [VALIDATION_CODES.RESERVED_WORD]: string;
  [VALIDATION_CODES.FILE_TOO_LARGE]: string;
  [VALIDATION_CODES.TOO_MANY_FILES]: string;
  [VALIDATION_CODES.INVALID_FILE_TYPE]: string;
  [VALIDATION_CODES.DIMENSIONS_TOO_LARGE]: string;
  [VALIDATION_CODES.DIMENSIONS_TOO_SMALL]: string;
  [VALIDATION_CODES.INVALID_URL]: string;
  [VALIDATION_CODES.CAPTCHA_REQUIRED]: string;
  [VALIDATION_CODES.CUSTOM]: string;
}

// Performance optimization types
export interface ValidationCache {
  get<T>(key: string): ValidationResult<T> | undefined;
  set<T>(key: string, result: ValidationResult<T>): void;
  clear(): void;
  has(key: string): boolean;
}

export interface ValidationThrottleConfig {
  wait: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface ValidationDebounceConfig {
  wait: number;
  immediate?: boolean;
}