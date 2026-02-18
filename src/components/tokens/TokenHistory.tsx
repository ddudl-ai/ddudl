'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { createClientComponentClient } from &apos;@supabase/auth-helpers-nextjs&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { ScrollArea } from &apos;@/components/ui/scroll-area&apos;
import { Skeleton } from &apos;@/components/ui/skeleton&apos;
import { ArrowDownIcon, ArrowUpIcon, Coins } from &apos;lucide-react&apos;
import { formatDistanceToNow } from &apos;date-fns&apos;
import { ko } from &apos;date-fns/locale&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;

interface TokenTransaction {
  id: string
  amount: number
  type: &apos;earn&apos; | &apos;spend&apos;
  category: string
  description: string
  metadata?: any
  created_at: string
}

export function TokenHistory() {
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || &apos;https://example.supabase.co&apos;,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || &apos;dummy-key-for-build&apos;
  })

  useEffect(() => {
    if (user?.id) {
      fetchTransactions()
    }
  }, [user?.id])

  const fetchTransactions = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(&apos;token_transactions&apos;)
        .select(&apos;*&apos;)
        .eq(&apos;user_id&apos;, user.id)
        .order(&apos;created_at&apos;, { ascending: false })
        .limit(50)

      if (!error && data) {
        setTransactions(data)
      }
    } catch (error) {
      console.error(&apos;Failed to fetch transactions:&apos;, error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token 거래 내역</CardTitle>
          <CardDescription>로그인이 필요합니다.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token 거래 내역</CardTitle>
          <CardDescription>최근 50개의 거래 내역</CardDescription>
        </CardHeader>
        <CardContent>
          <div className=&quot;space-y-3&quot;>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className=&quot;h-12 w-full&quot; />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token 거래 내역</CardTitle>
          <CardDescription>최근 50개의 거래 내역</CardDescription>
        </CardHeader>
        <CardContent>
          <p className=&quot;text-center text-muted-foreground py-8&quot;>
            거래 내역이 없습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token 거래 내역</CardTitle>
        <CardDescription>최근 50개의 거래 내역</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className=&quot;h-[400px] pr-4&quot;>
          <div className=&quot;space-y-3&quot;>
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className=&quot;flex items-center justify-between py-3 border-b last:border-0&quot;
              >
                <div className=&quot;flex items-start gap-3&quot;>
                  <div className={`p-2 rounded-full ${transaction.type === &apos;earn&apos;
                    ? &apos;bg-green-100 text-green-600&apos;
                    : &apos;bg-red-100 text-red-600&apos;
                    }`}>
                    {transaction.type === &apos;earn&apos; ? (
                      <ArrowDownIcon className=&quot;w-4 h-4&quot; />
                    ) : (
                      <ArrowUpIcon className=&quot;w-4 h-4&quot; />
                    )}
                  </div>
                  <div>
                    <p className=&quot;font-medium&quot;>{transaction.description}</p>
                    <p className=&quot;text-sm text-muted-foreground&quot;>
                      {formatDistanceToNow(new Date(transaction.created_at), {
                        addSuffix: true,
                        locale: ko
                      })}
                    </p>
                  </div>
                </div>
                <div className=&quot;flex items-center gap-2&quot;>
                  <span className={`font-bold ${transaction.type === &apos;earn&apos; ? &apos;text-green-600&apos; : &apos;text-red-600&apos;
                    }`}>
                    {transaction.type === &apos;earn&apos; ? &apos;+&apos; : &apos;-&apos;}{transaction.amount}
                  </span>
                  <Coins className=&quot;w-4 h-4 text-muted-foreground&quot; />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}