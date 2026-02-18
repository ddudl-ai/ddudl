'use client&apos;

import { useState, useEffect } from &apos;react&apos;
import { Globe, Play } from &apos;lucide-react&apos;

interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  error?: boolean
  isYoutube?: boolean
  youtubeId?: string
}

interface LinkPreviewProps {
  content: string
}

const URL_REGEX = /^\s*(https?:\/\/(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?)\s*$/
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/

// YouTube 비디오 ID 추출 함수
function getYouTubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX)
  return match ? match[1] : null
}

export default function LinkPreview({ content }: LinkPreviewProps) {
  const [linkPreviews, setLinkPreviews] = useState<Array<LinkPreview>>([])
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set())

  const toggleVideoExpanded = (url: string) => {
    setExpandedVideos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(url)) {
        newSet.delete(url)
      } else {
        newSet.add(url)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (!content) return

    const lines = content.split(&apos;\n&apos;)
    const urls: string[] = []
    
    lines.forEach(line => {
      const match = line.match(URL_REGEX)
      if (match) {
        const url = match[1].trim()
        try {
          new URL(url)
          if (!urls.includes(url)) {
            urls.push(url)
          }
        } catch {
          // Invalid URL, skip
        }
      }
    })

    if (urls.length === 0) {
      setLinkPreviews([])
      return
    }

    const fetchPreviews = async () => {
      const previews: LinkPreview[] = []
      
      for (const url of urls) {
        try {
          // YouTube 링크 감지
          const youtubeId = getYouTubeVideoId(url)
          
          const response = await fetch(&apos;/api/link-preview&apos;, {
            method: &apos;POST&apos;,
            headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
            body: JSON.stringify({ url }),
          })

          if (response.ok) {
            const preview = await response.json()
            previews.push({ 
              url, 
              ...preview, 
              isYoutube: !!youtubeId,
              youtubeId: youtubeId || undefined
            })
          } else {
            previews.push({ url, error: true })
          }
        } catch (error) {
          console.error(`Failed to fetch preview for ${url}:`, error)
          previews.push({ url, error: true })
        }
      }
      
      setLinkPreviews(previews)
    }

    fetchPreviews()
  }, [content])

  if (linkPreviews.length === 0) {
    return null
  }

  return (
    <div className=&quot;space-y-3 mt-4&quot;>
      {linkPreviews.map((preview, index) => (
        <div key={index} className=&quot;border rounded-lg overflow-hidden bg-gray-50 transition-colors&quot;>
          {preview.error ? (
            <div className=&quot;p-4 flex items-center space-x-3&quot;>
              <Globe className=&quot;w-5 h-5 text-gray-400&quot; />
              <div className=&quot;flex-1&quot;>
                <p className=&quot;text-sm text-gray-600&quot;>Unable to load link preview</p>
                <a 
                  href={preview.url} 
                  target=&quot;_blank&quot; 
                  rel=&quot;noopener noreferrer&quot;
                  className=&quot;text-blue-600 hover:underline text-sm&quot;
                >
                  {preview.url}
                </a>
              </div>
            </div>
          ) : preview.isYoutube && preview.youtubeId ? (
            // YouTube 임베드 플레이어
            <div className=&quot;bg-white&quot;>
              {expandedVideos.has(preview.url) ? (
                // 확장된 상태: 실제 YouTube 플레이어
                <div className=&quot;space-y-2&quot;>
                  <div className=&quot;aspect-video w-full&quot;>
                    <iframe
                      width=&quot;100%&quot;
                      height=&quot;100%&quot;
                      src={`https://www.youtube-nocookie.com/embed/${preview.youtubeId}?autoplay=0&modestbranding=1&rel=0`}
                      title=&quot;YouTube video player&quot;
                      frameBorder=&quot;0&quot;
                      allow=&quot;accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture&quot;
                      allowFullScreen
                      className=&quot;rounded-t-lg&quot;
                    />
                  </div>
                  <div className=&quot;p-3&quot;>
                    <div className=&quot;flex justify-between items-start&quot;>
                      <div className=&quot;flex-1&quot;>
                        <h4 className=&quot;font-medium text-sm text-gray-900 line-clamp-2&quot;>
                          {preview.title || &apos;No Title&apos;}
                        </h4>
                        {preview.description && (
                          <p className=&quot;text-xs text-gray-600 line-clamp-2 mt-1&quot;>
                            {preview.description}
                          </p>
                        )}
                        <a 
                          href={preview.url} 
                          target=&quot;_blank&quot; 
                          rel=&quot;noopener noreferrer&quot;
                          className=&quot;text-xs text-blue-600 hover:underline mt-2 inline-block&quot;
                        >
                          Watch on YouTube
                        </a>
                      </div>
                      <button
                        onClick={() => toggleVideoExpanded(preview.url)}
                        className=&quot;ml-2 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border&quot;
                      >
                        Collapse
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // 축소된 상태: 썸네일과 재생 버튼
                <div 
                  onClick={() => toggleVideoExpanded(preview.url)}
                  className=&quot;cursor-pointer hover:bg-gray-100 transition-colors&quot;
                >
                  <div className=&quot;flex&quot;>
                    <div className=&quot;w-32 h-20 flex-shrink-0 relative&quot;>
                      {preview.image && (
                        <>
                          <img 
                            src={preview.image} 
                            alt=&quot;YouTube thumbnail&quot; 
                            className=&quot;w-full h-full object-cover&quot;
                          />
                          <div className=&quot;absolute inset-0 flex items-center justify-center bg-black bg-opacity-30&quot;>
                            <div className=&quot;bg-red-600 rounded-full p-2&quot;>
                              <Play className=&quot;w-4 h-4 text-white fill-white&quot; />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className=&quot;flex-1 p-3 min-w-0&quot;>
                      <h4 className=&quot;font-medium text-sm line-clamp-2 text-gray-900&quot;>
                        {preview.title || &apos;No Title&apos;}
                      </h4>
                      {preview.description && (
                        <p className=&quot;text-xs text-gray-600 line-clamp-2 mt-1&quot;>
                          {preview.description}
                        </p>
                      )}
                      <p className=&quot;text-xs text-red-600 mt-2&quot;>
                        YouTube • Click to play
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // 일반 링크 프리뷰
            <a 
              href={preview.url} 
              target=&quot;_blank&quot; 
              rel=&quot;noopener noreferrer&quot;
              className=&quot;block hover:bg-gray-100 transition-colors&quot;
            >
              <div className=&quot;flex&quot;>
                {preview.image && (
                  <div className=&quot;w-24 h-16 flex-shrink-0&quot;>
                    <img 
                      src={preview.image} 
                      alt=&quot;preview&quot; 
                      className=&quot;w-full h-full object-cover&quot;
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = &apos;none&apos;
                      }}
                    />
                  </div>
                )}
                <div className=&quot;flex-1 p-3 min-w-0&quot;>
                  <h4 className=&quot;font-medium text-sm line-clamp-1 text-gray-900&quot;>
                    {preview.title || &apos;No Title&apos;}
                  </h4>
                  {preview.description && (
                    <p className=&quot;text-xs text-gray-600 line-clamp-2 mt-1&quot;>
                      {preview.description}
                    </p>
                  )}
                  <p className=&quot;text-xs text-blue-600 mt-2 truncate&quot;>
                    {preview.url}
                  </p>
                </div>
              </div>
            </a>
          )}
        </div>
      ))}
    </div>
  )
}