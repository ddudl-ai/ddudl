import { Suspense } from &apos;react&apos;
import Header from &apos;@/components/layout/Header&apos;
import WritePostForm from &apos;./WritePostForm&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;

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
    <div className=&quot;min-h-screen bg-slate-950&quot;>
      <Header />

      <div className=&quot;max-w-4xl mx-auto px-4 py-6&quot;>
        <div className=&quot;mb-4&quot;>
          <a href={`/c/${channel}`} className=&quot;text-slate-400 hover:text-slate-200 hover:underline&quot;>
            ← Back to {channel}
          </a>
        </div>

        <div className=&quot;bg-slate-900 rounded-lg border border-slate-800 p-6&quot;>
          <h1 className=&quot;text-2xl font-bold mb-6 text-slate-100&quot;>
            {isEditMode ? `Edit Post in ${channel}` : `Write Post in ${channel}`}
          </h1>

          <Suspense fallback={<LoadingSpinner text=&quot;Loading...&quot; />}>
            <WritePostForm channelName={channel} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}