// T025: Implementation of PostEditor component
// Following TDD GREEN phase - making tests pass

'use client&apos;

import React, { useState, useCallback, useRef, useEffect } from &apos;react&apos;
import { cn } from &apos;../../lib/utils&apos;
import { useLinkPreview, type UseLinkPreviewOptions } from &apos;../../hooks/useLinkPreview&apos;
import { useFormValidation, type UseFormValidationOptions } from &apos;../../hooks/useFormValidation&apos;
import type { LinkPreviewData } from &apos;../../types/forms&apos;

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
      type=&quot;button&quot;
      onClick={onClick}
      className=&quot;p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors&quot;
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
    >
      {icon}
    </button>
  )
}

export function PostEditor({
  className,
  initialContent = &apos;',
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

  const { validateField, getFieldError, isFieldValid } = useFormValidation({}, { mode: &apos;onChange&apos;, shouldFocusError: false })

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
      textarea.style.height = &apos;auto&apos;
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
          case &apos;b&apos;:
            e.preventDefault()
            applyFormat(&apos;bold&apos;)
            break
          case &apos;i&apos;:
            e.preventDefault()
            applyFormat(&apos;italic&apos;)
            break
          case &apos;k&apos;:
            e.preventDefault()
            applyFormat(&apos;link&apos;)
            break
          case &apos;s&apos;:
            e.preventDefault()
            if (onSave) {
              onSave(formData.content)
            }
            break
        }
      }
    }

    document.addEventListener(&apos;keydown&apos;, handleKeyDown)
    return () => document.removeEventListener(&apos;keydown&apos;, handleKeyDown)
  }, [enableKeyboardShortcuts, formData, onSave])

  // Hide draft restored message
  useEffect(() => {
    if (showDraftRestored) {
      const timer = setTimeout(() => setShowDraftRestored(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showDraftRestored])

  const handleInputChange = useCallback((field: &apos;content&apos;, value: string) => {
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
    if (field === &apos;content&apos; && enableLinkPreview) {
      onTextChange(value)
    }
  }, [formData, onChange, debounceMs, validateOnChange, validateField, enableLinkPreview, onTextChange])

  const handleBlur = (field: &apos;content&apos;) => {
    if (validateOnBlur) {
      validateField(field, formData[field])
    }
  }


  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(&apos;content&apos;, e.target.value)
  }

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (enableTabIndent && e.key === &apos;Tab&apos;) {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const value = textarea.value
      const newValue = value.substring(0, start) + &apos;    &apos; + value.substring(end)

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
      if (item.kind === &apos;file&apos; && item.type.startsWith(&apos;image/&apos;)) {
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
      const htmlData = e.clipboardData.getData(&apos;text/html&apos;)
      if (htmlData) {
        e.preventDefault()
        // Simple HTML to Markdown conversion
        const markdownText = htmlData
          .replace(/<strong>(.*?)<\/strong>/g, &apos;**$1**&apos;)
          .replace(/<em>(.*?)<\/em>/g, &apos;*$1*&apos;)
          .replace(/<[^>]+>/g, &apos;') // Strip remaining HTML

        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const currentValue = textarea.value

        const newValue = currentValue.substring(0, start) + markdownText + currentValue.substring(end)
        handleInputChange(&apos;content&apos;, newValue)
      }
    }
  }

  const applyFormat = (format: &apos;bold&apos; | &apos;italic&apos; | &apos;link&apos; | &apos;list&apos; | &apos;code&apos;) => {
    const textarea = contentRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const currentValue = textarea.value

    let replacement = &apos;'
    let cursorOffset = 0

    switch (format) {
      case &apos;bold&apos;:
        replacement = `**${selectedText}**`
        cursorOffset = selectedText ? 2 : 2
        break
      case &apos;italic&apos;:
        replacement = `*${selectedText}*`
        cursorOffset = selectedText ? 1 : 1
        break
      case &apos;link&apos;:
        replacement = `[${selectedText}]()`
        cursorOffset = selectedText ? selectedText.length + 3 : 1
        break
      case &apos;list&apos;:
        replacement = `- ${selectedText}`
        cursorOffset = selectedText ? selectedText.length + 2 : 2
        break
      case &apos;code&apos;:
        replacement = &apos;```\n\n```&apos;
        cursorOffset = 4
        break
    }

    const newValue = currentValue.substring(0, start) + replacement + currentValue.substring(end)
    handleInputChange(&apos;content&apos;, newValue)

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
    <div className={cn(&apos;post-editor space-y-4&apos;, className)}>
      {/* Draft Restored Notice */}
      {showDraftRestored && (
        <div className=&quot;text-sm text-blue-600 bg-blue-50 p-3 rounded&quot;>
          임시저장에서 복원됨
        </div>
      )}


      {/* Content Editor */}
      <div className=&quot;space-y-2&quot;>
        <div className=&quot;flex justify-between items-center&quot;>
          <label htmlFor=&quot;post-content&quot; className=&quot;block text-sm font-medium text-gray-700&quot;>
            내용
          </label>
          {showToolbar && collapsibleToolbar && (
            <button
              type=&quot;button&quot;
              onClick={toggleToolbar}
              className=&quot;text-sm text-gray-600 hover:text-gray-900&quot;
              aria-label={toolbarVisible ? &apos;도구모음 접기&apos; : &apos;도구모음 펼치기&apos;}
            >
              {toolbarVisible ? &apos;도구모음 접기&apos; : &apos;도구모음 펼치기&apos;}
            </button>
          )}
        </div>

        {/* Toolbar */}
        {showToolbar && toolbarVisible && (
          <div
            className=&quot;flex gap-1 p-2 border rounded bg-gray-50&quot;
            role=&quot;toolbar&quot;
            aria-label=&quot;편집 도구&quot;
          >
            <ToolbarButton
              onClick={() => applyFormat(&apos;bold&apos;)}
              icon=&quot;B&quot;
              label=&quot;굵게&quot;
              shortcut=&quot;Ctrl+B&quot;
            />
            <ToolbarButton
              onClick={() => applyFormat(&apos;italic&apos;)}
              icon=&quot;I&quot;
              label=&quot;기울임&quot;
              shortcut=&quot;Ctrl+I&quot;
            />
            <ToolbarButton
              onClick={() => applyFormat(&apos;link&apos;)}
              icon=&quot;🔗&quot;
              label=&quot;링크&quot;
              shortcut=&quot;Ctrl+K&quot;
            />
            <ToolbarButton
              onClick={() => applyFormat(&apos;list&apos;)}
              icon=&quot;•&quot;
              label=&quot;목록&quot;
            />
            <ToolbarButton
              onClick={() => applyFormat(&apos;code&apos;)}
              icon=&quot;{ }&quot;
              label=&quot;코드&quot;
            />
          </div>
        )}

        <textarea
          ref={contentRef}
          id=&quot;post-content&quot;
          name=&quot;content&quot;
          value={formData.content}
          onChange={handleContentChange}
          onBlur={() => handleBlur(&apos;content&apos;)}
          onKeyDown={handleTabKey}
          onPaste={handlePaste}
          maxLength={contentMaxLength}
          className={cn(
            &apos;w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500&apos;,
            autoResize ? &apos;resize-none overflow-hidden&apos; : &apos;min-h-[200px] resize-y&apos;
          )}
          placeholder=&quot;게시물 내용을 입력하세요&quot;
          aria-describedby={!isFieldValid(&apos;content&apos;) ? &apos;content-error&apos; : &apos;content-help&apos;}
        />

        <div className=&quot;flex justify-between text-sm text-gray-500&quot;>
          <div>
            {getFieldError(&apos;content&apos;) && (
              <span id=&quot;content-error&quot; className=&quot;text-red-600&quot; role=&quot;alert&quot;>
                {getFieldError(&apos;content&apos;)}
              </span>
            )}
          </div>
          <div id=&quot;content-help&quot;>
            {formData.content.length}자
            {contentMaxLength && ` / ${contentMaxLength}`}
          </div>
        </div>
      </div>

      {/* Link Preview */}
      {enableLinkPreview && (
        <div className=&quot;space-y-2&quot;>
          {linkPreviewLoading && (
            <div className=&quot;text-sm text-gray-600&quot;>
              링크 미리보기 로딩 중...
            </div>
          )}

          {linkPreviewError && (
            <div className=&quot;text-sm text-red-600&quot;>
              링크 미리보기를 불러올 수 없습니다
            </div>
          )}

          {preview && (
            <div className=&quot;border rounded-lg p-4 bg-gray-50&quot;>
              <div className=&quot;flex justify-between items-start&quot;>
                <div className=&quot;flex-1&quot;>
                  <h4 className=&quot;font-medium&quot;>{preview.title}</h4>
                  {preview.description && (
                    <p className=&quot;text-sm text-gray-600 mt-1&quot;>{preview.description}</p>
                  )}
                  {preview.siteName && (
                    <p className=&quot;text-xs text-gray-500 mt-1&quot;>{preview.siteName}</p>
                  )}
                </div>
                {preview.image && (
                  <img
                    src={preview.image}
                    alt=&quot;Link preview&quot;
                    className=&quot;w-16 h-16 object-cover rounded ml-4&quot;
                  />
                )}
                <button
                  onClick={clearPreview}
                  className=&quot;ml-2 text-gray-400 hover:text-gray-600&quot;
                  aria-label=&quot;미리보기 닫기&quot;
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
        <div className=&quot;text-sm text-gray-500&quot;>
          {draftSaved ? &apos;임시저장됨&apos; : &apos;'}
        </div>
      )}
    </div>
  )
}