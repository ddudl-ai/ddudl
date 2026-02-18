// T028: WritePostForm 리팩터링 - 새로운 모듈형 훅과 컴포넌트 사용
'use client'

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, AlertTriangle, User, Image, Clipboard } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Separator } from '@/components/ui/separator'
import dynamic from 'next/dynamic'
import type { JoditEditorRef } from '@/components/editor/JoditEditor'

// 새로운 모듈형 훅과 기존 훅들
import { useWritePostForm } from '@/hooks/useWritePostForm'
import { useClipboardPaste } from '@/hooks/useClipboardPaste'
import { useDragAndDrop } from '@/hooks/useDragAndDrop'
import { formatFileSize } from '@/lib/utils/imageProcessor'
import { ImageUpload } from '@/components/forms/ImageUpload'
import '@/styles/writepost-layout.css'

// Jodit Editor를 동적으로 불러오기 (SSR 비활성화)
const JoditEditor = dynamic(
  () => import('@/components/editor/JoditEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] bg-gray-50 rounded-md flex items-center justify-center">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-gray-500">Loading editor...</span>
      </div>
    )
  }
)

interface WritePostFormProps {
  channelName: string
}

const FLAIR_OPTIONS = [
  'General',
  'Question',
  'Discussion',
  'Information',
  'Review',
  'Recommendation',
  'News',
  'Humor',
  'Other'
]

export default function WritePostForm({ channelName }: WritePostFormProps) {
  const editorRef = useRef<JoditEditorRef | null>(null)

  // 새로운 모듈형 useWritePostForm 훅 사용
  const {
    // 새로운 인터페이스
    formData,
    updateField,
    status,
    submitting,
    canSubmit,
    validation,
    images,
    uploading,
    uploadError,
    linkPreview,
    linkPreviewLoading,
    handleSubmit,
    handleReset,

    // 레거시 호환성 인터페이스 (기존 UI 코드와 호환)
    title,
    content,
    authorName,
    selectedFlair,
    allowGuestComments,
    error,
    previewMode,
    isSubmitDisabled,
    user,
    postId,
    // 기존 훅에서 필요한 추가 상태들
    uploadingFiles,
    pastedImages,
    linkPreviews,
    setTitle,
    setContent,
    setAuthorName,
    setSelectedFlair,
    setAllowGuestComments,
    setPreviewMode,
    setError,
    handleCancel,
    handleFileSelection,
    handleImageAdded,
  } = useWritePostForm({ channelName })

  // 이미지 처리 공통 함수
  const handleImageAddedWithEditor = (imageUrl: string, fileName: string, size: number, source: string) => {
    handleImageAdded(imageUrl, fileName, size)

    if (editorRef.current) {
      try {
        editorRef.current.insertImage(imageUrl, fileName)
      } catch (error) {
        console.warn('Jodit 에디터 이미지 삽입 실패:', error)
        try {
          const imageHtml = `<p><img src="${imageUrl}" alt="${fileName}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" /></p><p><br/></p>`
          editorRef.current.insertHTML(imageHtml)
        } catch (htmlError) {
          console.warn('HTML 삽입도 실패, content state 업데이트:', htmlError)
          const imageHtml = `<p><img src="${imageUrl}" alt="${fileName}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" /></p><p><br/></p>`
          setContent(content + imageHtml)
        }
      }
    } else {
      const imageHtml = `<p><img src="${imageUrl}" alt="${fileName}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" /></p><p><br/></p>`
      setContent(content + imageHtml)
    }
  }

  // 클립보드 붙여넣기 훅
  useClipboardPaste({
    onImagePaste: (imageUrl, fileName, size) => {
      handleImageAddedWithEditor(imageUrl, fileName, size, '클립보드')
    },
    onError: (error) => {
      setError(`이미지 붙여넣기 실패: ${error}`)
    },
    onUploadStart: () => { },
    onUploadEnd: () => { },
    enabled: true,
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85
  })

  // 드래그&드롭 훅
  const { isDragging } = useDragAndDrop({
    onImageDrop: (imageUrl, fileName, size) => {
      handleImageAddedWithEditor(imageUrl, fileName, size, '드래그&드롭')
    },
    onError: (error) => {
      setError(`이미지 드롭 실패: ${error}`)
    },
    onUploadStart: () => { },
    onUploadEnd: () => { },
    enabled: true,
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85
  })

  const onSelectImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      return
    }

    // 이미지 업로드 및 에디터 삽입
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'))
    const results = await handleFileSelection(files)

    // 업로드 성공한 이미지들을 에디터에 자동으로 삽입
    results?.forEach((result, index) => {
      if (result.success && result.url) {
        const fileName = fileArray[index]?.name || 'uploaded_image'
        insertImageMarkdown(result.url, fileName)
      } else if (result.error) {
        console.error(`❌ 이미지 업로드 실패: ${result.error}`)
      }
    })

    // 다음 파일 선택을 위해 input 값 리셋
    e.target.value = ''
  }

  const insertImageMarkdown = (url: string, fileName: string = 'image') => {

    if (editorRef.current) {
      try {
        editorRef.current.insertImage(url, fileName)
      } catch (error) {
        console.warn('Jodit 에디터 이미지 삽입 실패:', error)
        try {
          const imageHtml = `<p><img src="${url}" alt="${fileName}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" /></p><p><br/></p>`
          editorRef.current.insertHTML(imageHtml)
        } catch (htmlError) {
          console.warn('HTML 삽입도 실패, content state 업데이트:', htmlError)
          const imageHtml = `<p><img src="${url}" alt="${fileName}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" /></p><p><br/></p>`
          setContent(content + imageHtml)
        }
      }
    } else {
      const imageHtml = `<p><img src="${url}" alt="${fileName}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" /></p><p><br/></p>`
      setContent(content + imageHtml)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Force editor content sync (in case onBlur wasn't called)

    if (editorRef.current) {
      try {
        // 에디터 focus를 잃게 하여 pending changes를 강제로 commit
        editorRef.current.blur()

        // 잠시 대기 후 최신 내용 가져오기
        await new Promise(resolve => setTimeout(resolve, 50))

        const editorContent = editorRef.current.getContent()

        // Update content if different
        if (editorContent !== content) {
          setContent(editorContent)
          await new Promise(resolve => setTimeout(resolve, 150))

          // 업데이트 후 최신 상태 재확인
          const finalContent = editorRef.current?.getContent() || editorContent
          if (finalContent !== editorContent) {
            setContent(finalContent)
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }

      } catch (error) {
        console.warn('에디터 내용 동기화 실패:', error)
      }
    } else {
      console.warn('⚠️ 에디터 ref가 null입니다. 현재 content 사용:', content)
    }

    const result = await handleSubmit()
    if (!result.success) {
      setError(result.error || '제출에 실패했습니다')
    }
  }

  return (
    <div className={`writepost-container max-w-4xl mx-auto space-y-6 ${isDragging ? 'opacity-50' : ''} ${previewMode ? 'writepost-preview-mode' : ''}`}>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6" data-toolname="createPost" data-tooldescription="Create a new post in this channel">
        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 제목 입력 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Title *
              </label>
              <Input
                value={title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Enter post title (5-300 characters)"
                maxLength={300}
                className={!validation.isValid && validation.errors.some(e => e.field === 'title') ? 'border-red-500' : ''}
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>{title.length}/300 chars</span>
                {validation.errors.find(e => e.field === 'title') && (
                  <span className="text-red-600">
                    {validation.errors.find(e => e.field === 'title')?.message}
                  </span>
                )}
              </div>
            </div>

            {/* 작성자명 표시 (로그인 User만) */}
            {user && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Author Name
                </label>
                <div className="flex items-center space-x-3">
                  <Input
                    value={authorName}
                    disabled={true}
                    className="flex-1 bg-gray-50"
                    placeholder="Logged in user"
                  />
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Signed in
                  </Badge>
                </div>
              </div>
            )}
            
            {/* 로그인 필요 안내 */}
            {!user && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Writing Permission Required
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  You need to sign in to write posts. Please create an account or sign in.
                </p>
              </div>
            )}

            {/* 플레어 선택 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Flair (Optional)
              </label>
              <select
                value={selectedFlair || ''}
                onChange={(e) => updateField('selectedFlair', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select flair</option>
                {FLAIR_OPTIONS.map((flair) => (
                  <option key={flair} value={flair}>
                    {flair}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 내용 + 마크다운 프리뷰 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="content-editor" className="block text-sm font-medium text-gray-700">
              Content (Markdown supported)
            </label>
          </div>

          <div className="space-y-3">
            <div className="writepost-editor relative">
              <JoditEditor
                ref={editorRef}
                value={content}
                onChange={setContent}
                placeholder="Enter post content... (Optional)"
                disabled={uploading}
                height={500}
                aria-label="Edit post content"
              />

              {uploading && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-md z-20">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm font-medium">Processing image...</span>
                  </div>
                </div>
              )}
            </div>

            {/* 링크 프리뷰 섹션 */}
            {(linkPreviews?.length || 0) > 0 && (
              <div className="space-y-2">
                {content.split('\n').map((line, lineIndex) => {
                  const urlMatch = line.match(/^\s*(https?:\/\/(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)\s*$/)
                  if (!urlMatch) return null

                  const url = urlMatch[1].replace(/[.,;!?]$/, '')

                  let isValidUrl = false
                  try {
                    const parsedUrl = new URL(url)
                    const domain = parsedUrl.hostname
                    isValidUrl = domain.includes('.') && domain.length >= 4 && !domain.endsWith('.')
                  } catch {
                    isValidUrl = false
                  }

                  if (!isValidUrl) return null

                  const preview = (linkPreviews || []).find(p => p.url === url)
                  if (!preview || preview.error) return null

                  return (
                    <div key={lineIndex} className="writepost-preview bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex gap-3">
                        {preview.image && (
                          <div className="flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview.image} alt={`${preview.title || 'Preview image'}`} className="w-16 h-16 object-cover rounded" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {preview.title && (
                            <h4 className="font-medium text-gray-900 text-sm mb-1">{preview.title}</h4>
                          )}
                          {preview.description && (
                            <p className="text-gray-600 text-xs mb-2 line-clamp-2">{preview.description}</p>
                          )}
                          <p className="text-blue-600 text-xs break-all">{url}</p>
                        </div>
                      </div>
                    </div>
                  )
                }).filter(Boolean)}
              </div>
            )}
          </div>
        </div>

        {/* 링크 프리뷰 정보 */}
        {(linkPreviews?.length || 0) > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-blue-800">📋 Detected Links</span>
              <span className="text-xs text-blue-600">({(linkPreviews || []).length} links)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(linkPreviews || []).map((preview, index) => (
                <div key={index} className={`px-2 py-1 rounded text-xs ${preview.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                  {preview.error ? '❌' : '✅'} {preview.title || preview.url}
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-2">
              💡 Enter URL on each line to display preview below.
            </p>
          </div>
        )}

        {/* 클립보드 붙여넣기 정보 */}
        {(pastedImages?.length || 0) > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Clipboard className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Images Pasted from Clipboard</span>
            </div>
            <div className="space-y-2">
              {(pastedImages || []).map((image, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    <Image className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{image.fileName}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">WebP Optimized</Badge>
                </div>
              ))}
              <p className="text-xs text-gray-600 mt-2">
                💡 Tip: You can paste images directly with Ctrl+V or Cmd+V. Images are automatically optimized to WebP format.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* 이미지 업로드 */}
        <div className="space-y-2">
          <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700">Image Upload</label>
          <div className="flex items-center gap-3">
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={onSelectImages}
              disabled={uploading}
              className={uploading ? 'opacity-50 cursor-not-allowed' : ''}
              aria-describedby="image-help"
            />
            {uploading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <LoadingSpinner size="sm" />
                <span className="text-sm">Uploading image...</span>
              </div>
            )}
          </div>
          <p id="image-help" className="text-xs text-gray-500">
            You can select multiple images. Drag & drop and clipboard pasting are also supported.
          </p>
          {((images?.length || 0) > 0 || (uploadingFiles?.length || 0) > 0) && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Uploaded Images (Click to insert into content)</p>
              <div className="flex flex-wrap gap-2" role="list" aria-label="List of uploaded images">
                {(uploadingFiles || []).map((fileName, index) => (
                  <div
                    key={`uploading-${index}`}
                    className="border rounded-md p-1 flex flex-col items-center bg-gray-50 animate-pulse"
                    role="listitem"
                    aria-label={`${fileName} uploading`}
                  >
                    <div className="w-20 h-20 bg-gray-200 rounded mb-1 flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                    <span className="text-xs text-gray-400 truncate max-w-20">{fileName}</span>
                    <Badge variant="outline" className="text-xs mt-1">Uploading...</Badge>
                  </div>
                ))}
                {(images || []).map((image) => {
                  const fileName = image.fileName || 'image'

                  return (
                    <button
                      type="button"
                      key={image.url}
                      onClick={() => insertImageMarkdown(image.url, fileName)}
                      className="border rounded-md p-1 flex flex-col items-center hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      role="listitem"
                      aria-label={`${fileName} Click to insert into content`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={fileName}
                        className="w-20 h-20 object-cover rounded mb-1"
                        loading="lazy"
                      />
                      <span className="text-xs text-gray-600 truncate max-w-20">{fileName}</span>
                      <Badge variant="secondary" className="text-xs mt-1">Click to insert</Badge>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* 제출 버튼 */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-3">

            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>

          <Button
            type="submit"
            disabled={isSubmitDisabled || !canSubmit}
            className="flex items-center space-x-2"
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{postId ? 'Update' : 'Publish'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}