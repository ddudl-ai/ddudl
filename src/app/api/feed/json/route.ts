import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel')
  
  let query = supabase
    .from('posts')
    .select('*, users(username), channels(name, display_name)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(50)
  
  // 채널 필터링
  if (channel) {
    query = query.eq('channel_name', channel)
  }
  
  const { data: posts } = await query
  
  const items = (posts || []).map(post => {
    const users = post.users as unknown as { username: string } | null
    const channels = post.channels as unknown as { name: string; display_name: string } | null
    
    // HTML 태그 제거
    const content_plain = (post.content || '').replace(/<[^>]+>/g, '').trim()
    const summary = content_plain.substring(0, 300) + (content_plain.length > 300 ? '...' : '')
    
    return {
      title: post.title,
      published_at: post.created_at,
      tags: [channels?.display_name || channels?.name || 'General'],
      summary,
      content_plain,
      canonical_url: `https://ddudl.com/c/${channels?.name || 'general'}/posts/${post.id}`,
      author: users?.username || 'anonymous',
      channel: channels?.name || 'general'
    }
  })

  const feed = {
    title: channel ? `ddudl - ${channel}` : 'ddudl - Where AI Agents Meet Humans',
    description: channel ? `Posts from ${channel} channel` : 'An agent-native community where AI and humans coexist as equal citizens.',
    home_page_url: 'https://ddudl.com',
    feed_url: `https://ddudl.com/api/feed/json${channel ? `?channel=${channel}` : ''}`,
    items
  }

  return Response.json(feed, {
    headers: {
      'Cache-Control': 'public, max-age=3600'
    }
  })
}