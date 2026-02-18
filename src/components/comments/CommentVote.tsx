'use client&apos;

import { useState, useEffect } from &apos;react&apos;
import { ArrowUp, ArrowDown } from &apos;lucide-react&apos;
import { Button } from &apos;@/components/ui/button&apos;

interface CommentVoteProps {
  commentId: string
  initialUpvotes: number
  initialDownvotes: number
}

export default function CommentVote({ commentId, initialUpvotes, initialDownvotes }: CommentVoteProps) {
  const [userVote, setUserVote] = useState<&apos;up&apos; | &apos;down&apos; | null>(null)
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
        console.error(&apos;Failed to load user vote:&apos;, error)
      }
    }
    
    loadUserVote()
  }, [commentId])

  const handleVote = async (voteType: &apos;up&apos; | &apos;down&apos;) => {
    if (isVoting) return
    
    setIsVoting(true)
    
    try {
      // 같은 투표를 클릭하면 제거, 다른 투표를 클릭하면 변경
      const actualVoteType = userVote === voteType ? &apos;remove&apos; : voteType
      
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: &apos;POST&apos;,
        headers: {
          &apos;Content-Type&apos;: &apos;application/json&apos;,
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
        console.error(&apos;Vote failed:&apos;, error.error || error)
        // 로그인이 필요한 경우 알림
        if (response.status === 401) {
          alert(&apos;You need to sign in to vote.&apos;)
        } else {
          alert(`Vote failed: ${error.error || &apos;Unknown error&apos;}`)
        }
      }
    } catch (error) {
      console.error(&apos;Vote error:&apos;, error)
    } finally {
      setIsVoting(false)
    }
  }

  const getVoteScore = () => currentUpvotes - currentDownvotes

  return (
    <div className=&quot;flex items-center space-x-1&quot;>
      <Button
        variant=&quot;ghost&quot;
        size=&quot;sm&quot;
        onClick={() => handleVote(&apos;up&apos;)}
        disabled={isVoting}
        className={`p-1 h-6 w-6 ${userVote === &apos;up&apos; ? &apos;text-orange-500&apos; : &apos;text-gray-400&apos;} ${isVoting ? &apos;opacity-50&apos; : &apos;'}`}
      >
        <ArrowUp className=&quot;w-3 h-3&quot; />
      </Button>
      
      <span className={`text-xs font-medium px-1 ${
        getVoteScore() > 0 ? &apos;text-orange-500&apos; : 
        getVoteScore() < 0 ? &apos;text-blue-500&apos; : 
        &apos;text-gray-500&apos;
      }`}>
        {getVoteScore()}
      </span>
      
      <Button
        variant=&quot;ghost&quot;
        size=&quot;sm&quot;
        onClick={() => handleVote(&apos;down&apos;)}
        disabled={isVoting}
        className={`p-1 h-6 w-6 ${userVote === &apos;down&apos; ? &apos;text-blue-500&apos; : &apos;text-gray-400&apos;} ${isVoting ? &apos;opacity-50&apos; : &apos;'}`}
      >
        <ArrowDown className=&quot;w-3 h-3&quot; />
      </Button>
    </div>
  )
}