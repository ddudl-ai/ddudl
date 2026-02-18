interface UserProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params
  
  return (
    <div className=&quot;min-h-screen bg-gray-50&quot;>
      <div className=&quot;max-w-4xl mx-auto px-4 py-8&quot;>
        <h1 className=&quot;text-2xl font-bold&quot;>
          {decodeURIComponent(username)}님의 프로필
        </h1>
        <p className=&quot;text-gray-600 mt-2&quot;>
          User 프로필 페이지입니다.
        </p>
      </div>
    </div>
  )
}