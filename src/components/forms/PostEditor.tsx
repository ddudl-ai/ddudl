// T025: Implementation of PostEditor component
// Following TDD GREEN phase - making tests pass

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { useLinkPreview, type UseLinkPreviewOptions } from '../../hooks/useLinkPreview'
import { useFormValidation, type UseFormValidationOptions } from '../../hooks/useFormValidation'
import type { LinkPreviewData } from '../../types/forms'

export interface PostEditorData {
  content: string
}

export interface PostEditorProps {
  className?: string
  initialContent?: string
  draftContent?: string
  onChange?: (content: string) => void
  onSave?: (content: string) => void
  onDraftSave?: (content: string) => void
  onImagePaste?: (file: File) => void

  // Validation
  validateOnBlur?: boolean
  validateOnChange?: boolean

  // Link Preview
  enableLinkPreview?: boolean
  linkPreviewOptions?: UseLinkPreviewOptions

  // Editor Features
  showToolbar?: boolean
  collapsibleToolbar?: boolean
  enableKeyboardShortcuts?: boolean
  enableTabIndent?: boolean
  autoResize?: boolean
  convertPastedHtml?: boolean

  // Auto-save
  autoSaveInterval?: number
  showDraftStatus?: boolean

  // Debouncing
  debounceMs?: number

  // Character limits
  titleMaxLength?: number
  contentMaxLength?: number
}

interface ToolbarButtonProps {
  onClick: () => void
  icon: string
  label: string
  shortcut?: string
}

function ToolbarButton({ onClick, icon, label, shortcut }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
    >
      {icon}
    </button>
  )
}

export function PostEditor({
  className,
  initialContent = '',
  draftContent,
  onChange,
  onSave,
  onDraftSave,
  onImagePaste,
  validateOnBlur = false,
  validateOnChange = false,
  enableLinkPreview = false,
  linkPreviewOptions = {},
  showToolbar = false,
  collapsibleToolbar = false,
  enableKeyboardShortcuts = false,
  enableTabIndent = false,
  autoResize = false,
  convertPastedHtml = false,
  autoSaveInterval,
  showDraftStatus = false,
  debounceMs = 300,
  titleMaxLength = 300,
  contentMaxLength = 10000
}: PostEditorProps) {
  const [formData, setFormData] = useState<PostEditorData>(() => ({
    content: draftContent || initialContent
  }))

  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [draftSaved, setDraftSaved] = useState(false)
  const [showDraftRestored, setShowDraftRestored] = useState(!!draftContent)

  const contentRef = useRef<HTMLTextAreaElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  const { validateField, getFieldError, isFieldValid } = useFormValidation({}, { mode: 'onChange', shouldFocusError: false })

  const {
    preview,
    loading: linkPreviewLoading,
    error: linkPreviewError,
    onTextChange,
    clearPreview
  } = useLinkPreview({
    autoPreview: enableLinkPreview,
    ...linkPreviewOptions
  })

  // Auto-resize textarea
  useEffect(() => {
    if (autoResize && contentRef.current) {
      const textarea = contentRef.current
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [formData.content, autoResize])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveInterval || !onDraftSave) return

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
    }

    autoSaveTimer.current = setTimeout(() => {
      if (formData.content) {
        onDraftSave(formData.content)
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 3000)
      }
    }, autoSaveInterval)

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
    }
  }, [formData, autoSaveInterval, onDraftSave])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault()
            applyFormat('bold')
            break
          case 'i':
            e.preventDefault()
            applyFormat('italic')
            break
          case 'k':
            e.preventDefault()
            applyFormat('link')
            break
          case 's':
            e.preventDefault()
            if (onSave) {
              onSave(formData.content)
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardShortcuts, formData, onSave])

  // Hide draft restored message
  useEffect(() => {
    if (showDraftRestored) {
      const timer = setTimeout(() => setShowDraftRestored(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showDraftRestored])

  const handleInputChange = useCallback((field: 'content', value: string) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)

    // Clear debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Debounced onChange
    if (debounceMs > 0) {
      debounceTimer.current = setTimeout(() => {
        onChange?.(value)
        if (validateOnChange) {
          validateField(field, value)
        }
      }, debounceMs)
    } else {
      onChange?.(value)
      if (validateOnChange) {
        validateField(field, value)
      }
    }

    // Link preview for content
    if (field === 'content' && enableLinkPreview) {
      onTextChange(value)
    }
  }, [formData, onChange, debounceMs, validateOnChange, validateField, enableLinkPreview, onTextChange])

  const handleBlur = (field: 'content') => {
    if (validateOnBlur) {
      validateField(field, formData[field])
    }
  }


  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange('content', e.target.value)
  }

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (enableTabIndent && e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const value = textarea.value
      const newValue = value.substring(0, start) + '    ' + value.substring(end)

      setFormData(prev => ({ ...prev, content: newValue }))

      // Move cursor
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }, 0)
    }
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items

    // Check for images first
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file && onImagePaste) {
          e.preventDefault()
          onImagePaste(file)
          return
        }
      }
    }

    // Handle HTML paste conversion
    if (convertPastedHtml) {
      const htmlData = e.clipboardData.getData('text/html')
      if (htmlData) {
        e.preventDefault()
        // Simple HTML to Markdown conversion
        const markdownText = htmlData
          .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
          .replace(/<em>(.*?)<\/em>/g, '*$1*')
          .replace(/<[^>]+>/g, '') // Strip remaining HTML

        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const currentValue = textarea.value

        const newValue = currentValue.substring(0, start) + markdownText + currentValue.substring(end)
        handleInputChange('content', newValue)
      }
    }
  }

  const applyFormat = (format: 'bold' | 'italic' | 'link' | 'list' | 'code') => {
    const textarea = contentRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const currentValue = textarea.value

    let replacement = ''
    let cursorOffset = 0

    switch (format) {
      case 'bold':
        replacement = `**${selectedText}**`
        cursorOffset = selectedText ? 2 : 2
        break
      case 'italic':
        replacement = `*${selectedText}*`
        cursorOffset = selectedText ? 1 : 1
        break
      case 'link':
        replacement = `[${selectedText}]()`
        cursorOffset = selectedText ? selectedText.length + 3 : 1
        break
      case 'list':
        replacement = `- ${selectedText}`
        cursorOffset = selectedText ? selectedText.length + 2 : 2
        break
      case 'code':
        replacement = '```\n\n```'
        cursorOffset = 4
        break
    }

    const newValue = currentValue.substring(0, start) + replacement + currentValue.substring(end)
    handleInputChange('content', newValue)

    // Set cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + cursorOffset
    }, 0)
  }

  const toggleToolbar = () => {
    setToolbarVisible(!toolbarVisible)
  }

  return (
    <div className={cn('post-editor space-y-4', className)}>
      {/* Draft Restored Notice */}
      {showDraftRestored && (
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
          임시저장에서 복원됨
        </div>
      )}


      {/* Content Editor */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="post-content" className="block text-sm font-medium text-gray-700">
            내용
          </label>
          {showToolbar && collapsibleToolbar && (
            <button
              type="button"
              onClick={toggleToolbar}
              className="text-sm text-gray-600 hover:text-gray-900"
              aria-label={toolbarVisible ? '도구모음 접기' : '도구모음 펼치기'}
            >
              {toolbarVisible ? '도구모음 접기' : '도구모음 펼치기'}
            </button>
          )}
        </div>

        {/* Toolbar */}
        {showToolbar && toolbarVisible && (
          <div
            className="flex gap-1 p-2 border rounded bg-gray-50"
            role="toolbar"
            aria-label="편집 도구"
          >
            <ToolbarButton
              onClick={() => applyFormat('bold')}
              icon="B"
              label="굵게"
              shortcut="Ctrl+B"
            />
            <ToolbarButton
              onClick={() => applyFormat('italic')}
              icon="I"
              label="기울임"
              shortcut="Ctrl+I"
            />
            <ToolbarButton
              onClick={() => applyFormat('link')}
              icon="🔗"
              label="링크"
              shortcut="Ctrl+K"
            />
            <ToolbarButton
              onClick={() => applyFormat('list')}
              icon="•"
              label="목록"
            />
            <ToolbarButton
              onClick={() => applyFormat('code')}
              icon="{ }"
              label="코드"
            />
          </div>
        )}

        <textarea
          ref={contentRef}
          id="post-content"
          name="content"
          value={formData.content}
          onChange={handleContentChange}
          onBlur={() => handleBlur('content')}
          onKeyDown={handleTabKey}
          onPaste={handlePaste}
          maxLength={contentMaxLength}
          className={cn(
            'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            autoResize ? 'resize-none overflow-hidden' : 'min-h-[200px] resize-y'
          )}
          placeholder="게시물 내용을 입력하세요"
          aria-describedby={!isFieldValid('content') ? 'content-error' : 'content-help'}
        />

        <div className="flex justify-between text-sm text-gray-500">
          <div>
            {getFieldError('content') && (
              <span id="content-error" className="text-red-600" role="alert">
                {getFieldError('content')}
              </span>
            )}
          </div>
          <div id="content-help">
            {formData.content.length}자
            {contentMaxLength && ` / ${contentMaxLength}`}
          </div>
        </div>
      </div>

      {/* Link Preview */}
      {enableLinkPreview && (
        <div className="space-y-2">
          {linkPreviewLoading && (
            <div className="text-sm text-gray-600">
              링크 미리보기 로딩 중...
            </div>
          )}

          {linkPreviewError && (
            <div className="text-sm text-red-600">
              링크 미리보기를 불러올 수 없습니다
            </div>
          )}

          {preview && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{preview.title}</h4>
                  {preview.description && (
                    <p className="text-sm text-gray-600 mt-1">{preview.description}</p>
                  )}
                  {preview.siteName && (
                    <p className="text-xs text-gray-500 mt-1">{preview.siteName}</p>
                  )}
                </div>
                {preview.image && (
                  <img
                    src={preview.image}
                    alt="Link preview"
                    className="w-16 h-16 object-cover rounded ml-4"
                  />
                )}
                <button
                  onClick={clearPreview}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  aria-label="미리보기 닫기"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Draft Status */}
      {showDraftStatus && (
        <div className="text-sm text-gray-500">
          {draftSaved ? '임시저장됨' : ''}
        </div>
      )}
    </div>
  )
}