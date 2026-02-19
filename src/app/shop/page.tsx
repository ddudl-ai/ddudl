'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'
import { TokenBalance } from '@/components/tokens/TokenBalance'
import { TokenHistory } from '@/components/tokens/TokenHistory'
import {
  Coins,
  Rocket,
  Star,
  MessageSquare,
  Pin,
  Palette,
  ShoppingBag,
  TrendingUp,
  Crown
} from 'lucide-react'

interface ShopItem {
  id: string
  name: string
  description: string
  cost: number
  icon: React.ReactNode
  category: 'boost' | 'premium' | 'cosmetic'
  action: string
  duration?: string
}

const shopItems: ShopItem[] = [
  {
    id: '1',
    name: '1-hour Boost',
    description: 'Pin your post to the top for 1 hour',
    cost: 100,
    icon: <Rocket className="w-6 h-6" />,
    category: 'boost',
    action: 'post_boost_1h',
    duration: '1 hour'
  },
  {
    id: '2',
    name: '6-hour Boost',
    description: 'Pin your post to the top for 6 hours',
    cost: 500,
    icon: <TrendingUp className="w-6 h-6" />,
    category: 'boost',
    action: 'post_boost_6h',
    duration: '6 hours'
  },
  {
    id: '3',
    name: '24-hour Boost',
    description: 'Pin your post to the top for 24 hours',
    cost: 1500,
    icon: <Rocket className="w-6 h-6 text-orange-500" />,
    category: 'boost',
    action: 'post_boost_24h',
    duration: '24 hours'
  },
  {
    id: '4',
    name: 'Premium Badge (7 days)',
    description: 'Display premium badge on profile',
    cost: 1000,
    icon: <Star className="w-6 h-6 text-yellow-500" />,
    category: 'premium',
    action: 'premium_badge_7d',
    duration: '7 days'
  },
  {
    id: '5',
    name: 'Premium Badge (30 days)',
    description: 'Display premium badge on profile',
    cost: 3000,
    icon: <Crown className="w-6 h-6 text-yellow-500" />,
    category: 'premium',
    action: 'premium_badge_30d',
    duration: '30 days'
  },
  {
    id: '6',
    name: 'Custom Flair',
    description: 'Set custom user flair',
    cost: 500,
    icon: <Palette className="w-6 h-6 text-purple-500" />,
    category: 'cosmetic',
    action: 'custom_flair'
  },
  {
    id: '7',
    name: 'Highlight Comment',
    description: 'Highlight comments (7 days)',
    cost: 50,
    icon: <MessageSquare className="w-6 h-6 text-blue-500" />,
    category: 'cosmetic',
    action: 'highlight_comment',
    duration: '7 days'
  },
  {
    id: '8',
    name: 'Pin Post (1 day)',
    description: 'Pin post to top of channel',
    cost: 2000,
    icon: <Pin className="w-6 h-6 text-red-500" />,
    category: 'boost',
    action: 'pin_post_1d',
    duration: '1 day'
  }
]

export default function ShopPage() {
  const [balance, setBalance] = useState<number>(0)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const { user } = useAuthStore()
  const { toast } = useToast()
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build'
  })

  useEffect(() => {
    if (user?.id) {
      fetchBalance()
    }
  }, [user?.id])

  const fetchBalance = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('karma_points')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setBalance(data.karma_points)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  const handlePurchase = async (item: ShopItem) => {
    if (!user?.id) {
      toast({
        title: 'Login Required',
        description: 'Please log in to purchase.',
        variant: 'destructive'
      })
      return
    }

    if (balance < item.cost) {
      toast({
        title: 'Insufficient Tokens',
        description: `You need ${item.cost - balance} more tokens.`,
        variant: 'destructive'
      })
      return
    }

    setPurchasing(item.id)
    try {
      const response = await fetch('/api/tokens/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: item.action,
          metadata: { itemName: item.name }
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Purchase Complete!',
          description: `You have purchased ${item.name}.`,
        })
        setBalance(data.newBalance)
      } else {
        toast({
          title: 'Purchase Failed',
          description: data.message || 'An error occurred.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while processing your purchase.',
        variant: 'destructive'
      })
    } finally {
      setPurchasing(null)
    }
  }

  const ItemCard = ({ item }: { item: ShopItem }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {item.icon}
            <div>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              {item.duration && (
                <Badge variant="secondary" className="mt-1">
                  {item.duration}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Coins className="w-4 h-4" />
            <span className="font-bold">{item.cost}</span>
          </div>
        </div>
        <CardDescription className="mt-2">{item.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => handlePurchase(item)}
          disabled={purchasing === item.id || balance < item.cost}
          className="w-full"
        >
          {purchasing === item.id ? 'Purchasing...' :
            balance < item.cost ? `${item.cost - balance} tokens short` : 'Purchase'}
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingBag className="w-8 h-8" />
            Token Shop
          </h1>
          <p className="text-muted-foreground mt-2">
            Purchase various features with your tokens
          </p>
        </div>
        <TokenBalance className="scale-125" />
      </div>

      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Boost
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shopItems.filter(item => item.category === 'boost').map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Premium
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shopItems.filter(item => item.category === 'premium').map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Cosmetic
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shopItems.filter(item => item.category === 'cosmetic').map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <TokenHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}