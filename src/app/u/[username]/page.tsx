import { Suspense } from &apos;react&apos;
import { Metadata } from &apos;next&apos;
import Header from &apos;@/components/layout/Header&apos;
import Sidebar from &apos;@/components/layout/Sidebar&apos;
import SidebarChannels from &apos;@/components/channels/SidebarChannels&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import UserProfile from &apos;./UserProfile&apos;
import { createAdminClient } from &apos;@/lib/supabase/admin&apos;
import { APP_CONFIG } from &apos;@/lib/constants&apos;
import StructuredData, { createPersonStructuredData } from &apos;@/components/seo/StructuredData&apos;

interface UserPageProps {
  params: Promise<{
    username: string
  }>
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params
  const supabase = createAdminClient()
  
  // Get user data for structured data
  let userStructuredData = null
  try {
    const { data: user } = await supabase
      .from(&apos;users&apos;)
      .select(&apos;username, display_name, bio&apos;)
      .eq(&apos;username&apos;, username)
      .single()

    if (user) {
      const displayName = user.display_name || user.username
      const url = `https://ddudl.com/u/${username}`
      
      userStructuredData = createPersonStructuredData(
        displayName,
        url,
        user.bio || undefined
      )
    }
  } catch (error) {
    console.error(&apos;Error fetching user for structured data:&apos;, error)
  }

  return (
    <div className=&quot;min-h-screen bg-gray-900 text-white&quot;>
      {userStructuredData && (
        <StructuredData data={userStructuredData} />
      )}
      
      <Header />

      <div className=&quot;max-w-6xl mx-auto px-4 py-6&quot;>
        <div className=&quot;grid grid-cols-1 lg:grid-cols-4 gap-6&quot;>
          {/* Main Content */}
          <div className=&quot;lg:col-span-3&quot;>
            <Suspense fallback={<LoadingSpinner text=&quot;Loading user profile...&quot; />}>
              <UserProfile username={username} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className=&quot;lg:col-span-1 space-y-6&quot;>
            <Sidebar>
              <Suspense fallback={<LoadingSpinner />}>
                <SidebarChannels />
              </Suspense>
            </Sidebar>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params
  const supabase = createAdminClient()

  try {
    const { data: user } = await supabase
      .from(&apos;users&apos;)
      .select(&apos;username, display_name, bio, created_at, posts(count), total_tokens&apos;)
      .eq(&apos;username&apos;, username)
      .single()

    if (!user) {
      return {
        title: `${username} - ddudl`,
        description: `User profile for ${username} on ddudl`,
      }
    }

    const displayName = user.display_name || user.username
    const bio = user.bio || `${displayName} is a member of the ddudl community`
    const description = bio.length > 160 ? bio.substring(0, 160) + &apos;...&apos; : bio
    const title = `${displayName} (@${user.username}) - ddudl`
    const url = `https://ddudl.com/u/${username}`

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
    console.error(&apos;Error generating user metadata:&apos;, error)
    return {
      title: `${username} - ddudl`,
      description: `User profile for ${username} on ddudl`,
    }
  }
}