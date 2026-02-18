'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { createClientComponentClient } from &apos;@supabase/auth-helpers-nextjs&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/components/ui/tabs&apos;
import { useToast } from &apos;@/hooks/use-toast&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { TokenBalance } from &apos;@/components/tokens/TokenBalance&apos;
import { TokenHistory } from &apos;@/components/tokens/TokenHistory&apos;
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
} from &apos;lucide-react&apos;

interface ShopItem {
  id: string
  name: string
  description: string
  cost: number
  icon: React.ReactNode
  category: &apos;boost&apos; | &apos;premium&apos; | &apos;cosmetic&apos;
  action: string
  duration?: string
}

const shopItems: ShopItem[] = [
  {
    id: &apos;1&apos;,
    name: &apos;1-hour Boost&apos;,
    description: &apos;Pin your post to the top for 1 hour&apos;,
    cost: 100,
    icon: <Rocket className=&quot;w-6 h-6&quot; />,
    category: &apos;boost&apos;,
    action: &apos;post_boost_1h&apos;,
    duration: &apos;1 hour&apos;
  },
  {
    id: &apos;2&apos;,
    name: &apos;6-hour Boost&apos;,
    description: &apos;Pin your post to the top for 6 hours&apos;,
    cost: 500,
    icon: <TrendingUp className=&quot;w-6 h-6&quot; />,
    category: &apos;boost&apos;,
    action: &apos;post_boost_6h&apos;,
    duration: &apos;6 hours&apos;
  },
  {
    id: &apos;3&apos;,
    name: &apos;24-hour Boost&apos;,
    description: &apos;Pin your post to the top for 24 hours&apos;,
    cost: 1500,
    icon: <Rocket className=&quot;w-6 h-6 text-orange-500&quot; />,
    category: &apos;boost&apos;,
    action: &apos;post_boost_24h&apos;,
    duration: &apos;24 hours&apos;
  },
  {
    id: &apos;4&apos;,
    name: &apos;Premium Badge (7 days)&apos;,
    description: &apos;Display premium badge on profile&apos;,
    cost: 1000,
    icon: <Star className=&quot;w-6 h-6 text-yellow-500&quot; />,
    category: &apos;premium&apos;,
    action: &apos;premium_badge_7d&apos;,
    duration: &apos;7 days&apos;
  },
  {
    id: &apos;5&apos;,
    name: &apos;Premium Badge (30 days)&apos;,
    description: &apos;Display premium badge on profile&apos;,
    cost: 3000,
    icon: <Crown className=&quot;w-6 h-6 text-yellow-500&quot; />,
    category: &apos;premium&apos;,
    action: &apos;premium_badge_30d&apos;,
    duration: &apos;30 days&apos;
  },
  {
    id: &apos;6&apos;,
    name: &apos;Custom Flair&apos;,
    description: &apos;Set custom user flair&apos;,
    cost: 500,
    icon: <Palette className=&quot;w-6 h-6 text-purple-500&quot; />,
    category: &apos;cosmetic&apos;,
    action: &apos;custom_flair&apos;
  },
  {
    id: &apos;7&apos;,
    name: &apos;Highlight Comment&apos;,
    description: &apos;Highlight comments (7 days)&apos;,
    cost: 50,
    icon: <MessageSquare className=&quot;w-6 h-6 text-blue-500&quot; />,
    category: &apos;cosmetic&apos;,
    action: &apos;highlight_comment&apos;,
    duration: &apos;7 days&apos;
  },
  {
    id: &apos;8&apos;,
    name: &apos;Pin Post (1 day)&apos;,
    description: &apos;Pin post to top of channel&apos;,
    cost: 2000,
    icon: <Pin className=&quot;w-6 h-6 text-red-500&quot; />,
    category: &apos;boost&apos;,
    action: &apos;pin_post_1d&apos;,
    duration: &apos;1 day&apos;
  }
]

export default function ShopPage() {
  const [balance, setBalance] = useState<number>(0)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const { user } = useAuthStore()
  const { toast } = useToast()
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || &apos;https://example.supabase.co&apos;,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || &apos;dummy-key-for-build&apos;
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
        .from(&apos;users&apos;)
        .select(&apos;karma_points&apos;)
        .eq(&apos;id&apos;, user.id)
        .single()

      if (!error && data) {
        setBalance(data.karma_points)
      }
    } catch (error) {
      console.error(&apos;Failed to fetch balance:&apos;, error)
    }
  }

  const handlePurchase = async (item: ShopItem) => {
    if (!user?.id) {
      toast({
        title: &apos;Login Required&apos;,
        description: &apos;Please log in to purchase.&apos;,
        variant: &apos;destructive&apos;
      })
      return
    }

    if (balance < item.cost) {
      toast({
        title: &apos;Insufficient Tokens&apos;,
        description: `You need ${item.cost - balance} more tokens.`,
        variant: &apos;destructive&apos;
      })
      return
    }

    setPurchasing(item.id)
    try {
      const response = await fetch(&apos;/api/tokens/spend&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
        body: JSON.stringify({
          userId: user.id,
          action: item.action,
          metadata: { itemName: item.name }
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: &apos;Purchase Complete!&apos;,
          description: `You have purchased ${item.name}.`,
        })
        setBalance(data.newBalance)
      } else {
        toast({
          title: &apos;Purchase Failed&apos;,
          description: data.message || &apos;An error occurred.&apos;,
          variant: &apos;destructive&apos;
        })
      }
    } catch (error) {
      toast({
        title: &apos;Error&apos;,
        description: &apos;An error occurred while processing your purchase.&apos;,
        variant: &apos;destructive&apos;
      })
    } finally {
      setPurchasing(null)
    }
  }

  const ItemCard = ({ item }: { item: ShopItem }) => (
    <Card>
      <CardHeader>
        <div className=&quot;flex items-start justify-between&quot;>
          <div className=&quot;flex items-center gap-3&quot;>
            {item.icon}
            <div>
              <CardTitle className=&quot;text-lg&quot;>{item.name}</CardTitle>
              {item.duration && (
                <Badge variant=&quot;secondary&quot; className=&quot;mt-1&quot;>
                  {item.duration}
                </Badge>
              )}
            </div>
          </div>
          <div className=&quot;flex items-center gap-1&quot;>
            <Coins className=&quot;w-4 h-4&quot; />
            <span className=&quot;font-bold&quot;>{item.cost}</span>
          </div>
        </div>
        <CardDescription className=&quot;mt-2&quot;>{item.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => handlePurchase(item)}
          disabled={purchasing === item.id || balance < item.cost}
          className=&quot;w-full&quot;
        >
          {purchasing === item.id ? &apos;Purchasing...&apos; :
            balance < item.cost ? `${item.cost - balance} tokens short` : &apos;Purchase&apos;}
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className=&quot;container mx-auto py-8&quot;>
      <div className=&quot;flex items-center justify-between mb-8&quot;>
        <div>
          <h1 className=&quot;text-3xl font-bold flex items-center gap-3&quot;>
            <ShoppingBag className=&quot;w-8 h-8&quot; />
            Token Shop
          </h1>
          <p className=&quot;text-muted-foreground mt-2&quot;>
            Purchase various features with your tokens
          </p>
        </div>
        <TokenBalance className=&quot;scale-125&quot; />
      </div>

      <Tabs defaultValue=&quot;shop&quot; className=&quot;space-y-6&quot;>
        <TabsList className=&quot;grid w-full grid-cols-2&quot;>
          <TabsTrigger value=&quot;shop&quot;>Shop</TabsTrigger>
          <TabsTrigger value=&quot;history&quot;>Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value=&quot;shop&quot; className=&quot;space-y-6&quot;>
          <div>
            <h2 className=&quot;text-xl font-semibold mb-4 flex items-center gap-2&quot;>
              <Rocket className=&quot;w-5 h-5&quot; />
              Boost
            </h2>
            <div className=&quot;grid gap-4 md:grid-cols-2 lg:grid-cols-3&quot;>
              {shopItems.filter(item => item.category === &apos;boost&apos;).map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div>
            <h2 className=&quot;text-xl font-semibold mb-4 flex items-center gap-2&quot;>
              <Star className=&quot;w-5 h-5&quot; />
              Premium
            </h2>
            <div className=&quot;grid gap-4 md:grid-cols-2 lg:grid-cols-3&quot;>
              {shopItems.filter(item => item.category === &apos;premium&apos;).map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div>
            <h2 className=&quot;text-xl font-semibold mb-4 flex items-center gap-2&quot;>
              <Palette className=&quot;w-5 h-5&quot; />
              Cosmetic
            </h2>
            <div className=&quot;grid gap-4 md:grid-cols-2 lg:grid-cols-3&quot;>
              {shopItems.filter(item => item.category === &apos;cosmetic&apos;).map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value=&quot;history&quot;>
          <TokenHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}