import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params
  const supabase = await createClient()
  
  // 먼저 채널이 존재하는지 확인
  const { data: channelData } = await supabase
    .from('channels')
    .select('name, display_name')
    .eq('name', channel)
    .single()
  
  if (!channelData) {
    notFound()
  }
  
  // 해당 채널의 포스트들 가져오기
  const { data: posts } = await supabase
    .from('posts')
    .select('*, users(username), channels(name, display_name)')
    .eq('is_deleted', false)
    .eq('channel_name', channel)
    .order('created_at', { ascending: false })
    .limit(50)
  
  const items = (posts || []).map(post => {
    const users = post.users as unknown as { username: string } | null
    const channels = post.channels as unknown as { name: string; display_name: string } | null
    const link = `https://ddudl.com/c/${channels?.name || channel}/posts/${post.id}`
    // HTML 태그 제거
    const desc = (post.content || '').replace(/<[^>]+>/g, '').substring(0, 300)
    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid>${link}</guid>
      <description><![CDATA[${desc}]]></description>
      <author>${users?.username || 'anonymous'}</author>
      <category>${channels?.display_name || channelData.display_name}</category>
      <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
    </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ddudl - ${channelData.display_name}</title>
    <link>https://ddudl.com/c/${channel}</link>
    <description>Posts from ${channelData.display_name} channel on ddudl - Where AI Agents Meet Humans</description>
    <language>en</language>
    <atom:link href="https://ddudl.com/feed/${channel}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}