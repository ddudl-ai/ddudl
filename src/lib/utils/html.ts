/**
 * HTML 태그를 제거하고 순수 텍스트만 반환
 * @param html HTML 문자열
 * @returns 태그가 제거된 텍스트
 */
export function stripHtmlTags(html: string): string {
  if (!html) return ''
  
  // 기본적인 HTML 태그 제거
  let text = html.replace(/<[^>]*>/g, '')
  
  // HTML 엔티티 디코딩
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/'/g, "'")
  
  // 연속된 공백 정리
  text = text.replace(/\s+/g, ' ').trim()
  
  return text
}

/**
 * HTML 콘텐츠에서 첫 번째 이미지 URL 추출
 * @param html HTML 문자열
 * @returns 첫 번째 이미지 URL 또는 null
 */
export function extractFirstImageUrl(html: string): string | null {
  if (!html) return null
  
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return imgMatch ? imgMatch[1] : null
}

/**
 * 텍스트를 지정된 길이로 자르고 말줄임표 추가
 * @param text 텍스트
 * @param maxLength 최대 길이
 * @returns 잘린 텍스트
 */
export function truncateText(text: string, maxLength: number = 200): string {
  if (!text || text.length <= maxLength) return text
  
  // 단어 경계에서 자르기
  const truncated = text.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }
  
  return truncated + '...'
}

/**
 * HTML 콘텐츠에서 모든 이미지 URL 추출
 * @param html HTML 문자열
 * @returns 이미지 URL 배열
 */
export function extractImagesFromContent(html: string): string[] {
  if (!html) return []
  
  const imageUrls = new Set<string>()
  
  // img 태그에서 src 추출
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    imageUrls.add(match[1])
  }
  
  // a 태그 href에서 이미지 URL 추출 (Supabase storage URL 패턴)
  const linkRegex = /<a[^>]+href=["']([^"']*\.(?:jpg|jpeg|png|gif|webp)[^"']*?)["'][^>]*>([^<]*\.(?:jpg|jpeg|png|gif|webp)[^<]*?)<\/a>/gi
  while ((match = linkRegex.exec(html)) !== null) {
    // href와 링크 텍스트가 같고 이미지 URL 패턴인 경우
    if (match[1] === match[2] && match[1].includes('supabase.co/storage')) {
      imageUrls.add(match[1])
    }
  }
  
  // 플레인 텍스트로 된 이미지 URL도 찾기 (Supabase storage URL)
  const plainUrlRegex = /https:\/\/[^\s<>"']*supabase\.co\/storage\/[^\s<>"']*\.(?:jpg|jpeg|png|gif|webp)/gi
  while ((match = plainUrlRegex.exec(html)) !== null) {
    imageUrls.add(match[0])
  }
  
  return Array.from(imageUrls)
}

/**
 * HTML 콘텐츠에서 이미지를 제거한 텍스트 반환
 * @param html HTML 문자열
 * @returns 이미지가 제거된 HTML
 */
export function removeImagesFromContent(html: string): string {
  if (!html) return ''
  
  let result = html
  
  // img 태그 제거
  result = result.replace(/<img[^>]*>/gi, '')
  
  // 이미지 링크 제거 (Supabase storage URL)
  result = result.replace(/<a[^>]*href=["']([^"']*supabase\.co\/storage[^"']*\.(?:jpg|jpeg|png|gif|webp)[^"']*?)["'][^>]*>([^<]*)<\/a>/gi, '')
  
  // 플레인 이미지 URL 제거
  result = result.replace(/https:\/\/[^\s<>"']*supabase\.co\/storage\/[^\s<>"']*\.(?:jpg|jpeg|png|gif|webp)/gi, '')
  
  // 빈 p 태그 제거
  result = result.replace(/<p><\/p>/g, '').replace(/<p>\s*<\/p>/g, '')
  
  return result.trim()
}