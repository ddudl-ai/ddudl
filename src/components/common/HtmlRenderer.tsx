"use client&quot;

import React from &apos;react&apos;
import DOMPurify from &apos;isomorphic-dompurify&apos;

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
        return `<div class=&quot;yt-embed&quot;><iframe src=&quot;${src}&quot; width=&quot;560&quot; height=&quot;315&quot; allow=&quot;accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share&quot; allowfullscreen referrerpolicy=&quot;no-referrer-when-downgrade&quot;></iframe></div>`
      })
    }
    return out
  }

  const preprocessed = convertYouTubeLinks(content)

  // Safely sanitize HTML content while allowing YouTube embeds
  let sanitizedContent = DOMPurify.sanitize(preprocessed, {
    ALLOWED_TAGS: [
      &apos;p&apos;, &apos;br&apos;, &apos;strong&apos;, &apos;em&apos;, &apos;u&apos;, &apos;s&apos;, &apos;blockquote&apos;,
      &apos;ul&apos;, &apos;ol&apos;, &apos;li&apos;, &apos;a&apos;, &apos;img&apos;, &apos;h1&apos;, &apos;h2&apos;, &apos;h3&apos;,
      &apos;h4&apos;, &apos;h5&apos;, &apos;h6&apos;, &apos;pre&apos;, &apos;code&apos;, &apos;table&apos;, &apos;thead&apos;,
      &apos;tbody&apos;, &apos;tr&apos;, &apos;th&apos;, &apos;td&apos;, &apos;hr&apos;, &apos;div&apos;, &apos;span&apos;,
      &apos;iframe&apos;
    ],
    ALLOWED_ATTR: [
      &apos;href&apos;, &apos;target&apos;, &apos;rel&apos;, &apos;src&apos;, &apos;alt&apos;, &apos;width&apos;,
      &apos;height&apos;, &apos;class&apos;, &apos;style&apos;, &apos;id&apos;,
      &apos;allow&apos;, &apos;allowfullscreen&apos;, &apos;frameborder&apos;, &apos;referrerpolicy&apos;
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ALLOW_DATA_ATTR: false
  })

  // Post-filter: only allow iframe embeds from YouTube (including nocookie)
  try {
    if (typeof window !== &apos;undefined&apos;) {
      const wrapper = document.createElement(&apos;div&apos;)
      wrapper.innerHTML = sanitizedContent
      const iframes = wrapper.querySelectorAll(&apos;iframe&apos;)

      iframes.forEach((iframe) => {
        const src = iframe.getAttribute(&apos;src&apos;) || &apos;'
        const allowed = /^https?:\/\/(?:www\.)?(youtube\.com|youtube-nocookie\.com)\/.+/i.test(src)

        if (!allowed) {
          iframe.remove()
        } else {
          // Ensure minimal safe attrs
          iframe.setAttribute(&apos;allowfullscreen&apos;, &apos;true&apos;)
          iframe.setAttribute(&apos;referrerpolicy&apos;, &apos;no-referrer-when-downgrade&apos;)
          // Responsive sizing fallback
          if (!iframe.getAttribute(&apos;width&apos;)) iframe.setAttribute(&apos;width&apos;, &apos;560&apos;)
          if (!iframe.getAttribute(&apos;height&apos;)) iframe.setAttribute(&apos;height&apos;, &apos;315&apos;)
          const cls = (iframe.getAttribute(&apos;class&apos;) || &apos;') + &apos; rounded-md&apos;
          iframe.setAttribute(&apos;class&apos;, cls.trim())
        }
      })
      sanitizedContent = wrapper.innerHTML
    }
  } catch (error) {
    console.error(&apos;Post-filter error:&apos;, error)
  }

  return (
    <div
      className=&quot;prose max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-img:max-w-full prose-img:h-auto html-content&quot;
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}