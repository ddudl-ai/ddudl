'use client'

import { useState, useEffect } from 'react'
import { Globe, Play } from 'lucide-react'

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

    const lines = content.split('\n')
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
          
          const response = await fetch('/api/link-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    <div className="space-y-3 mt-4">
      {linkPreviews.map((preview, index) => (
        <div key={index} className="border rounded-lg overflow-hidden bg-gray-50 transition-colors">
          {preview.error ? (
            <div className="p-4 flex items-center space-x-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Unable to load link preview</p>
                <a 
                  href={preview.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  {preview.url}
                </a>
              </div>
            </div>
          ) : preview.isYoutube && preview.youtubeId ? (
            // YouTube 임베드 플레이어
            <div className="bg-white">
              {expandedVideos.has(preview.url) ? (
                // 확장된 상태: 실제 YouTube 플레이어
                <div className="space-y-2">
                  <div className="aspect-video w-full">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube-nocookie.com/embed/${preview.youtubeId}?autoplay=0&modestbranding=1&rel=0`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-t-lg"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                          {preview.title || 'No Title'}
                        </h4>
                        {preview.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                            {preview.description}
                          </p>
                        )}
                        <a 
                          href={preview.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                        >
                          Watch on YouTube
                        </a>
                      </div>
                      <button
                        onClick={() => toggleVideoExpanded(preview.url)}
                        className="ml-2 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border"
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
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex">
                    <div className="w-32 h-20 flex-shrink-0 relative">
                      {preview.image && (
                        <>
                          <img 
                            src={preview.image} 
                            alt="YouTube thumbnail" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                            <div className="bg-red-600 rounded-full p-2">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 text-gray-900">
                        {preview.title || 'No Title'}
                      </h4>
                      {preview.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {preview.description}
                        </p>
                      )}
                      <p className="text-xs text-red-600 mt-2">
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
              target="_blank" 
              rel="noopener noreferrer"
              className="block hover:bg-gray-100 transition-colors"
            >
              <div className="flex">
                {preview.image && (
                  <div className="w-24 h-16 flex-shrink-0">
                    <img 
                      src={preview.image} 
                      alt="preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 p-3 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1 text-gray-900">
                    {preview.title || 'No Title'}
                  </h4>
                  {preview.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {preview.description}
                    </p>
                  )}
                  <p className="text-xs text-blue-600 mt-2 truncate">
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