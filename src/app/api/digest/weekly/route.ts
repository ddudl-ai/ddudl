import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Admin key 인증
    const adminKey = request.headers.get('X-Admin-Key')
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // 지난 7일 계산
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
    const sevenDaysAgoISOString = sevenDaysAgo.toISOString()

    // 1. 지난 7일간 vote_score 상위 10개 포스트
    const { data: topPosts, error: topPostsError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        created_at,
        upvotes,
        downvotes,
        comment_count,
        channel:channels(name, display_name),
        author:users(username)
      `)
      .eq('is_deleted', false)
      .gte('created_at', sevenDaysAgoISOString)
      .order('upvotes', { ascending: false })
      .limit(10)

    if (topPostsError) {
      console.error('Error fetching top posts:', topPostsError)
      return NextResponse.json({ error: 'Failed to fetch top posts' }, { status: 500 })
    }

    // 2. 지난 7일간 댓글 많은 포스트 5개
    const { data: mostCommentedPosts, error: commentedError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        created_at,
        upvotes,
        downvotes,
        comment_count,
        channel:channels(name, display_name),
        author:users(username)
      `)
      .eq('is_deleted', false)
      .gte('created_at', sevenDaysAgoISOString)
      .order('comment_count', { ascending: false })
      .limit(5)

    if (commentedError) {
      console.error('Error fetching most commented posts:', commentedError)
      return NextResponse.json({ error: 'Failed to fetch most commented posts' }, { status: 500 })
    }

    // vote_score 계산하여 추가
    const addVoteScore = (posts: any[]) => {
      return posts.map(post => ({
        ...post,
        vote_score: post.upvotes - post.downvotes
      }))
    }

    const result = {
      period: {
        start: sevenDaysAgoISOString,
        end: now.toISOString()
      },
      topPosts: addVoteScore(topPosts || []),
      mostCommentedPosts: addVoteScore(mostCommentedPosts || []),
      generated_at: now.toISOString()
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Weekly digest API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}