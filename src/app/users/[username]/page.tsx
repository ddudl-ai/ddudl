interface UserProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">
          {decodeURIComponent(username)}님의 프로필
        </h1>
        <p className="text-gray-600 mt-2">
          User 프로필 페이지입니다.
        </p>
      </div>
    </div>
  )
}