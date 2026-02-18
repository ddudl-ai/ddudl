'use client&apos;

import { useRef, useMemo, forwardRef, useImperativeHandle } from &apos;react&apos;
import dynamic from &apos;next/dynamic&apos;
import { Jodit } from &apos;jodit&apos;

// Jodit React를 동적으로 불러오기 (SSR 비활성화)
const JoditReact = dynamic(() => import(&apos;jodit-react&apos;), {
  ssr: false,
  loading: () => (
    <div className=&quot;min-h-[400px] bg-gray-50 rounded-md flex items-center justify-center&quot;>
      <span className=&quot;text-gray-400&quot;>Loading editor...</span>
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
  ({ value, onChange, placeholder = &apos;Write something...&apos;, disabled = false, height = 500 }, ref) => {
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
          &apos;bold&apos;, &apos;italic&apos;, &apos;underline&apos;, &apos;strikethrough&apos;, &apos;|&apos;,
          &apos;ul&apos;, &apos;ol&apos;, &apos;|&apos;,
          &apos;outdent&apos;, &apos;indent&apos;, &apos;|&apos;,
          &apos;font&apos;, &apos;fontsize&apos;, &apos;paragraph&apos;, &apos;|&apos;,
          &apos;image&apos;, &apos;link&apos;, &apos;table&apos;, &apos;|&apos;,
          &apos;align&apos;, &apos;|&apos;,
          &apos;undo&apos;, &apos;redo&apos;, &apos;|&apos;,
          &apos;hr&apos;, &apos;eraser&apos;, &apos;fullsize&apos;, &apos;preview&apos;
        ],
        buttonsMD: [
          &apos;bold&apos;, &apos;italic&apos;, &apos;underline&apos;, &apos;|&apos;,
          &apos;ul&apos;, &apos;ol&apos;, &apos;|&apos;,
          &apos;image&apos;, &apos;link&apos;, &apos;|&apos;,
          &apos;align&apos;, &apos;|&apos;,
          &apos;undo&apos;, &apos;redo&apos;, &apos;|&apos;,
          &apos;preview&apos;
        ],
        buttonsSM: [
          &apos;bold&apos;, &apos;italic&apos;, &apos;|&apos;,
          &apos;ul&apos;, &apos;ol&apos;, &apos;|&apos;,
          &apos;image&apos;, &apos;link&apos;, &apos;|&apos;,
          &apos;undo&apos;, &apos;redo&apos;
        ],
        buttonsXS: [
          &apos;bold&apos;, &apos;italic&apos;,
          &apos;image&apos;, &apos;link&apos;
        ],
        // English (Jodit default)
        language: &apos;en&apos;,
        // 이미지 업로드 설정
        uploader: {
          insertImageAsBase64URI: false,
          url: &apos;/api/upload&apos;,
          format: &apos;json&apos;,
          pathVariableName: &apos;path&apos;,
          filesVariableName: () => &apos;files&apos;,
          prepareData: function (formData: FormData) {
            return formData
          },
          isSuccess: function (resp: any) {
            return !resp.error
          },
          getMessage: function (resp: any) {
            return resp.error?.message || &apos;Upload failed&apos;
          },
          process: function (resp: any) {
            // 서버의 응답을 그대로 반환 (success 필드 포함)
            return resp
          },
          error: function (e: Error) {
            console.error(&apos;Upload error:&apos;, e.message)
          }
        },
        // 에디터 스타일
        style: {
          font: &apos;16px/1.6 &quot;Noto Sans KR&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, sans-serif&apos;,
          color: &apos;#333&apos;
        },
        // 추가 설정
        askBeforePasteHTML: false,
        askBeforePasteFromWord: false,
        defaultActionOnPaste: &apos;insert_clear_html&apos; as const,
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
        enter: &apos;p&apos; as const,
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
            if (typeof editor.current.blur === &apos;function&apos;) {
              editor.current.blur()
            } else if (editor.current.editor && typeof editor.current.editor.blur === &apos;function&apos;) {
              editor.current.editor.blur()
            } else {
              // 직접 DOM 요소에서 focus 제거
              const editorElement = editor.current.editor || editor.current
              if (editorElement && typeof editorElement.blur === &apos;function&apos;) {
                editorElement.blur()
              }
            }

            // onChange 이벤트를 수동으로 트리거
            const currentContent = editor.current.value || &apos;'
            onChange(currentContent)
          } catch (error) {
            console.warn(&apos;⚠️ Blur 처리 중 오류:&apos;, error)
            // 오류 발생 시에도 최소한 onChange는 호출
            const currentContent = editor.current.value || &apos;'
            onChange(currentContent)
          }
        }
      },
      getContent: () => {
        return editor.current?.value || &apos;'
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
      insertImage: (url: string, alt: string = &apos;', width?: string, height?: string) => {

        if (editor.current) {
          try {
            // 현재 커서 위치에 이미지 삽입
            const imageHtml = `<p><img src=&quot;${url}&quot; alt=&quot;${alt}&quot; style=&quot;max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;&quot; ${width ? `width=&quot;${width}&quot;` : &apos;'} ${height ? `height=&quot;${height}&quot;` : &apos;'} /></p><p><br /></p>`


            // Jodit의 selection API 사용하여 이미지 삽입
            if (editor.current.selection) {
              editor.current.selection.insertHTML(imageHtml)
            } else {
              // selection API가 없는 경우 직접 value에 추가
              const currentValue = editor.current.value || &apos;'
              editor.current.value = currentValue + imageHtml
            }

            // 변경사항 트리거
            editor.current.events?.fire(&apos;change&apos;, editor.current.value)


          } catch (error) {
            console.error(&apos;❌ JoditEditor insertImage 에러:&apos;, error)
          }
        } else {
          console.warn(&apos;⚠️ editor.current가 null입니다&apos;)
        }
      }
    }))

    return (
      <div className=&quot;jodit-wrapper&quot;>
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

JoditEditor.displayName = &apos;JoditEditor&apos;

export default JoditEditor
