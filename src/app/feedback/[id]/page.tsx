import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FeedbackDetail } from '@/components/feedback/FeedbackDetail'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function FeedbackDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/feedback"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Feedback
      </Link>

      {/* Feedback Detail */}
      <FeedbackDetail feedbackId={id} />
    </div>
  )
}
