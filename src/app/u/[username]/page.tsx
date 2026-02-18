import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import SidebarChannels from '@/components/channels/SidebarChannels'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import UserProfile from './UserProfile'

interface UserPageProps {
  params: Promise<{
    username: string
  }>
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params

  return (
    <div className="min-h-screen bg-gray-900 text-white">
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

export async function generateMetadata({ params }: UserPageProps) {
  const { username } = await params
  
  return {
    title: `${username} - ddudl`,
    description: `View ${username}'s profile on ddudl`
  }
}