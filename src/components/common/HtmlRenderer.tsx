"use client"

import React from 'react'
import DOMPurify from 'isomorphic-dompurify'

interface HtmlRendererProps {
  content: string
}

export function HtmlRenderer({ content }: HtmlRendererProps) {
  // Simple preprocessing: Convert YouTube links to embeds (skip if iframe already exists)
  const convertYouTubeLinks = (html: string) => {
    if (/\<iframe[\s\S]*youtube\.com/i.test(html)) return html

    // Plain URL patterns
    const patterns = [
      /https?:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})/g,
      /https?:\/\/youtu\.be\/([\w-]{11})/g
    ]
    let out = html
    for (const re of patterns) {
      out = out.replace(re, (_m, id) => {
        const src = `https://www.youtube.com/embed/${id}`
        return `<div class="yt-embed"><iframe src="${src}" width="560" height="315" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>`
      })
    }
    return out
  }

  const preprocessed = convertYouTubeLinks(content)

  // Safely sanitize HTML content while allowing YouTube embeds
  let sanitizedContent = DOMPurify.sanitize(preprocessed, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'blockquote',
      'ul', 'ol', 'li', 'a', 'img', 'h1', 'h2', 'h3',
      'h4', 'h5', 'h6', 'pre', 'code', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span',
      'iframe'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'width',
      'height', 'class', 'style', 'id',
      'allow', 'allowfullscreen', 'frameborder', 'referrerpolicy'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ALLOW_DATA_ATTR: false
  })

  // Post-filter: only allow iframe embeds from YouTube (including nocookie)
  try {
    if (typeof window !== 'undefined') {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = sanitizedContent
      const iframes = wrapper.querySelectorAll('iframe')

      iframes.forEach((iframe) => {
        const src = iframe.getAttribute('src') || ''
        const allowed = /^https?:\/\/(?:www\.)?(youtube\.com|youtube-nocookie\.com)\/.+/i.test(src)

        if (!allowed) {
          iframe.remove()
        } else {
          // Ensure minimal safe attrs
          iframe.setAttribute('allowfullscreen', 'true')
          iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade')
          // Responsive sizing fallback
          if (!iframe.getAttribute('width')) iframe.setAttribute('width', '560')
          if (!iframe.getAttribute('height')) iframe.setAttribute('height', '315')
          const cls = (iframe.getAttribute('class') || '') + ' rounded-md'
          iframe.setAttribute('class', cls.trim())
        }
      })
      sanitizedContent = wrapper.innerHTML
    }
  } catch (error) {
    console.error('Post-filter error:', error)
  }

  return (
    <div
      className="prose max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-img:max-w-full prose-img:h-auto html-content"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}