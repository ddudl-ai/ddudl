'use client'

import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import dynamic from 'next/dynamic'
import { Jodit } from 'jodit'

// Jodit React를 동적으로 불러오기 (SSR 비활성화)
const JoditReact = dynamic(() => import('jodit-react'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] bg-gray-50 rounded-md flex items-center justify-center">
      <span className="text-gray-400">Loading editor...</span>
    </div>
  ),
})

interface JoditEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  disabled?: boolean
  height?: number
}

export interface JoditEditorRef {
  focus: () => void
  blur: () => void
  getContent: () => string
  setContent: (content: string) => void
  insertHTML: (html: string) => void
  insertImage: (url: string, alt?: string, width?: string, height?: string) => void
}

const JoditEditor = forwardRef<JoditEditorRef, JoditEditorProps>(
  ({ value, onChange, placeholder = 'Write something...', disabled = false, height = 500 }, ref) => {
    const editor = useRef<any>(null)

    // Jodit 설정
    const config = useMemo(
      () => ({
        readonly: disabled,
        placeholder,
        height,
        minHeight: 400,
        maxHeight: 800,
        // 툴바 설정
        buttons: [
          'bold', 'italic', 'underline', 'strikethrough', '|',
          'ul', 'ol', '|',
          'outdent', 'indent', '|',
          'font', 'fontsize', 'paragraph', '|',
          'image', 'link', 'table', '|',
          'align', '|',
          'undo', 'redo', '|',
          'hr', 'eraser', 'fullsize', 'preview'
        ],
        buttonsMD: [
          'bold', 'italic', 'underline', '|',
          'ul', 'ol', '|',
          'image', 'link', '|',
          'align', '|',
          'undo', 'redo', '|',
          'preview'
        ],
        buttonsSM: [
          'bold', 'italic', '|',
          'ul', 'ol', '|',
          'image', 'link', '|',
          'undo', 'redo'
        ],
        buttonsXS: [
          'bold', 'italic',
          'image', 'link'
        ],
        // English (Jodit default)
        language: 'en',
        // 이미지 업로드 설정
        uploader: {
          insertImageAsBase64URI: false,
          url: '/api/upload',
          format: 'json',
          pathVariableName: 'path',
          filesVariableName: () => 'files',
          prepareData: function (formData: FormData) {
            return formData
          },
          isSuccess: function (resp: any) {
            return !resp.error
          },
          getMessage: function (resp: any) {
            return resp.error?.message || 'Upload failed'
          },
          process: function (resp: any) {
            // 서버의 응답을 그대로 반환 (success 필드 포함)
            return resp
          },
          error: function (e: Error) {
            console.error('Upload error:', e.message)
          }
        },
        // 에디터 스타일
        style: {
          font: '16px/1.6 "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#333'
        },
        // 추가 설정
        askBeforePasteHTML: false,
        askBeforePasteFromWord: false,
        defaultActionOnPaste: 'insert_clear_html' as const,
        beautyHTML: true,
        toolbarAdaptive: false,
        showCharsCounter: false,
        showWordsCounter: false,
        showXPathInStatusbar: false,
        // 클립보드 이미지 붙여넣기 허용
        processPasteHTML: true,
        // 드래그 앤 드롭 허용
        draggable: true,
        // Enter 키 동작
        enter: 'p' as const,
        // 탭 크기
        tabIndex: 0,
        // 이미지 리사이징 허용
        resizer: {
          showSize: true,
          hideSizeTimeout: 2000
        },
        // 클래스 및 스타일 허용
        cleanHTML: {
          allowTags: {
            p: true,
            a: {
              href: true,
              target: true
            },
            iframe: {
              src: true,
              width: true,
              height: true,
              style: true,
              class: true,
              allow: true,
              allowfullscreen: true,
              frameborder: true,
              referrerpolicy: true
            },
            img: {
              src: true,
              alt: true,
              width: true,
              height: true
            },
            br: true,
            strong: true,
            b: true,
            i: true,
            em: true,
            u: true,
            span: {
              style: true
            },
            div: {
              style: true,
              class: true
            },
            h1: true,
            h2: true,
            h3: true,
            h4: true,
            h5: true,
            h6: true,
            ul: true,
            ol: true,
            li: true,
            blockquote: true,
            code: true,
            pre: true,
            hr: true,
            table: true,
            thead: true,
            tbody: true,
            tr: true,
            td: {
              colspan: true,
              rowspan: true
            },
            th: {
              colspan: true,
              rowspan: true
            }
          }
        }
      }),
      [placeholder, disabled, height]
    )

    useImperativeHandle(ref, () => ({
      focus: () => {
        editor.current?.focus()
      },
      blur: () => {
        if (editor.current) {
          try {
            // Jodit 에디터의 blur 처리
            if (typeof editor.current.blur === 'function') {
              editor.current.blur()
            } else if (editor.current.editor && typeof editor.current.editor.blur === 'function') {
              editor.current.editor.blur()
            } else {
              // 직접 DOM 요소에서 focus 제거
              const editorElement = editor.current.editor || editor.current
              if (editorElement && typeof editorElement.blur === 'function') {
                editorElement.blur()
              }
            }

            // onChange 이벤트를 수동으로 트리거
            const currentContent = editor.current.value || ''
            onChange(currentContent)
          } catch (error) {
            console.warn('⚠️ Blur 처리 중 오류:', error)
            // 오류 발생 시에도 최소한 onChange는 호출
            const currentContent = editor.current.value || ''
            onChange(currentContent)
          }
        }
      },
      getContent: () => {
        return editor.current?.value || ''
      },
      setContent: (content: string) => {
        if (editor.current) {
          editor.current.value = content
        }
      },
      insertHTML: (html: string) => {
        if (editor.current) {
          // Jodit 에디터의 insertHTML 메소드 사용
          editor.current.selection.insertHTML(html)
        }
      },
      insertImage: (url: string, alt: string = '', width?: string, height?: string) => {

        if (editor.current) {
          try {
            // 현재 커서 위치에 이미지 삽입
            const imageHtml = `<p><img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" ${width ? `width="${width}"` : ''} ${height ? `height="${height}"` : ''} /></p><p><br /></p>`


            // Jodit의 selection API 사용하여 이미지 삽입
            if (editor.current.selection) {
              editor.current.selection.insertHTML(imageHtml)
            } else {
              // selection API가 없는 경우 직접 value에 추가
              const currentValue = editor.current.value || ''
              editor.current.value = currentValue + imageHtml
            }

            // 변경사항 트리거
            editor.current.events?.fire('change', editor.current.value)


          } catch (error) {
            console.error('❌ JoditEditor insertImage 에러:', error)
          }
        } else {
          console.warn('⚠️ editor.current가 null입니다')
        }
      }
    }))

    return (
      <div className="jodit-wrapper">
        <JoditReact
          ref={editor}
          value={value}
          config={config as any}
          onBlur={(newContent) => {
            onChange(newContent)
          }}
          // onChange 제거 - 실시간 업데이트로 인한 커서 이동 방지
        />
        <style jsx global>{`
          .jodit-wrapper .jodit-container {
            border-radius: 0.375rem;
            overflow: hidden;
          }
          .jodit-wrapper .jodit-toolbar__box {
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
          }
          .jodit-wrapper .jodit-workplace {
            background: white;
          }
          .jodit-wrapper .jodit-wysiwyg {
            padding: 1rem;
            line-height: 1.6;
          }
          .jodit-wrapper .jodit-wysiwyg p {
            margin-bottom: 0.5rem;
          }
          .jodit-wrapper .jodit-wysiwyg img {
            max-width: 100%;
            height: auto;
          }
          .jodit-wrapper.jodit-fullsize-box {
            z-index: 9999;
          }
        `}</style>
      </div>
    )
  }
)

JoditEditor.displayName = 'JoditEditor'

export default JoditEditor
