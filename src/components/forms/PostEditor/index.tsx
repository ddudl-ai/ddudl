// T027: PostEditor 모듈 - 모듈형 아키텍처로 리팩터링
// WritePostForm에서 독립적으로 사용할 수 있는 PostEditor 모듈

'use client&apos;

import React from &apos;react&apos;
import { PostEditor as PostEditorComponent, type PostEditorProps } from &apos;../PostEditor&apos;

// PostEditor 모듈의 메인 인터페이스
export interface PostEditorModuleProps extends Omit<PostEditorProps, &apos;className&apos;> {
  className?: string
  variant?: &apos;default&apos; | &apos;compact&apos; | &apos;full&apos;
  theme?: &apos;light&apos; | &apos;dark&apos;
}

// PostEditor 모듈 wrapper - 다양한 variant와 theme 지원
export function PostEditor({
  className = &apos;',
  variant = &apos;default&apos;,
  theme = &apos;light&apos;,
  ...props
}: PostEditorModuleProps) {
  const variantClasses = {
    default: &apos;min-h-[400px]&apos;,
    compact: &apos;min-h-[300px]&apos;,
    full: &apos;min-h-[600px]&apos;
  }

  const themeClasses = {
    light: &apos;bg-white border-gray-200&apos;,
    dark: &apos;bg-gray-900 border-gray-700&apos;
  }

  const moduleClasses = [
    &apos;post-editor-module&apos;,
    &apos;rounded-lg border&apos;,
    variantClasses[variant],
    themeClasses[theme],
    className
  ].filter(Boolean).join(&apos; &apos;)

  return (
    <div className={moduleClasses}>
      <PostEditorComponent
        className=&quot;h-full&quot;
        showToolbar={variant !== &apos;compact&apos;}
        autoResize={variant === &apos;full&apos;}
        enableKeyboardShortcuts={true}
        enableTabIndent={true}
        convertPastedHtml={true}
        {...props}
      />
    </div>
  )
}

// PostEditor의 기본 export
export default PostEditor

// 편의를 위한 re-export
export type { PostEditorData } from &apos;../PostEditor&apos;
export { PostEditor as PostEditorModule } from &apos;./index&apos;