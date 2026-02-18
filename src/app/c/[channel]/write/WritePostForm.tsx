// T028: WritePostForm 리팩터링 - 새로운 모듈형 훅과 컴포넌트 사용
'use client&apos;

import React, { useRef } from &apos;react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Input } from &apos;@/components/ui/input&apos;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Send, AlertTriangle, User, Image, Clipboard } from &apos;lucide-react&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { Separator } from &apos;@/components/ui/separator&apos;
import dynamic from &apos;next/dynamic&apos;
import type { JoditEditorRef } from &apos;@/components/editor/JoditEditor&apos;

// 새로운 모듈형 훅과 기존 훅들
import { useWritePostForm } from &apos;@/hooks/useWritePostForm&apos;
import { useClipboardPaste } from &apos;@/hooks/useClipboardPaste&apos;
import { useDragAndDrop } from &apos;@/hooks/useDragAndDrop&apos;
import { formatFileSize } from &apos;@/lib/utils/imageProcessor&apos;
import { ImageUpload } from &apos;@/components/forms/ImageUpload&apos;
import &apos;@/styles/writepost-layout.css&apos;

// Jodit Editor를 동적으로 불러오기 (SSR 비활성화)
const JoditEditor = dynamic(
  () => import(&apos;@/components/editor/JoditEditor&apos;),
  {
    ssr: false,
    loading: () => (
      <div className=&quot;min-h-[400px] bg-gray-50 rounded-md flex items-center justify-center&quot;>
        <LoadingSpinner size=&quot;sm&quot; />
        <span className=&quot;ml-2 text-gray-500&quot;>Loading editor...</span>
      </div>
    )
  }
)

interface WritePostFormProps {
  channelName: string
}

const FLAIR_OPTIONS = [
  &apos;General&apos;,
  &apos;Question&apos;,
  &apos;Discussion&apos;,
  &apos;Information&apos;,
  &apos;Review&apos;,
  &apos;Recommendation&apos;,
  &apos;News&apos;,
  &apos;Humor&apos;,
  &apos;Other&apos;
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
        console.warn(&apos;Jodit 에디터 이미지 삽입 실패:&apos;, error)
        try {
          const imageHtml = `<p><img src=&quot;${imageUrl}&quot; alt=&quot;${fileName}&quot; style=&quot;max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;&quot; /></p><p><br/></p>`
          editorRef.current.insertHTML(imageHtml)
        } catch (htmlError) {
          console.warn(&apos;HTML 삽입도 실패, content state 업데이트:&apos;, htmlError)
          const imageHtml = `<p><img src=&quot;${imageUrl}&quot; alt=&quot;${fileName}&quot; style=&quot;max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;&quot; /></p><p><br/></p>`
          setContent(content + imageHtml)
        }
      }
    } else {
      const imageHtml = `<p><img src=&quot;${imageUrl}&quot; alt=&quot;${fileName}&quot; style=&quot;max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;&quot; /></p><p><br/></p>`
      setContent(content + imageHtml)
    }
  }

  // 클립보드 붙여넣기 훅
  useClipboardPaste({
    onImagePaste: (imageUrl, fileName, size) => {
      handleImageAddedWithEditor(imageUrl, fileName, size, &apos;클립보드&apos;)
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
      handleImageAddedWithEditor(imageUrl, fileName, size, &apos;드래그&드롭&apos;)
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
    const fileArray = Array.from(files).filter(file => file.type.startsWith(&apos;image/&apos;))
    const results = await handleFileSelection(files)

    // 업로드 성공한 이미지들을 에디터에 자동으로 삽입
    results?.forEach((result, index) => {
      if (result.success && result.url) {
        const fileName = fileArray[index]?.name || &apos;uploaded_image&apos;
        insertImageMarkdown(result.url, fileName)
      } else if (result.error) {
        console.error(`❌ 이미지 업로드 실패: ${result.error}`)
      }
    })

    // 다음 파일 선택을 위해 input 값 리셋
    e.target.value = &apos;'
  }

  const insertImageMarkdown = (url: string, fileName: string = &apos;image&apos;) => {

    if (editorRef.current) {
      try {
        editorRef.current.insertImage(url, fileName)
      } catch (error) {
        console.warn(&apos;Jodit 에디터 이미지 삽입 실패:&apos;, error)
        try {
          const imageHtml = `<p><img src=&quot;${url}&quot; alt=&quot;${fileName}&quot; style=&quot;max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;&quot; /></p><p><br/></p>`
          editorRef.current.insertHTML(imageHtml)
        } catch (htmlError) {
          console.warn(&apos;HTML 삽입도 실패, content state 업데이트:&apos;, htmlError)
          const imageHtml = `<p><img src=&quot;${url}&quot; alt=&quot;${fileName}&quot; style=&quot;max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;&quot; /></p><p><br/></p>`
          setContent(content + imageHtml)
        }
      }
    } else {
      const imageHtml = `<p><img src=&quot;${url}&quot; alt=&quot;${fileName}&quot; style=&quot;max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;&quot; /></p><p><br/></p>`
      setContent(content + imageHtml)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Force editor content sync (in case onBlur wasn&apos;t called)

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
        console.warn(&apos;에디터 내용 동기화 실패:&apos;, error)
      }
    } else {
      console.warn(&apos;⚠️ 에디터 ref가 null입니다. 현재 content 사용:&apos;, content)
    }

    const result = await handleSubmit()
    if (!result.success) {
      setError(result.error || &apos;제출에 실패했습니다&apos;)
    }
  }

  return (
    <div className={`writepost-container max-w-4xl mx-auto space-y-6 ${isDragging ? &apos;opacity-50&apos; : &apos;'} ${previewMode ? &apos;writepost-preview-mode&apos; : &apos;'}`}>

      {error && (
        <div className=&quot;bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg&quot;>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className=&quot;space-y-6&quot; data-toolname=&quot;createPost&quot; data-tooldescription=&quot;Create a new post in this channel&quot;>
        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className=&quot;flex items-center space-x-2&quot;>
              <User className=&quot;w-5 h-5&quot; />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className=&quot;space-y-4&quot;>
            {/* 제목 입력 */}
            <div>
              <label className=&quot;text-sm font-medium text-gray-700 mb-2 block&quot;>
                Title *
              </label>
              <Input
                value={title}
                onChange={(e) => updateField(&apos;title&apos;, e.target.value)}
                placeholder=&quot;Enter post title (5-300 characters)&quot;
                maxLength={300}
                className={!validation.isValid && validation.errors.some(e => e.field === &apos;title&apos;) ? &apos;border-red-500&apos; : &apos;'}
              />
              <div className=&quot;flex justify-between text-sm text-gray-500 mt-1&quot;>
                <span>{title.length}/300 chars</span>
                {validation.errors.find(e => e.field === &apos;title&apos;) && (
                  <span className=&quot;text-red-600&quot;>
                    {validation.errors.find(e => e.field === &apos;title&apos;)?.message}
                  </span>
                )}
              </div>
            </div>

            {/* 작성자명 표시 (로그인 User만) */}
            {user && (
              <div>
                <label className=&quot;text-sm font-medium text-gray-700 mb-2 block&quot;>
                  Author Name
                </label>
                <div className=&quot;flex items-center space-x-3&quot;>
                  <Input
                    value={authorName}
                    disabled={true}
                    className=&quot;flex-1 bg-gray-50&quot;
                    placeholder=&quot;Logged in user&quot;
                  />
                  <Badge variant=&quot;default&quot; className=&quot;bg-green-100 text-green-800&quot;>
                    Signed in
                  </Badge>
                </div>
              </div>
            )}
            
            {/* 로그인 필요 안내 */}
            {!user && (
              <div className=&quot;bg-yellow-50 border border-yellow-200 rounded-lg p-4&quot;>
                <div className=&quot;flex items-center space-x-2&quot;>
                  <AlertTriangle className=&quot;w-5 h-5 text-yellow-600&quot; />
                  <span className=&quot;text-sm font-medium text-yellow-800&quot;>
                    Writing Permission Required
                  </span>
                </div>
                <p className=&quot;text-sm text-yellow-700 mt-2&quot;>
                  You need to sign in to write posts. Please create an account or sign in.
                </p>
              </div>
            )}

            {/* 플레어 선택 */}
            <div>
              <label className=&quot;text-sm font-medium text-gray-700 mb-2 block&quot;>
                Flair (Optional)
              </label>
              <select
                value={selectedFlair || &apos;'}
                onChange={(e) => updateField(&apos;selectedFlair&apos;, e.target.value)}
                className=&quot;w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500&quot;
              >
                <option value=&quot;">Select flair</option>
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
          <div className=&quot;flex items-center justify-between mb-2&quot;>
            <label htmlFor=&quot;content-editor&quot; className=&quot;block text-sm font-medium text-gray-700&quot;>
              Content (Markdown supported)
            </label>
          </div>

          <div className=&quot;space-y-3&quot;>
            <div className=&quot;writepost-editor relative&quot;>
              <JoditEditor
                ref={editorRef}
                value={content}
                onChange={setContent}
                placeholder=&quot;Enter post content... (Optional)&quot;
                disabled={uploading}
                height={500}
                aria-label=&quot;Edit post content&quot;
              />

              {uploading && (
                <div className=&quot;absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-md z-20&quot;>
                  <div className=&quot;flex items-center space-x-2 text-blue-600&quot;>
                    <LoadingSpinner size=&quot;sm&quot; />
                    <span className=&quot;text-sm font-medium&quot;>Processing image...</span>
                  </div>
                </div>
              )}
            </div>

            {/* 링크 프리뷰 섹션 */}
            {(linkPreviews?.length || 0) > 0 && (
              <div className=&quot;space-y-2&quot;>
                {content.split(&apos;\n&apos;).map((line, lineIndex) => {
                  const urlMatch = line.match(/^\s*(https?:\/\/(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)\s*$/)
                  if (!urlMatch) return null

                  const url = urlMatch[1].replace(/[.,;!?]$/, &apos;')

                  let isValidUrl = false
                  try {
                    const parsedUrl = new URL(url)
                    const domain = parsedUrl.hostname
                    isValidUrl = domain.includes(&apos;.&apos;) && domain.length >= 4 && !domain.endsWith(&apos;.&apos;)
                  } catch {
                    isValidUrl = false
                  }

                  if (!isValidUrl) return null

                  const preview = (linkPreviews || []).find(p => p.url === url)
                  if (!preview || preview.error) return null

                  return (
                    <div key={lineIndex} className=&quot;writepost-preview bg-purple-50 border border-purple-200 rounded-lg p-3&quot;>
                      <div className=&quot;flex gap-3&quot;>
                        {preview.image && (
                          <div className=&quot;flex-shrink-0&quot;>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview.image} alt={`${preview.title || &apos;Preview image&apos;}`} className=&quot;w-16 h-16 object-cover rounded&quot; />
                          </div>
                        )}
                        <div className=&quot;flex-1 min-w-0&quot;>
                          {preview.title && (
                            <h4 className=&quot;font-medium text-gray-900 text-sm mb-1&quot;>{preview.title}</h4>
                          )}
                          {preview.description && (
                            <p className=&quot;text-gray-600 text-xs mb-2 line-clamp-2&quot;>{preview.description}</p>
                          )}
                          <p className=&quot;text-blue-600 text-xs break-all&quot;>{url}</p>
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
          <div className=&quot;p-3 bg-blue-50 border border-blue-200 rounded-lg&quot;>
            <div className=&quot;flex items-center space-x-2 mb-2&quot;>
              <span className=&quot;text-sm font-medium text-blue-800&quot;>📋 Detected Links</span>
              <span className=&quot;text-xs text-blue-600&quot;>({(linkPreviews || []).length} links)</span>
            </div>
            <div className=&quot;flex flex-wrap gap-2&quot;>
              {(linkPreviews || []).map((preview, index) => (
                <div key={index} className={`px-2 py-1 rounded text-xs ${preview.error ? &apos;bg-red-100 text-red-700&apos; : &apos;bg-green-100 text-green-700&apos;
                  }`}>
                  {preview.error ? &apos;❌&apos; : &apos;✅&apos;} {preview.title || preview.url}
                </div>
              ))}
            </div>
            <p className=&quot;text-xs text-blue-600 mt-2&quot;>
              💡 Enter URL on each line to display preview below.
            </p>
          </div>
        )}

        {/* 클립보드 붙여넣기 정보 */}
        {(pastedImages?.length || 0) > 0 && (
          <div className=&quot;p-4 bg-blue-50 border border-blue-200 rounded-lg&quot;>
            <div className=&quot;flex items-center space-x-2 mb-3&quot;>
              <Clipboard className=&quot;w-4 h-4 text-blue-600&quot; />
              <span className=&quot;text-sm font-medium text-blue-800&quot;>Images Pasted from Clipboard</span>
            </div>
            <div className=&quot;space-y-2&quot;>
              {(pastedImages || []).map((image, index) => (
                <div key={index} className=&quot;flex items-center justify-between p-2 bg-white rounded border&quot;>
                  <div className=&quot;flex items-center space-x-3&quot;>
                    <Image className=&quot;w-4 h-4 text-gray-500&quot; />
                    <div>
                      <p className=&quot;text-sm font-medium text-gray-900&quot;>{image.fileName}</p>
                      <p className=&quot;text-xs text-gray-500&quot;>{formatFileSize(image.size)}</p>
                    </div>
                  </div>
                  <Badge variant=&quot;secondary&quot; className=&quot;text-xs&quot;>WebP Optimized</Badge>
                </div>
              ))}
              <p className=&quot;text-xs text-gray-600 mt-2&quot;>
                💡 Tip: You can paste images directly with Ctrl+V or Cmd+V. Images are automatically optimized to WebP format.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* 이미지 업로드 */}
        <div className=&quot;space-y-2&quot;>
          <label htmlFor=&quot;image-upload&quot; className=&quot;block text-sm font-medium text-gray-700&quot;>Image Upload</label>
          <div className=&quot;flex items-center gap-3&quot;>
            <input
              id=&quot;image-upload&quot;
              type=&quot;file&quot;
              accept=&quot;image/*&quot;
              multiple
              onChange={onSelectImages}
              disabled={uploading}
              className={uploading ? &apos;opacity-50 cursor-not-allowed&apos; : &apos;'}
              aria-describedby=&quot;image-help&quot;
            />
            {uploading && (
              <div className=&quot;flex items-center space-x-2 text-blue-600&quot;>
                <LoadingSpinner size=&quot;sm&quot; />
                <span className=&quot;text-sm&quot;>Uploading image...</span>
              </div>
            )}
          </div>
          <p id=&quot;image-help&quot; className=&quot;text-xs text-gray-500&quot;>
            You can select multiple images. Drag & drop and clipboard pasting are also supported.
          </p>
          {((images?.length || 0) > 0 || (uploadingFiles?.length || 0) > 0) && (
            <div className=&quot;space-y-2&quot;>
              <p className=&quot;text-xs text-gray-500&quot;>Uploaded Images (Click to insert into content)</p>
              <div className=&quot;flex flex-wrap gap-2&quot; role=&quot;list&quot; aria-label=&quot;List of uploaded images&quot;>
                {(uploadingFiles || []).map((fileName, index) => (
                  <div
                    key={`uploading-${index}`}
                    className=&quot;border rounded-md p-1 flex flex-col items-center bg-gray-50 animate-pulse&quot;
                    role=&quot;listitem&quot;
                    aria-label={`${fileName} uploading`}
                  >
                    <div className=&quot;w-20 h-20 bg-gray-200 rounded mb-1 flex items-center justify-center&quot;>
                      <LoadingSpinner size=&quot;sm&quot; />
                    </div>
                    <span className=&quot;text-xs text-gray-400 truncate max-w-20&quot;>{fileName}</span>
                    <Badge variant=&quot;outline&quot; className=&quot;text-xs mt-1&quot;>Uploading...</Badge>
                  </div>
                ))}
                {(images || []).map((image) => {
                  const fileName = image.fileName || &apos;image&apos;

                  return (
                    <button
                      type=&quot;button&quot;
                      key={image.url}
                      onClick={() => insertImageMarkdown(image.url, fileName)}
                      className=&quot;border rounded-md p-1 flex flex-col items-center hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none&quot;
                      role=&quot;listitem&quot;
                      aria-label={`${fileName} Click to insert into content`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={fileName}
                        className=&quot;w-20 h-20 object-cover rounded mb-1&quot;
                        loading=&quot;lazy&quot;
                      />
                      <span className=&quot;text-xs text-gray-600 truncate max-w-20&quot;>{fileName}</span>
                      <Badge variant=&quot;secondary&quot; className=&quot;text-xs mt-1&quot;>Click to insert</Badge>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* 제출 버튼 */}
        <div className=&quot;flex justify-between items-center&quot;>
          <div className=&quot;flex space-x-3&quot;>

            <Button
              type=&quot;button&quot;
              variant=&quot;ghost&quot;
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>

          <Button
            type=&quot;submit&quot;
            disabled={isSubmitDisabled || !canSubmit}
            className=&quot;flex items-center space-x-2&quot;
          >
            {submitting ? (
              <>
                <LoadingSpinner size=&quot;sm&quot; />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Send className=&quot;w-4 h-4&quot; />
                <span>{postId ? &apos;Update&apos; : &apos;Publish&apos;}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}