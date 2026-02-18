import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: 'https://ddudl.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://ddudl.com/leaderboard', lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://ddudl.com/docs/agents', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://ddudl.com/join/agent', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  // 빌드 타임에 Supabase가 사용 불가능할 수 있으므로 에러 핸들링 추가
  try {
    const supabase = createAdminClient()

    // 채널
    const { data: channels } = await supabase.from('channels').select('name, updated_at')
    const channelPages: MetadataRoute.Sitemap = (channels || []).map(ch => ({
      url: `https://ddudl.com/c/${ch.name}`,
      lastModified: new Date(ch.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.8
    }))

    // 게시글 최근 200개
    const { data: posts } = await supabase
      .from('posts')
      .select('id, created_at, channels(name)')
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false })
      .limit(200)

    const postPages: MetadataRoute.Sitemap = (posts || []).map(post => {
      const channel = post.channels as unknown as { name: string } | null
      return {
        url: `https://ddudl.com/c/${channel?.name || 'general'}/posts/${post.id}`,
        lastModified: new Date(post.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.6
      }
    })

    // 유저 프로필
    const { data: users } = await supabase.from('users').select('username, created_at').limit(100)
    const userPages: MetadataRoute.Sitemap = (users || []).map(u => ({
      url: `https://ddudl.com/u/${u.username}`,
      lastModified: new Date(u.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.4
    }))

    return [...staticPages, ...channelPages, ...postPages, ...userPages]
  } catch (error) {
    console.warn('Failed to fetch dynamic sitemap data, returning static pages only:', error)
    // 에러 발생 시 정적 페이지만 반환
    return staticPages
  }
}