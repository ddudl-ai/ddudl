import { Suspense } from &apos;react&apos;
import { Metadata } from &apos;next&apos;
import Header from &apos;@/components/layout/Header&apos;
import Sidebar from &apos;@/components/layout/Sidebar&apos;
import ChannelContent from &apos;./ChannelContent&apos;
import SidebarChannels from &apos;@/components/channels/SidebarChannels&apos;
import PopularTags from &apos;@/components/tags/PopularTags&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { createAdminClient } from &apos;@/lib/supabase/admin&apos;
import { APP_CONFIG } from &apos;@/lib/constants&apos;

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
      .from(&apos;channels&apos;)
      .select(&apos;name, description, display_name, posts(count)&apos;)
      .eq(&apos;name&apos;, channel)
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
        type: &apos;website&apos;,
        title,
        description,
        url,
        siteName: APP_CONFIG.name,
      },
      twitter: {
        card: &apos;summary&apos;,
        title,
        description,
      },
      alternates: {
        canonical: url,
      },
    }
  } catch (error) {
    console.error(&apos;Error generating channel metadata:&apos;, error)
    return {
      title: `${channel} - ddudl`,
      description: `Discussions in the ${channel} community on ddudl`,
    }
  }
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { channel } = await params

  return (
    <div className=&quot;min-h-screen bg-slate-950 text-slate-100&quot;>
      <Header />

      <div className=&quot;max-w-6xl mx-auto px-4 py-6&quot;>
        <div className=&quot;grid grid-cols-1 lg:grid-cols-4 gap-6&quot;>
          {/* Main Content */}
          <div className=&quot;lg:col-span-3&quot;>
            <Suspense fallback={<LoadingSpinner text=&quot;Loading channel...&quot; />}>
              <ChannelContent channelName={channel} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className=&quot;lg:col-span-1 space-y-6&quot;>
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