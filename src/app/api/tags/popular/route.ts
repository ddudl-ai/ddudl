import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface PopularTag {
  flair: string
  count: number
  percentage: number
  recent_posts: number // 최근 7일간 post 수
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel')
    const limit = parseInt(searchParams.get('limit') || '10')
    const days = parseInt(searchParams.get('days') || '30') // 기본 30일간 데이터

    const adminSupabase = createAdminClient()

    // 서브레딧 ID 찾기 (필터링이 있는 경우)
    let channelId = null
    if (channel) {
      const { data: channelData, error: channelError } = await adminSupabase
        .from('channels')
        .select('id')
        .eq('name', channel)
        .single()
      
      if (channelError || !channelData) {
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
      }
      channelId = channelData.id
    }

    // 기본 쿼리 구성
    let query = adminSupabase
      .from('posts')
      .select('flair, created_at, channel_id')
      .not('flair', 'is', null)

    // 서브레딧 필터링
    if (channelId) {
      query = query.eq('channel_id', channelId)
    }

    // 날짜 범위 필터링
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    query = query.gte('created_at', cutoffDate.toISOString())

    const { data: posts, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        tags: [],
        total_posts: 0,
        period_days: days,
        channel: channel || 'all'
      })
    }

    // 최근 7일간 post 필터링
    const recentCutoff = new Date()
    recentCutoff.setDate(recentCutoff.getDate() - 7)

    // 태그별 집계
    const tagCounts = new Map<string, { total: number; recent: number }>()
    
    posts.forEach(post => {
      const flair = post.flair!
      const postDate = new Date(post.created_at)
      
      if (!tagCounts.has(flair)) {
        tagCounts.set(flair, { total: 0, recent: 0 })
      }
      
      const counts = tagCounts.get(flair)!
      counts.total += 1
      
      if (postDate >= recentCutoff) {
        counts.recent += 1
      }
    })

    // 인기 태그 계산
    const totalPosts = posts.length
    const popularTags: PopularTag[] = Array.from(tagCounts.entries())
      .map(([flair, counts]) => ({
        flair,
        count: counts.total,
        percentage: Math.round((counts.total / totalPosts) * 100 * 10) / 10,
        recent_posts: counts.recent
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return NextResponse.json({
      tags: popularTags,
      total_posts: totalPosts,
      period_days: days,
      channel: channel || 'all',
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Popular tags API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}