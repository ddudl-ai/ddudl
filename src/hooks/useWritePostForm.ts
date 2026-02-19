// T026: Implementation of useWritePostForm main hook
// Following TDD GREEN phase - making tests pass

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useImageUpload } from './useImageUpload'
import { useLinkPreview } from './useLinkPreview'
import { useFormValidation } from './useFormValidation'
import { sanitizeFormData, validatePostData } from '../lib/utils/formHelpers'
import type {
  PostFormData,
  UploadedImage,
  LinkPreviewData,
  ValidationState,
  ValidationError,
  FormStatus
} from '../types/forms'

export interface UseWritePostFormOptions {
  channelName?: string
  mode?: 'create' | 'edit'
  initialData?: Partial<PostFormData>
  draftKey?: string
  autoSave?: boolean
  autoSaveInterval?: number
}

export interface UseWritePostFormReturn {
  // Form data
  formData: PostFormData
  setFormData: (data: Partial<PostFormData>) => void
  updateField: <K extends keyof PostFormData>(field: K, value: PostFormData[K]) => void

  // Form status
  status: FormStatus
  submitting: boolean
  canSubmit: boolean

  // Validation
  validation: ValidationState
  errors: ValidationError[]
  validateForm: () => Promise<boolean>
  clearErrors: () => void

  // Images
  images: UploadedImage[]
  uploading: boolean
  uploadProgress: number
  uploadError: string | null

  // Link preview
  linkPreview: LinkPreviewData | null
  linkPreviewLoading: boolean

  // Actions
  handleSubmit: () => Promise<{ success: boolean; data?: any; error?: string }>
  handleSaveDraft: () => Promise<void>
  handleReset: () => void

  // Draft management
  hasDraft: boolean
  draftSavedAt: Date | null
  loadDraft: () => void
  clearDraft: () => void

  // Utility
  getCharacterCount: (field: keyof PostFormData) => number
  getRemainingChars: (field: keyof PostFormData) => number

  // Legacy compatibility - to maintain existing interface
  title: string
  content: string
  authorName: string
  selectedFlair: string
  allowGuestComments: boolean
  error: string | null
  previewMode: boolean
  linkPreviews: any[]
  pastedImages: any[]
  uploadingFiles: any[]
  isSubmitDisabled: boolean
  user: any
  postId: string | null
  setTitle: (title: string) => void
  setContent: (content: string) => void
  setAuthorName: (name: string) => void
  setSelectedFlair: (flair: string) => void
  setAllowGuestComments: (allow: boolean) => void
  setPreviewMode: (mode: boolean) => void
  setError: (error: string | null) => void
  handleCancel: () => void
  handleFileSelection: (files: FileList) => Promise<Array<{ success: boolean; url?: string; error?: string }>>
  handleImageAdded: (url: string, fileName: string, size: number) => void
}

const TITLE_MAX_LENGTH = 300
const CONTENT_MAX_LENGTH = 10000
const DEFAULT_AUTO_SAVE_INTERVAL = 30000 // 30 seconds

export const useWritePostForm = (options: UseWritePostFormOptions & { channelName: string }): UseWritePostFormReturn => {
  const {
    channelName,
    mode = 'create',
    initialData = {},
    draftKey,
    autoSave = true,
    autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL
  } = options

  // Legacy state for backward compatibility
  const [previewMode, setPreviewMode] = useState(false)

  // External hooks
  const { user, initialize } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const postId = searchParams.get('edit')

  // Form state
  const [formData, setFormDataState] = useState<PostFormData>(() => ({
    title: '',
    content: '',
    authorName: '',
    channelName,
    allowGuestComments: true,
    ...initialData
  }))

  const [status, setStatus] = useState<FormStatus>('INITIAL')
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const submitController = useRef<AbortController | null>(null)

  // Hooks
  const imageUpload = useImageUpload({
    maxImages: 10,
    maxFileSize: 5 * 1024 * 1024
  })

  const linkPreview = useLinkPreview({
    autoPreview: true,
    debounceMs: 500
  })

  const validation = useFormValidation({}, {
    mode: 'onChange',
    shouldFocusError: true
  })

  // Initialize auth
  useEffect(() => {
    initialize()
  }, [initialize])

  // Set author name based on user (login required)
  useEffect(() => {
    if (user) {
      setFormDataState(prev => ({
        ...prev,
        authorName: user.user_metadata?.username || 'user'
      }))
    } else {
      // Require login - no anonymous posting allowed
      setFormDataState(prev => ({
        ...prev,
        authorName: ''
      }))
    }
  }, [user])

  // Load post data if editing
  useEffect(() => {
    if (postId) {
      const fetchPostData = async () => {
        try {
          setStatus('SUBMITTING')
          const response = await fetch(`/api/posts/${postId}`)
          if (!response.ok) {
            throw new Error('post 정보를 불러오는데 failed했습니다.')
          }
          const { post } = await response.json()
          setFormDataState(prev => ({
            ...prev,
            title: post.title,
            content: post.content || '',
            selectedFlair: post.flair || '',
            allowGuestComments: post.allow_guest_comments ?? true
          }))
          setStatus('EDITING')
        } catch (err: any) {
          setError(err.message)
          setStatus('ERROR')
        }
      }
      fetchPostData()
    }
  }, [postId])

  // Computed values
  const submitting = status === 'SUBMITTING'
  const canSubmit = validation.validationState.isValid &&
                   !imageUpload.uploading &&
                   formData.title.trim().length >= 5 &&
                   formData.authorName.trim().length >= 3 &&
                   !!user  // Must be logged in

  const errors = validation.validationState.errors

  // Draft management
  const getDraftKey = useCallback(() => {
    return draftKey || `draft_${channelName}`
  }, [draftKey, channelName])

  const saveDraftToStorage = useCallback((data: PostFormData) => {
    try {
      const draftData = {
        formData: data,
        images: imageUpload.images,
        savedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
      localStorage.setItem(getDraftKey(), JSON.stringify(draftData))
      setDraftSavedAt(new Date())
      setHasDraft(true)
    } catch (error) {
      console.warn('Failed to save draft:', error)
    }
  }, [getDraftKey, imageUpload.images])

  const loadDraftFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(getDraftKey())
      if (!stored) return null

      const draftData = JSON.parse(stored)
      if (new Date() > new Date(draftData.expiresAt)) {
        localStorage.removeItem(getDraftKey())
        return null
      }

      return draftData
    } catch (error) {
      console.warn('Failed to load draft:', error)
      return null
    }
  }, [getDraftKey])

  // Content change handling for link preview
  useEffect(() => {
    if (formData.content) {
      linkPreview.onTextChange(formData.content)
    } else {
      linkPreview.clearPreview()
    }
  }, [formData.content, linkPreview])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || status === 'SUBMITTING') return

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
    }

    autoSaveTimer.current = setTimeout(() => {
      if (formData.title || formData.content) {
        saveDraftToStorage(formData)
      }
    }, autoSaveInterval)

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
    }
  }, [formData, autoSave, autoSaveInterval, saveDraftToStorage, status])

  const setFormData = useCallback((data: Partial<PostFormData>) => {
    setFormDataState(prev => ({ ...prev, ...data }))
    setStatus(prev => prev === 'INITIAL' ? 'EDITING' : prev)
  }, [])

  const updateField = useCallback(<K extends keyof PostFormData>(
    field: K,
    value: PostFormData[K]
  ) => {
    setFormData({ [field]: value })
    validation.validateField(field, value)
  }, [setFormData, validation])

  const validateForm = useCallback(async (): Promise<boolean> => {
    setStatus('VALIDATING')

    const sanitizedData = sanitizeFormData(formData)
    const validationErrors = validatePostData(sanitizedData)

    validation.validationState.errors = validationErrors
    validation.validationState.isValid = validationErrors.length === 0

    // Check if user is logged in
    if (!user) {
      validationErrors.push({
        field: 'auth',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      })
    }

    const isValid = validationErrors.length === 0
    setStatus(isValid ? 'EDITING' : 'ERROR')
    return isValid
  }, [formData, validation, user])

  const clearErrors = useCallback(() => {
    validation.clearAllErrors()
    setError(null)
    setStatus('EDITING')
  }, [validation])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return { success: false, error: 'Form validation failed' }
    }

    setStatus('SUBMITTING')

    try {
      if (submitController.current) {
        submitController.current.abort()
      }
      submitController.current = new AbortController()

      const sanitizedData = sanitizeFormData(formData)

      const submitData = {
        ...sanitizedData,
        images: imageUpload.images.map(img => img.url),
        linkPreview: linkPreview.preview
      }

      // Data being submitted

      const url = postId ? `/api/posts/${postId}` : '/api/posts'
      const method = postId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
        signal: submitController.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Submission failed')
      }

      const result = await response.json()

      if (hasDraft) {
        localStorage.removeItem(getDraftKey())
        setHasDraft(false)
        setDraftSavedAt(null)
      }

      setStatus('SUCCESS')

      // Navigate to created/updated post
      const targetPostId = postId || result.post?.id
      if (targetPostId) {
        router.push(`/c/${channelName}/posts/${targetPostId}`)
      } else {
        router.push(`/c/${channelName}`)
      }

      return { success: true, data: result }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setStatus('ERROR')
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [canSubmit, formData, imageUpload.images, linkPreview.preview, postId, hasDraft, getDraftKey, router, channelName])

  const handleSaveDraft = useCallback(async () => {
    saveDraftToStorage(formData)
  }, [formData, saveDraftToStorage])

  const handleReset = useCallback(() => {
    setFormDataState({
      title: '',
      content: '',
      authorName: '',
      channelName,
      allowGuestComments: true,
      ...initialData
    })
    imageUpload.clearImages()
    linkPreview.clearPreview()
    validation.reset()
    setStatus('INITIAL')
    setError(null)
  }, [channelName, initialData, imageUpload, linkPreview, validation])

  const loadDraft = useCallback(() => {
    const draft = loadDraftFromStorage()
    if (draft) {
      setFormDataState(draft.formData)
      setStatus('EDITING')
    }
  }, [loadDraftFromStorage])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(getDraftKey())
    setHasDraft(false)
    setDraftSavedAt(null)
  }, [getDraftKey])

  const getCharacterCount = useCallback((field: keyof PostFormData): number => {
    const value = formData[field]
    return typeof value === 'string' ? value.length : 0
  }, [formData])

  const getRemainingChars = useCallback((field: keyof PostFormData): number => {
    const maxLength = field === 'title' ? TITLE_MAX_LENGTH :
                     field === 'content' ? CONTENT_MAX_LENGTH : 0
    return maxLength - getCharacterCount(field)
  }, [getCharacterCount])

  // Legacy compatibility functions
  const handleCancel = useCallback(() => {
    router.back()
  }, [router])

  const handleFileSelection = useCallback(async (files: FileList) => {

    // 모든 파일의 상세 정보 로깅
    Array.from(files).forEach((file, index) => {
    })

    const fileArray = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/') ||
                      file.name.toLowerCase().endsWith('.png') ||
                      file.name.toLowerCase().endsWith('.jpg') ||
                      file.name.toLowerCase().endsWith('.jpeg') ||
                      file.name.toLowerCase().endsWith('.gif') ||
                      file.name.toLowerCase().endsWith('.webp') ||
                      file.name.toLowerCase().endsWith('.svg')

      return isImage
    })

    fileArray.forEach(file => {
    })

    const results = await imageUpload.uploadBatch(fileArray)

    return results
  }, [imageUpload])

  const handleImageAdded = useCallback((imageUrl: string, fileName: string, size: number) => {
    // This is handled by the imageUpload hook now
  }, [])

  const isSubmitDisabled = !canSubmit || submitting || imageUpload.uploading

  return {
    // New interface
    formData,
    setFormData,
    updateField,
    status,
    submitting,
    canSubmit,
    validation: validation.validationState,
    errors,
    validateForm,
    clearErrors,
    images: imageUpload.images,
    uploading: imageUpload.uploading,
    uploadProgress: imageUpload.uploadProgress,
    uploadError: imageUpload.error,
    linkPreview: linkPreview.preview,
    linkPreviewLoading: linkPreview.loading,
    handleSubmit,
    handleSaveDraft,
    handleReset,
    hasDraft,
    draftSavedAt,
    loadDraft,
    clearDraft,
    getCharacterCount,
    getRemainingChars,

    // Legacy compatibility interface
    title: formData.title,
    content: formData.content,
    authorName: formData.authorName,
    selectedFlair: formData.selectedFlair || '',
    allowGuestComments: formData.allowGuestComments,
    error,
    previewMode,
    linkPreviews: linkPreview.preview ? [linkPreview.preview] : [],
    pastedImages: imageUpload.images, // Legacy - now handled by imageUpload
    uploadingFiles: imageUpload.uploading ? ['uploading-file'] : [], // Legacy compatibility
    isSubmitDisabled,
    user,
    postId,
    setTitle: (title: string) => updateField('title', title),
    setContent: (content: string) => updateField('content', content),
    setAuthorName: (name: string) => updateField('authorName', name),
    setSelectedFlair: (flair: string) => updateField('selectedFlair', flair),
    setAllowGuestComments: (allow: boolean) => updateField('allowGuestComments', allow),
    setPreviewMode,
    setError,
    handleCancel,
    handleFileSelection,
    handleImageAdded,
  }
}