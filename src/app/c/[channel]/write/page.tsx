import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import WritePostForm from './WritePostForm'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface WritePageProps {
  params: Promise<{
    channel: string
  }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function WritePage({ params, searchParams }: WritePageProps) {
  const { channel } = await params
  const search = await searchParams
  const isEditMode = !!search.edit

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4">
          <a href={`/c/${channel}`} className="text-slate-400 hover:text-slate-200 hover:underline">
            ← Back to {channel}
          </a>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h1 className="text-2xl font-bold mb-6 text-slate-100">
            {isEditMode ? `Edit Post in ${channel}` : `Write Post in ${channel}`}
          </h1>

          <Suspense fallback={<LoadingSpinner text="Loading..." />}>
            <WritePostForm channelName={channel} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}