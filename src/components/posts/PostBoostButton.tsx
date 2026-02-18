'use client&apos;

import { useState } from &apos;react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from &apos;@/components/ui/dialog&apos;
import { RadioGroup, RadioGroupItem } from &apos;@/components/ui/radio-group&apos;
import { Label } from &apos;@/components/ui/label&apos;
import { useToast } from &apos;@/hooks/use-toast&apos;
import { Rocket, Coins, Clock, TrendingUp } from &apos;lucide-react&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;

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
    id: &apos;post_boost_1h&apos;,
    duration: &apos;1 hour&apos;,
    cost: 100,
    description: &apos;Pin post to top for 1 hour&apos;
  },
  {
    id: &apos;post_boost_6h&apos;,
    duration: &apos;6 hours&apos;,
    cost: 500,
    description: &apos;Pin post to top for 6 hours&apos;
  },
  {
    id: &apos;post_boost_24h&apos;,
    duration: &apos;24 hours&apos;,
    cost: 1500,
    description: &apos;Pin post to top for 24 hours&apos;
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
      console.error(&apos;Failed to fetch balance:&apos;, error)
    }
  }

  const handleBoost = async () => {
    if (!user?.id) {
      toast({
        title: &apos;Login Required&apos;,
        description: &apos;Please log in to use the boost feature.&apos;,
        variant: &apos;destructive&apos;
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(&apos;/api/tokens/spend&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
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
          title: &apos;Boost Successful!&apos;,
          description: `Post has been boosted. Remaining tokens: ${data.newBalance}`,
        })
        setOpen(false)
        // 페이지 새로고침 또는 상태 업데이트
        window.location.reload()
      } else {
        toast({
          title: &apos;Boost Failed&apos;,
          description: data.message || &apos;Insufficient tokens or an error occurred.&apos;,
          variant: &apos;destructive&apos;
        })
      }
    } catch (error) {
      toast({
        title: &apos;Error&apos;,
        description: &apos;An error occurred while processing boost.&apos;,
        variant: &apos;destructive&apos;
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
      <Button variant=&quot;outline&quot; disabled size=&quot;sm&quot;>
        <TrendingUp className=&quot;w-4 h-4 mr-2&quot; />
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
        <Button variant=&quot;outline&quot; size=&quot;sm&quot;>
          <Rocket className=&quot;w-4 h-4 mr-2&quot; />
          Boost
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Boost Post</DialogTitle>
          <DialogDescription>
            Use tokens to pin your post to the top.
            {userBalance !== null && (
              <div className=&quot;mt-2 flex items-center gap-2&quot;>
                <Coins className=&quot;w-4 h-4&quot; />
                <span className=&quot;font-semibold&quot;>Available tokens: {userBalance}</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
          {boostOptions.map((option) => (
            <div key={option.id} className=&quot;flex items-start space-x-3 mb-4&quot;>
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id} className=&quot;flex-1 cursor-pointer&quot;>
                <div className=&quot;flex items-center justify-between&quot;>
                  <div>
                    <div className=&quot;font-semibold flex items-center gap-2&quot;>
                      <Clock className=&quot;w-4 h-4&quot; />
                      {option.duration}
                    </div>
                    <div className=&quot;text-sm text-muted-foreground&quot;>
                      {option.description}
                    </div>
                  </div>
                  <div className=&quot;flex items-center gap-1 font-bold&quot;>
                    <Coins className=&quot;w-4 h-4&quot; />
                    {option.cost}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant=&quot;outline&quot; onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBoost}
            disabled={loading || (userBalance !== null && userBalance < selectedCost)}
          >
            {loading ? &apos;Processing...&apos; : `Boost for ${selectedCost} tokens`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}