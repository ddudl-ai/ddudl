// WritePostForm UI/UX and Media Attachment Improvements - Type Definitions

export interface MediaAttachment {
  id: string
  post_id: string
  url: string // Supabase Storage public URL
  file_name: string // Original filename
  file_size: number // Size in bytes
  mime_type: string // e.g., 'image/webp', 'image/png'
  upload_status: 'uploading' | 'completed' | 'failed'
  created_at: Date
  optimized: boolean // True if processed by Sharp
  dimensions?: {
    width: number
    height: number
    max_display_width: number
  }
}

export interface WritePostFormState {
  // Form data
  title: string
  content: string
  author_name: string
  selected_flair?: string
  allow_guest_comments: boolean
  captcha_verified: boolean

  // Media upload state
  images: MediaAttachment[]
  uploading: boolean
  upload_progress: number
  upload_error: string | null

  // UI state
  preview_mode: boolean
  editor_content_synced: boolean
  form_validation: ValidationState
  z_index_context: 'editor' | 'preview' | 'modal'
}

export interface ValidationState {
  title: {
    valid: boolean
    error?: string
  }
  content: {
    valid: boolean
    error?: string
  }
  author_name: {
    valid: boolean
    error?: string
  }
  captcha: {
    valid: boolean
    error?: string
  }
}

export interface LayoutContext {
  viewport_width: number
  viewport_height: number
  header_height: number // For z-index calculations
  scroll_position: number
  preview_container_bounds: DOMRect | null
  image_display_constraints: {
    max_width: number // CSS custom property
    max_height: number // CSS custom property
    responsive_breakpoints: Record<string, number>
  }
}

export interface UploadedImage {
  url: string
  fileName: string
  size: number
  mimeType: string
  uploadedAt: string
}

export interface FileValidationError {
  valid: boolean
  error: string
}

export interface UploadResponse {
  success: boolean
  files: string[]
  isImages: boolean[]
  path?: string // legacy field
  baseurl?: string // legacy field
  error?: null
  msg?: string
}

export interface UploadErrorResponse {
  error: {
    message: string
  }
}

// Hook interfaces for component communication
export interface UseImageUploadReturn {
  images: MediaAttachment[]
  uploading: boolean
  uploadProgress: number
  uploadError: string | null
  uploadImages: (files: FileList) => Promise<void>
  removeImage: (id: string) => void
  clearError: () => void
}

export interface UseWritePostFormReturn {
  formState: WritePostFormState
  updateField: (field: keyof WritePostFormState, value: any) => void
  validateForm: () => boolean
  resetForm: () => void
  submitForm: () => Promise<{ success: boolean; error?: string }>
  syncEditorContent: (content: string) => void
}

// Media upload handler types
export interface MediaUploadHandlers {
  onSelectImages: (event: React.ChangeEvent<HTMLInputElement>) => void
  onImageUpload: (files: FileList) => Promise<void>
  onImageRemove: (imageId: string) => void
  onImageInsert: (imageUrl: string) => void
}

// Layout and responsive sizing types
export interface ResponsiveImageProps {
  src: string
  alt: string
  originalWidth?: number
  originalHeight?: number
  maxDisplayWidth?: number
  maxDisplayHeight?: number
  className?: string
  onLoad?: () => void
  onError?: (error: Error) => void
}

export interface ZIndexHierarchy {
  background: number
  editor: number
  preview: number
  modals: number
  header: number
}

// CSS custom properties interface
export interface WritePostCSSVariables {
  '--writepost-header-height': string
  '--writepost-max-image-width': string
  '--writepost-max-image-height': string
  '--writepost-editor-z-index': string
  '--writepost-preview-z-index': string
  '--writepost-header-z-index': string
}

// Upload configuration
export interface UploadConfig {
  maxFileSize: number // bytes
  maxFiles: number
  allowedMimeTypes: string[]
  conversionTarget: 'webp' | 'original'
  qualitySettings: {
    webp: number
    jpeg: number
  }
}

// Content sync types for Jodit editor
export interface EditorContentSync {
  getContent: () => string
  setContent: (content: string) => void
  insertImage: (imageUrl: string, alt?: string) => void
  onContentChange: (callback: (content: string) => void) => void
  onBlur: (callback: () => void) => void
}