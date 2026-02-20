"use client"

import { useState } from 'react'
import { ArrowUp } from 'lucide-react'

interface VoteButtonProps {
  feedbackId: string
  initialVoteCount: number
  initialHasVoted: boolean
  onVoteChange?: (newCount: number) => void
}

export function VoteButton({ feedbackId, initialVoteCount, initialHasVoted, onVoteChange }: VoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount)
  const [hasVoted, setHasVoted] = useState(initialHasVoted)
  const [isLoading, setIsLoading] = useState(false)

  const handleVote = async () => {
    if (isLoading) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to toggle vote')
      }

      const data = await response.json()

      if (data.success) {
        const newVoted = data.hasVoted
        const newCount = newVoted ? voteCount + 1 : voteCount - 1

        setHasVoted(newVoted)
        setVoteCount(newCount)

        onVoteChange?.(newCount)
      }

    } catch (error) {
      console.error('Error toggling vote:', error)
      alert('Failed to vote. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleVote}
      disabled={isLoading}
      className={`
        flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all
        ${hasVoted 
          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
          : 'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-label={hasVoted ? 'Remove vote' : 'Vote for this feedback'}
    >
      <ArrowUp 
        className={`w-5 h-5 ${hasVoted ? 'fill-current' : ''}`}
      />
      <span className="text-sm font-semibold">{voteCount}</span>
    </button>
  )
}
