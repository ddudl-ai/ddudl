import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { createAdminClient } from '@/lib/supabase/admin'

interface LinkPreview {
  title?: string
  description?: string
  image?: string
  url: string
}

export async function POST(request: NextRequest) {
  let requestUrl: string = ''

  try {
    const { url } = await request.json()
    requestUrl = url // URL을 미리 저장

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // URL 유효성 검사
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 캐시에서 기존 링크 프리뷰 조회 (24시간 이내)
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { data: cachedPreview } = await supabase
      .from('link_previews')
      .select('*')
      .eq('url', url)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cachedPreview && !cachedPreview.error_message) {
      // 캐시된 프리뷰 반환
      return NextResponse.json({
        title: cachedPreview.title,
        description: cachedPreview.description,
        image: cachedPreview.image_url,
        url: cachedPreview.url
      })
    }

    // YouTube 특별 처리
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    const youtubeMatch = url.match(youtubeRegex)

    if (youtubeMatch) {
      const videoId = youtubeMatch[1]
      const preview = {
        title: 'YouTube 동영상',
        description: 'YouTube에서 재생되는 동영상입니다.',
        image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        url: url
      }

      // YouTube 프리뷰 캐시에 저장
      await supabase
        .from('link_previews')
        .insert({
          url: url,
          title: preview.title,
          description: preview.description,
          image_url: preview.image,
          site_name: 'YouTube',
          content_type: 'video'
        })

      return NextResponse.json(preview)
    }

    // 일반 웹페이지 메타데이터 추출
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow'
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) {
        // HTML이 아닌 파일의 경우 기본 정보만 반환
        const urlParsed = new URL(url)
        return NextResponse.json({
          url,
          title: urlParsed.hostname,
          description: `${contentType} 파일`,
          image: null
        })
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // 메타데이터 추출
      const preview: LinkPreview = { url }

      // 제목 추출 (우선순위: og:title > twitter:title > title)
      preview.title = 
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        '제목 없음'

      // 설명 추출 (우선순위: og:description > twitter:description > meta description)
      preview.description = 
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        ''

      // 이미지 추출 (우선순위: og:image > twitter:image)
      let imageUrl = 
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content')

      // 상대 URL을 절대 URL로 변환
      if (imageUrl && !imageUrl.startsWith('http')) {
        const baseUrl = new URL(url)
        imageUrl = new URL(imageUrl, baseUrl.origin).href
      }

      preview.image = imageUrl

      // 제목과 설명 정리
      preview.title = preview.title.trim().substring(0, 200)
      preview.description = preview.description.trim().substring(0, 300)

      // 프리뷰 결과를 캐시에 저장
      try {
        await supabase
          .from('link_previews')
          .insert({
            url: preview.url,
            title: preview.title,
            description: preview.description,
            image_url: preview.image,
            site_name: new URL(url).hostname,
            content_type: 'website'
          })
      } catch (cacheError) {
        console.error('Failed to cache link preview:', cacheError)
        // 캐시 저장 failed는 응답에 영향주지 않음
      }

      return NextResponse.json(preview)

    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Fetch error:', fetchError)
      throw fetchError
    }

  } catch (error) {
    console.error('Link preview error:', error)

    // error도 캐시에 저장하여 같은 URL에 대한 반복 요청 방지
    if (requestUrl) {
      try {
        const supabase = createAdminClient()
        await supabase
          .from('link_previews')
          .insert({
            url: requestUrl,
            title: null,
            description: null,
            image_url: null,
            site_name: null,
            content_type: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
      } catch (cacheError) {
        console.error('Failed to cache error:', cacheError)
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to generate preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}