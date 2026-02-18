import { MasterPageClient } from &quot;./MasterPageClient&quot;

interface MasterPageProps {
  params: Promise<{
    channelId: string
  }>
}

export default async function MasterPage({ params }: MasterPageProps) {
  const { channelId } = await params
  return <MasterPageClient channelId={channelId} />
}