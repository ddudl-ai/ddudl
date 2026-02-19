// Link Preview Generation Utilities
import * as cheerio from 'cheerio'
import { LinkPreview } from '@/types/post'

export interface UrlValidationResult {
  valid: boolean
  error?: string
}

export interface LinkPreviewMetadata {
  title?: string
  description?: string
  image?: string | null
  url: string
  siteName?: string
  type?: 'website' | 'video' | 'article' | 'tweet'
  author?: string
  publishedTime?: string
  duration?: number
}

// Blocked domains for security
const BLOCKED_DOMAINS = [
  'malicious-site.com',
  'spam-domain.net',
  'phishing-site.org'
]

// Private IP ranges
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^localhost$/i,
  /^::1$/,
  /^fe80:/i
]

/**
 * URL 유효성 검증
 */
export function validateUrl(url: string): UrlValidationResult {
  try {
    const urlObj = new URL(url)

    // HTTP/HTTPS 프로토콜만 허용
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        error: 'HTTP 또는 HTTPS 프로토콜만 지원됩니다'
      }
    }

    // 차단된 도메인 확인
    if (BLOCKED_DOMAINS.includes(urlObj.hostname.toLowerCase())) {
      return {
        valid: false,
        error: '차단된 도메인입니다'
      }
    }

    // 내부 네트워크 주소 확인
    const hostname = urlObj.hostname.toLowerCase()
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          valid: false,
          error: '내부 네트워크 주소는 허용되지 않습니다'
        }
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: '올바르지 않은 URL 형식입니다'
    }
  }
}

/**
 * 링크 프리뷰 데이터 가져오기
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreviewMetadata> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0; +https://ddudl.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // 기본 메타데이터 추출
    const metadata: LinkPreviewMetadata = {
      url,
      title: extractTitle($),
      description: extractDescription($),
      image: extractImage($),
      siteName: extractSiteName($),
      type: extractType($, url),
      author: extractAuthor($),
      publishedTime: extractPublishedTime($),
      duration: extractDuration($)
    }

    // 플랫폼별 특화 처리
    let result = metadata

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      result = processYouTubeMetadata(metadata, $)
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      result = processTwitterMetadata(metadata, $)
    } else if (url.includes('vimeo.com')) {
      result = processVimeoMetadata(metadata, $)
    }

    return sanitizePreview(result)
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * 제목 추출
 */
function extractTitle($: any): string | undefined {
  // Open Graph title 우선
  let title = $('meta[property="og:title"]').attr('content')

  // Twitter Card title
  if (!title) {
    title = $('meta[name="twitter:title"]').attr('content')
  }

  // HTML title tag
  if (!title) {
    title = $('title').text().trim() || undefined
  }

  if (!title) {
    return undefined
  }

  return title.substring(0, 200) // 최대 200자
}

/**
 * 설명 추출
 */
function extractDescription($: any): string | undefined {
  // Open Graph description 우선
  let description = $('meta[property="og:description"]').attr('content')

  // Twitter Card description
  if (!description) {
    description = $('meta[name="twitter:description"]').attr('content')
  }

  // Standard meta description
  if (!description) {
    description = $('meta[name="description"]').attr('content')
  }

  if (description) {
    return description.substring(0, 300) // 최대 300자
  }

  return undefined
}

/**
 * 이미지 추출
 */
function extractImage($: any): string | undefined {
  // Open Graph image 우선
  let image = $('meta[property="og:image"]').attr('content')

  // Twitter Card image
  if (!image) {
    image = $('meta[name="twitter:image"]').attr('content')
  }

  // Schema.org image
  if (!image) {
    image = $('meta[itemprop="image"]').attr('content')
  }

  // 첫 번째 img 태그
  if (!image) {
    const firstImg = $('img').first().attr('src')
    if (firstImg && !firstImg.startsWith('data:')) {
      image = firstImg
    }
  }

  // 상대 URL을 절대 URL로 변환
  if (image && !image.startsWith('http')) {
    // 이 부분은 실제 구현에서 base URL과 결합해야 함
    return image.startsWith('//') ? `https:${image}` : image
  }

  return image
}

/**
 * 사이트 이름 추출
 */
function extractSiteName($: any): string | undefined {
  return $('meta[property="og:site_name"]').attr('content') ||
         $('meta[name="application-name"]').attr('content')
}

/**
 * 컨텐츠 타입 추출
 */
function extractType($: any, url: string): 'website' | 'video' | 'article' | 'tweet' {
  const ogType = $('meta[property="og:type"]').attr('content')

  if (ogType === 'video' || url.includes('youtube.com') || url.includes('vimeo.com')) {
    return 'video'
  }

  if (ogType === 'article' || $('article').length > 0) {
    return 'article'
  }

  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'tweet'
  }

  return 'website'
}

/**
 * 작성자 추출
 */
function extractAuthor($: any): string | undefined {
  return $('meta[name="author"]').attr('content') ||
         $('meta[property="article:author"]').attr('content') ||
         $('meta[name="twitter:creator"]').attr('content')
}

/**
 * 발행 시간 추출
 */
function extractPublishedTime($: any): string | undefined {
  const publishTime = $('meta[property="article:published_time"]').attr('content') ||
                     $('meta[property="og:updated_time"]').attr('content') ||
                     $('time[datetime]').attr('datetime')

  return publishTime
}

/**
 * 비디오 길이 추출
 */
function extractDuration($: any): number | undefined {
  const durationStr = $('meta[property="og:video:duration"]').attr('content') ||
                      $('meta[property="video:duration"]').attr('content')

  if (durationStr) {
    const duration = parseInt(durationStr)
    return isNaN(duration) ? undefined : duration
  }

  return undefined
}

/**
 * YouTube 메타데이터 처리
 */
function processYouTubeMetadata(metadata: LinkPreviewMetadata, $: any): LinkPreviewMetadata {
  // YouTube 제목에서 " - YouTube" 제거
  if (metadata.title && metadata.title.endsWith(' - YouTube')) {
    metadata.title = metadata.title.slice(0, -' - YouTube'.length)
  }

  // YouTube 비디오 ID 추출
  const videoIdMatch = metadata.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (videoIdMatch) {
    const videoId = videoIdMatch[1]
    // 고품질 썸네일 사용
    if (!metadata.image) {
      metadata.image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }
  }

  metadata.type = 'video'
  metadata.siteName = 'YouTube'

  return metadata
}

/**
 * Twitter 메타데이터 처리
 */
function processTwitterMetadata(metadata: LinkPreviewMetadata, $: any): LinkPreviewMetadata {
  // 트위터 user명 추출
  const tweetMatch = metadata.url.match(/twitter\.com\/(\w+)\/status\//)
  if (tweetMatch) {
    metadata.author = `@${tweetMatch[1]}`
    metadata.title = `@${tweetMatch[1]} tweet`
  }

  metadata.type = 'tweet'
  metadata.siteName = 'Twitter'

  return metadata
}

/**
 * Vimeo 메타데이터 처리
 */
function processVimeoMetadata(metadata: LinkPreviewMetadata, $: any): LinkPreviewMetadata {
  metadata.type = 'video'
  metadata.siteName = 'Vimeo'

  // Vimeo 비디오 ID 추출
  const videoIdMatch = metadata.url.match(/vimeo\.com\/(\d+)/)
  if (videoIdMatch) {
    const videoId = videoIdMatch[1]
    // Vimeo API를 통해 썸네일을 가져올 수 있지만 여기서는 기본 로직 사용
  }

  return metadata
}

/**
 * 링크 프리뷰 데이터 정리
 */
export function sanitizePreview(preview: LinkPreviewMetadata): LinkPreviewMetadata {
  const sanitized = { ...preview }

  // HTML 태그 제거 (script 태그 내용 포함)
  if (sanitized.title) {
    sanitized.title = sanitized.title
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
    if (sanitized.title.length > 300) {
      sanitized.title = sanitized.title.substring(0, 297) + '...'
    }
  }

  if (sanitized.description) {
    sanitized.description = sanitized.description.replace(/<[^>]*>/g, '').trim()
    if (sanitized.description.length > 500) {
      sanitized.description = sanitized.description.substring(0, 497) + '...'
    }
  }

  // 이미지 URL 검증
  if (sanitized.image) {
    try {
      const imageUrl = new URL(sanitized.image)
      if (!['http:', 'https:'].includes(imageUrl.protocol)) {
        sanitized.image = null
      }
    } catch {
      sanitized.image = null
    }
  } else {
    sanitized.image = null
  }

  // 기본값 설정
  if (!sanitized.title) {
    const urlObj = new URL(sanitized.url)
    sanitized.title = urlObj.hostname
  }

  if (!sanitized.description) {
    sanitized.description = ''
  }

  if (!sanitized.siteName) {
    const urlObj = new URL(sanitized.url)
    sanitized.siteName = urlObj.hostname
  }

  return sanitized
}

/**
 * 비디오 메타데이터 추출
 */
export function extractVideoMetadata(url: string, metadata: Record<string, string>): {
  type: string
  duration?: number
  width?: number
  height?: number
  platform?: string
  videoId?: string
} {
  const result: any = { type: 'website' }

  // YouTube 감지
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    result.type = 'video'
    result.platform = 'youtube'

    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
    if (videoIdMatch) {
      result.videoId = videoIdMatch[1]
    }
  }

  // Vimeo 감지
  else if (url.includes('vimeo.com')) {
    result.type = 'video'
    result.platform = 'vimeo'

    const videoIdMatch = url.match(/vimeo\.com\/(\d+)/)
    if (videoIdMatch) {
      result.videoId = videoIdMatch[1]
    }
  }

  // 메타데이터에서 정보 추출
  if (metadata['og:video:duration']) {
    result.duration = parseInt(metadata['og:video:duration'])
  }

  if (metadata['og:video:width']) {
    result.width = parseInt(metadata['og:video:width'])
  }

  if (metadata['og:video:height']) {
    result.height = parseInt(metadata['og:video:height'])
  }

  return result
}

/**
 * 컨텐츠 타입 감지
 */
export function detectContentType(url: string, metadata: Record<string, string>): {
  type: string
  author?: string
  price?: { amount: number, currency: string }
} {
  const result: any = { type: 'website' }

  if (metadata['og:type'] === 'article') {
    result.type = 'article'
    if (metadata['article:author']) {
      result.author = metadata['article:author']
    }
  }

  if (metadata['og:type'] === 'product') {
    result.type = 'product'
    if (metadata['product:price:amount'] && metadata['product:price:currency']) {
      result.price = {
        amount: parseFloat(metadata['product:price:amount']),
        currency: metadata['product:price:currency']
      }
    }
  }

  return result
}

/**
 * 캐시 관련 함수들 (placeholder)
 */
export function cachePreview(preview: LinkPreviewMetadata): void {
  // 실제 구현에서는 데이터베이스나 Redis에 저장
}

export function getCachedPreview(url: string): LinkPreviewMetadata | null {
  // 실제 구현에서는 캐시에서 조회
  return null
}

/**
 * error 타입별 처리
 */
export function handleFetchError(error: Error): never {
  const message = error.message

  if (message.includes('404')) {
    throw new Error('페이지를 찾을 수 없습니다')
  }

  if (message.includes('403')) {
    throw new Error('Access denied')
  }

  if (message.includes('timeout') || message.includes('TIMEOUT')) {
    throw new Error('요청 시간이 초과되었습니다')
  }

  // 원본 error 다시 throw
  throw error
}