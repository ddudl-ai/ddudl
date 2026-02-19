'use client'

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CommentVoteProps {
  commentId: string
  initialUpvotes: number
  initialDownvotes: number
}

export default function CommentVote({ commentId, initialUpvotes, initialDownvotes }: CommentVoteProps) {
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
  const [currentUpvotes, setCurrentUpvotes] = useState(initialUpvotes)
  const [currentDownvotes, setCurrentDownvotes] = useState(initialDownvotes)
  const [isVoting, setIsVoting] = useState(false)

  // 컴포넌트 마운트시 User의 투표 상태 로드
  useEffect(() => {
    const loadUserVote = async () => {
      try {
        const response = await fetch(`/api/comments/${commentId}/vote`)
        if (response.ok) {
          const data = await response.json()
          setUserVote(data.userVote)
          setCurrentUpvotes(data.upvotes)
          setCurrentDownvotes(data.downvotes)
        }
      } catch (error) {
        console.error('Failed to load user vote:', error)
      }
    }
    
    loadUserVote()
  }, [commentId])

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isVoting) return
    
    setIsVoting(true)
    
    try {
      // 같은 투표를 클릭하면 제거, 다른 투표를 클릭하면 변경
      const actualVoteType = userVote === voteType ? 'remove' : voteType
      
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voteType: actualVoteType }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserVote(data.userVote)
        setCurrentUpvotes(data.upvotes)
        setCurrentDownvotes(data.downvotes)
      } else {
        const error = await response.json()
        console.error('Vote failed:', error.error || error)
        // 로그인이 필요한 경우 알림
        if (response.status === 401) {
          alert('You need to sign in to vote.')
        } else {
          alert(`Vote failed: ${error.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Vote error:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const getVoteScore = () => currentUpvotes - currentDownvotes

  return (
    <div className="flex items-center space-x-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('up')}
        disabled={isVoting}
        className={`p-1 h-6 w-6 ${userVote === 'up' ? 'text-orange-500' : 'text-gray-400'} ${isVoting ? 'opacity-50' : ''}`}
      >
        <ArrowUp className="w-3 h-3" />
      </Button>
      
      <span className={`text-xs font-medium px-1 ${
        getVoteScore() > 0 ? 'text-orange-500' : 
        getVoteScore() < 0 ? 'text-blue-500' : 
        'text-gray-500'
      }`}>
        {getVoteScore()}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('down')}
        disabled={isVoting}
        className={`p-1 h-6 w-6 ${userVote === 'down' ? 'text-blue-500' : 'text-gray-400'} ${isVoting ? 'opacity-50' : ''}`}
      >
        <ArrowDown className="w-3 h-3" />
      </Button>
    </div>
  )
}