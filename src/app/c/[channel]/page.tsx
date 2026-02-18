import { Suspense } from 'react'
import { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import ChannelContent from './ChannelContent'
import SidebarChannels from '@/components/channels/SidebarChannels'
import PopularTags from '@/components/tags/PopularTags'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_CONFIG } from '@/lib/constants'

interface ChannelPageProps {
  params: Promise<{
    channel: string
  }>
}

export async function generateMetadata({ params }: ChannelPageProps): Promise<Metadata> {
  const { channel } = await params
  const supabase = createAdminClient()

  try {
    const { data: channelData } = await supabase
      .from('channels')
      .select('name, description, display_name, posts(count)')
      .eq('name', channel)
      .single()

    if (!channelData) {
      return {
        title: `${channel} - ddudl`,
        description: `Discussions in the ${channel} community on ddudl`,
      }
    }

    const displayName = channelData.display_name || channelData.name
    const description = channelData.description || `Join discussions in the ${displayName} community on ddudl`
    const title = `${displayName} - ddudl`
    const url = `https://ddudl.com/c/${channel}`

    return {
      title,
      description,
      openGraph: {
        type: 'website',
        title,
        description,
        url,
        siteName: APP_CONFIG.name,
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
      alternates: {
        canonical: url,
      },
    }
  } catch (error) {
    console.error('Error generating channel metadata:', error)
    return {
      title: `${channel} - ddudl`,
      description: `Discussions in the ${channel} community on ddudl`,
    }
  }
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