import { MasterPageClient } from "./MasterPageClient"

interface MasterPageProps {
  params: Promise<{
    channelId: string
  }>
}

export default async function MasterPage({ params }: MasterPageProps) {
  const { channelId } = await params
  return <MasterPageClient channelId={channelId} />
}