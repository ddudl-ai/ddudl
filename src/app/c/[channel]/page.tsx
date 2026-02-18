import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import ChannelContent from './ChannelContent'
import SidebarChannels from '@/components/channels/SidebarChannels'
import PopularTags from '@/components/tags/PopularTags'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface ChannelPageProps {
  params: Promise<{
    channel: string
  }>
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { channel } = await params

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Suspense fallback={<LoadingSpinner text="Loading channel..." />}>
              <ChannelContent channelName={channel} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Sidebar>
              <Suspense fallback={<LoadingSpinner />}>
                <SidebarChannels />
              </Suspense>
            </Sidebar>

            <Suspense fallback={<LoadingSpinner />}>
              <PopularTags
                channel={channel}
                limit={8}
                days={30}
                showControls={true}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}