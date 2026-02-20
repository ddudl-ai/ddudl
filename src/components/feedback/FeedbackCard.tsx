"use client"

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

interface FeedbackCardProps {
  feedback: {
    id: string
    title: string
    description: string
    category: string
    status: string
    author_name: string
    upvote_count: number
    comment_count: number
    created_at: string
  }
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  planned: { label: 'Planned', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  'in-progress': { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  done: { label: 'Done', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
}

const categoryConfig = {
  feature: { label: 'Feature', emoji: '✨' },
  bug: { label: 'Bug', emoji: '🐛' },
  enhancement: { label: 'Enhancement', emoji: '🚀' }
}

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const status = statusConfig[feedback.status as keyof typeof statusConfig] || statusConfig.open
  const category = categoryConfig[feedback.category as keyof typeof categoryConfig] || categoryConfig.feature

  const truncatedDescription = feedback.description.length > 150 
    ? feedback.description.substring(0, 150) + '...' 
    : feedback.description

  return (
    <Link 
      href={`/feedback/${feedback.id}`}
      className="block p-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {/* Vote Count (Left) */}
        <div className="flex flex-col items-center gap-1 text-gray-600 dark:text-gray-400">
          <div className="text-xl font-bold">{feedback.upvote_count}</div>
          <div className="text-xs">votes</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + Status */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {category.emoji} {feedback.title}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${status.color}`}>
              {status.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {truncatedDescription}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {feedback.comment_count} comments
            </span>
            <span>by {feedback.author_name}</span>
            <span>
              {new Date(feedback.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
