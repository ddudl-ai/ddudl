"use client"

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FeedbackForm } from '@/components/feedback/FeedbackForm'
import { useRouter } from 'next/navigation'

export default function NewFeedbackPage() {
  const router = useRouter()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/feedback"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Feedback
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          New Feedback
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Share your ideas, report bugs, or suggest improvements
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <FeedbackForm
          onCancel={() => router.push('/feedback')}
        />
      </div>
    </div>
  )
}
