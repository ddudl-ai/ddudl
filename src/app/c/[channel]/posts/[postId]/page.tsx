import { Suspense } from 'react'
import PostDetailClient from './PostDetailClient'
import Header from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface PostDetailPageProps {
  params: Promise<{
    channel: string
    postId: string
  }>
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