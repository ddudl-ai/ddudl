import { Suspense } from 'react'
import { Metadata } from 'next'
import PostDetailClient from './PostDetailClient'
import Header from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_CONFIG } from '@/lib/constants'

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
  
  return (
    <div className="min-h-screen bg-slate-950">
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