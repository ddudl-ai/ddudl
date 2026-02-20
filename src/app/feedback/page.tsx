"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FeedbackCard } from '@/components/feedback/FeedbackCard'
import { Plus } from 'lucide-react'

interface Feedback {
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

export default function FeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('open')
  const [sort, setSort] = useState('popular')

  useEffect(() => {
    fetchFeedback()
  }, [category, status, sort])

  const fetchFeedback = async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        category,
        status,
        sort,
        limit: '50'
      })

      const response = await fetch(`/api/feedback?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFeedbackList(data.feedback)
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Feedback
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Share your ideas and help us improve ddudl
          </p>
        </div>

        <Link
          href="/feedback/new"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Feedback
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="feature">✨ Feature</option>
            <option value="bug">🐛 Bug</option>
            <option value="enhancement">🚀 Enhancement</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="popular">Most Votes</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading feedback...</div>
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No feedback found. Be the first to share your ideas!
          </p>
          <Link
            href="/feedback/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Feedback
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackList.map((feedback) => (
            <FeedbackCard key={feedback.id} feedback={feedback} />
          ))}
        </div>
      )}
    </div>
  )
}
