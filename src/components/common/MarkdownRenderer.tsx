"use client&quot;

import React from &apos;react&apos;
import ReactMarkdown from &apos;react-markdown&apos;
import remarkGfm from &apos;remark-gfm&apos;

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className=&quot;prose max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2&quot;>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

