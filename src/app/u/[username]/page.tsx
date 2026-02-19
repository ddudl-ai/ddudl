import { Suspense } from 'react'
import { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import SidebarChannels from '@/components/channels/SidebarChannels'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import UserProfile from './UserProfile'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_CONFIG } from '@/lib/constants'
import StructuredData, { createPersonStructuredData } from '@/components/seo/StructuredData'

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
      .from('users')
      .select('username, display_name, bio')
      .eq('username', username)
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
    console.error('Error fetching user for structured data:', error)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {userStructuredData && (
        <StructuredData data={userStructuredData} />
      )}
      
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Suspense fallback={<LoadingSpinner text="Loading user profile..." />}>
              <UserProfile username={username} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
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
      .from('users')
      .select('username, display_name, bio, created_at, posts(count), total_tokens')
      .eq('username', username)
      .single()

    if (!user) {
      return {
        title: `${username} - ddudl`,
        description: `User profile for ${username} on ddudl`,
      }
    }

    const displayName = user.display_name || user.username
    const bio = user.bio || `${displayName} is a member of the ddudl community`
    const description = bio.length > 160 ? bio.substring(0, 160) + '...' : bio
    const title = `${displayName} (@${user.username}) - ddudl`
    const url = `https://ddudl.com/u/${username}`

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
    console.error('Error generating user metadata:', error)
    return {
      title: `${username} - ddudl`,
      description: `User profile for ${username} on ddudl`,
    }
  }
}