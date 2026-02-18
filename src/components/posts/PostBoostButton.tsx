'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Rocket, Coins, Clock, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface PostBoostButtonProps {
  postId: string
  currentBoost?: {
    expires_at: string
    boost_type: string
  }
}

interface BoostOption {
  id: string
  duration: string
  cost: number
  description: string
}

const boostOptions: BoostOption[] = [
  {
    id: 'post_boost_1h',
    duration: '1 hour',
    cost: 100,
    description: 'Pin post to top for 1 hour'
  },
  {
    id: 'post_boost_6h',
    duration: '6 hours',
    cost: 500,
    description: 'Pin post to top for 6 hours'
  },
  {
    id: 'post_boost_24h',
    duration: '24 hours',
    cost: 1500,
    description: 'Pin post to top for 24 hours'
  }
]

export function PostBoostButton({ postId, currentBoost }: PostBoostButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState(boostOptions[0].id)
  const [loading, setLoading] = useState(false)
  const [userBalance, setUserBalance] = useState<number | null>(null)
  const { toast } = useToast()
  const { user } = useAuthStore()

  const fetchBalance = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/tokens/spend?userId=${user.id}`)
      const data = await response.json()

      if (response.ok) {
        setUserBalance(data.balance)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  const handleBoost = async () => {
    if (!user?.id) {
      toast({
        title: 'Login Required',
        description: 'Please log in to use the boost feature.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/tokens/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: selectedOption,
          targetId: postId,
          metadata: { postId }
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Boost Successful!',
          description: `Post has been boosted. Remaining tokens: ${data.newBalance}`,
        })
        setOpen(false)
        // 페이지 새로고침 또는 상태 업데이트
        window.location.reload()
      } else {
        toast({
          title: 'Boost Failed',
          description: data.message || 'Insufficient tokens or an error occurred.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while processing boost.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedCost = boostOptions.find(opt => opt.id === selectedOption)?.cost || 0

  // 이미 부스트 중인 경우
  if (currentBoost && new Date(currentBoost.expires_at) > new Date()) {
    const expiresIn = Math.ceil((new Date(currentBoost.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))
    return (
      <Button variant="outline" disabled size="sm">
        <TrendingUp className="w-4 h-4 mr-2" />
        Boosted ({expiresIn}h left)
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) fetchBalance()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Rocket className="w-4 h-4 mr-2" />
          Boost
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Boost Post</DialogTitle>
          <DialogDescription>
            Use tokens to pin your post to the top.
            {userBalance !== null && (
              <div className="mt-2 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span className="font-semibold">Available tokens: {userBalance}</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
          {boostOptions.map((option) => (
            <div key={option.id} className="flex items-start space-x-3 mb-4">
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {option.duration}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-bold">
                    <Coins className="w-4 h-4" />
                    {option.cost}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBoost}
            disabled={loading || (userBalance !== null && userBalance < selectedCost)}
          >
            {loading ? 'Processing...' : `Boost for ${selectedCost} tokens`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}