// T027: PostEditor 모듈 - 모듈형 아키텍처로 리팩터링
// WritePostForm에서 독립적으로 사용할 수 있는 PostEditor 모듈

'use client'

import React from 'react'
import { PostEditor as PostEditorComponent, type PostEditorProps } from '../PostEditor'

// PostEditor 모듈의 메인 인터페이스
export interface PostEditorModuleProps extends Omit<PostEditorProps, 'className'> {
  className?: string
  variant?: 'default' | 'compact' | 'full'
  theme?: 'light' | 'dark'
}

// PostEditor 모듈 wrapper - 다양한 variant와 theme 지원
export function PostEditor({
  className = '',
  variant = 'default',
  theme = 'light',
  ...props
}: PostEditorModuleProps) {
  const variantClasses = {
    default: 'min-h-[400px]',
    compact: 'min-h-[300px]',
    full: 'min-h-[600px]'
  }

  const themeClasses = {
    light: 'bg-white border-gray-200',
    dark: 'bg-gray-900 border-gray-700'
  }

  const moduleClasses = [
    'post-editor-module',
    'rounded-lg border',
    variantClasses[variant],
    themeClasses[theme],
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={moduleClasses}>
      <PostEditorComponent
        className="h-full"
        showToolbar={variant !== 'compact'}
        autoResize={variant === 'full'}
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
export type { PostEditorData } from '../PostEditor'
export { PostEditor as PostEditorModule } from './index'