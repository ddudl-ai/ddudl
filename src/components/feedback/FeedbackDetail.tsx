"use client"

import { useState, useEffect } from 'react'
import { VoteButton } from './VoteButton'
import { MessageSquare } from 'lucide-react'

interface FeedbackDetailProps {
  feedbackId: string
}

interface FeedbackData {
  id: string
  title: string
  description: string
  category: string
  status: string
  author_id: string
  author_name: string
  upvote_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

interface Comment {
  id: string
  content: string
  author_id: string
  author_name: string
  created_at: string
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

export function FeedbackDetail({ feedbackId }: FeedbackDetailProps) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchFeedback()
    fetchComments()
  }, [feedbackId])

  const fetchFeedback = async () => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`)
      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback)
        setHasVoted(data.hasVoted)
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newComment.trim() || isSubmittingComment) return

    setIsSubmittingComment(true)

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment.trim() })
      })

      if (response.ok) {
        setNewComment('')
        fetchComments()
        
        // Update comment count
        if (feedback) {
          setFeedback({
            ...feedback,
            comment_count: feedback.comment_count + 1
          })
        }
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Failed to post comment')
      }

    } catch (error) {
      console.error('Error posting comment:', error)
      alert('Failed to post comment. Please try again.')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!feedback) {
    return <div className="text-center py-12">Feedback not found</div>
  }

  const status = statusConfig[feedback.status as keyof typeof statusConfig] || statusConfig.open
  const category = categoryConfig[feedback.category as keyof typeof categoryConfig] || categoryConfig.feature

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-6">
          {/* Vote Button */}
          <VoteButton
            feedbackId={feedbackId}
            initialVoteCount={feedback.upvote_count}
            initialHasVoted={hasVoted}
            onVoteChange={(newCount) => setFeedback({ ...feedback, upvote_count: newCount })}
          />

          {/* Content */}
          <div className="flex-1">
            {/* Status + Category */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${status.color}`}>
                {status.label}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {category.emoji} {category.label}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {feedback.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
              <span>by {feedback.author_name}</span>
              <span>•</span>
              <span>
                {new Date(feedback.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* Description */}
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{feedback.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments ({comments.length})
        </h2>

        {/* Comment Form */}
        <form onSubmit={handleSubmitComment} className="mb-8">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          <button
            type="submit"
            disabled={isSubmittingComment || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmittingComment ? 'Posting...' : 'Post Comment'}
          </button>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id}
                className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-2"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {comment.author_name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
