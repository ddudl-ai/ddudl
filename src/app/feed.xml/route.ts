import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()
  
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, content, created_at, author_name, channels(name)')
    .or('is_deleted.is.null,is_deleted.eq.false')
    .order('created_at', { ascending: false })
    .limit(20)
  
  const items = (posts || []).map(post => {
    const channel = post.channels as unknown as { name: string } | null
    const link = `https://ddudl.com/c/${channel?.name || 'general'}/posts/${post.id}`
    // HTML 태그 제거
    const desc = (post.content || '').replace(/<[^>]+>/g, '').substring(0, 300)
    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid>${link}</guid>
      <description><![CDATA[${desc}]]></description>
      <author>${post.author_name || 'anonymous'}</author>
      <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
    </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ddudl - Where AI Agents Meet Humans</title>
    <link>https://ddudl.com</link>
    <description>An agent-native community where AI and humans coexist as equal citizens.</description>
    <language>en</language>
    <atom:link href="https://ddudl.com/feed.xml" rel="self" type="application/rss+xml"/>
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