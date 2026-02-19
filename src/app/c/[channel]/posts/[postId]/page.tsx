import { Suspense } from 'react'
import { Metadata } from 'next'
import PostDetailClient from './PostDetailClient'
import Header from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_CONFIG } from '@/lib/constants'
import StructuredData, { createArticleStructuredData } from '@/components/seo/StructuredData'

interface PostDetailPageProps {
  params: Promise<{
    channel: string
    postId: string
  }>
}

export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
  const { channel, postId } = await params
  const supabase = createAdminClient()

  try {
    const { data: post } = await supabase
      .from('posts')
      .select('title, content, created_at, channels(name)')
      .eq('id', postId)
      .single()

    if (!post) {
      return {
        title: 'Post Not Found',
        description: 'The requested post could not be found.',
      }
    }

    const postTitle = post.title || 'Untitled Post'
    const description = post.content 
      ? post.content.substring(0, 160).replace(/\n/g, ' ') + (post.content.length > 160 ? '...' : '')
      : 'Discussion post on ddudl.com'
    
    const channelName = (post.channels as unknown as { name: string } | null)?.name || channel
    const fullTitle = `${postTitle} - ${channelName}`
    const url = `https://ddudl.com/c/${channelName}/posts/${postId}`

    return {
      title: fullTitle,
      description,
      openGraph: {
        type: 'article',
        title: postTitle,
        description,
        url,
        siteName: APP_CONFIG.name,
        publishedTime: post.created_at,
      },
      twitter: {
        card: 'summary_large_image',
        title: postTitle,
        description,
      },
      alternates: {
        canonical: url,
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: `Post in ${channel}`,
      description: 'Discussion post on ddudl.com',
    }
  }
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { channel, postId } = await params
  const supabase = createAdminClient()
  
  // Get post data for structured data
  let postStructuredData = null
  try {
    const { data: post } = await supabase
      .from('posts')
      .select('title, content, created_at, updated_at, users(username, display_name), channels(name)')
      .eq('id', postId)
      .single()

    if (post) {
      const author = (post.users as unknown as { username: string, display_name?: string } | null)
      const channelName = (post.channels as unknown as { name: string } | null)?.name || channel
      const authorName = author?.display_name || author?.username || 'Anonymous'
      const postTitle = post.title || 'Untitled Post'
      const url = `https://ddudl.com/c/${channelName}/posts/${postId}`
      
      postStructuredData = createArticleStructuredData(
        postTitle,
        post.content ? post.content.substring(0, 160) : 'Discussion post on ddudl.com',
        authorName,
        post.created_at,
        url,
        APP_CONFIG.name,
        'https://ddudl.com',
        post.updated_at
      )
    }
  } catch (error) {
    console.error('Error fetching post for structured data:', error)
  }
  
  return (
    <div className="min-h-screen bg-slate-950">
      {postStructuredData && (
        <StructuredData data={postStructuredData} />
      )}
      
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4">
          <a href={`/c/${channel}`} className="text-slate-400 hover:text-slate-200 hover:underline">
            ← Back to {channel}
          </a>
        </div>
        
        <Suspense fallback={<LoadingSpinner text="Loading post..." />}>
          <PostDetailClient postId={postId} channel={channel} />
        </Suspense>
      </div>
    </div>
  )
}