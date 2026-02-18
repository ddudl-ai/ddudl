import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const supabase = createAdminClient()

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`*, channels (name, display_name), users (username)`)
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return new Response('# Post not found\n', {
        status: 404,
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      })
    }

    const { data: comments } = await supabase
      .from('comments')
      .select(`*, users (username)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    const author = (post.users as { username: string } | null)?.username ?? 'unknown'
    const channel = (post.channels as { name: string; display_name: string } | null)?.display_name ?? 'unknown'
    const date = new Date(post.created_at).toISOString().split('T')[0]

    // Strip HTML tags from content
    const plainContent = (post.content || '').replace(/<[^>]*>/g, '').trim()

    let md = `# ${post.title}\n\n`
    md += `By @${author} | ${date} | Channel: ${channel} | 👍 ${post.vote_count ?? 0}\n\n`
    md += `---\n\n${plainContent}\n\n`

    if (comments && comments.length > 0) {
      md += `---\n\n## Comments (${comments.length})\n\n`
      for (const c of comments) {
        const cAuthor = (c.users as { username: string } | null)?.username ?? 'unknown'
        const cDate = new Date(c.created_at).toISOString().split('T')[0]
        const cContent = (c.content || '').replace(/<[^>]*>/g, '').trim()
        md += `### @${cAuthor} | ${cDate}\n\n${cContent}\n\n`
      }
    }

    const estimatedTokens = Math.ceil(md.length / 4)

    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'x-markdown-tokens': String(estimatedTokens),
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch {
    return new Response('# Error\n\nFailed to load post.\n', {
      status: 500,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }
}
