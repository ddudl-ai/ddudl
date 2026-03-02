import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public endpoint — no auth required. Transparency is core.
export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // All-time token stats
    const { data: allEarn } = await db
      .from('token_transactions')
      .select('amount, category, created_at, user_id')
      .eq('type', 'earn')

    const { data: allSpend } = await db
      .from('token_transactions')
      .select('amount, category, created_at, user_id')
      .eq('type', 'spend')

    const earnTx = allEarn || []
    const spendTx = allSpend || []

    const totalIssued = earnTx.reduce((s, t) => s + (t.amount || 0), 0)
    const totalSpent = spendTx.reduce((s, t) => s + Math.abs(t.amount || 0), 0)
    const totalCirculation = totalIssued - totalSpent

    // Unique token holders
    const holderSet = new Set([...earnTx.map(t => t.user_id), ...spendTx.map(t => t.user_id)])

    // Earn by category
    const earnByCategory = new Map<string, number>()
    for (const t of earnTx) {
      const cat = t.category || 'other'
      earnByCategory.set(cat, (earnByCategory.get(cat) || 0) + t.amount)
    }

    // Spend by category
    const spendByCategory = new Map<string, number>()
    for (const t of spendTx) {
      const cat = t.category || 'other'
      spendByCategory.set(cat, (spendByCategory.get(cat) || 0) + Math.abs(t.amount))
    }

    // Period activity
    const periodEarn = earnTx.filter(t => t.created_at >= since)
    const periodSpend = spendTx.filter(t => t.created_at >= since)
    const periodIssued = periodEarn.reduce((s, t) => s + t.amount, 0)
    const periodSpentAmt = periodSpend.reduce((s, t) => s + Math.abs(t.amount), 0)

    // Daily flow (period)
    const dailyMap = new Map<string, { earned: number; spent: number }>()
    for (const t of periodEarn) {
      const d = t.created_at.substring(0, 10)
      if (!dailyMap.has(d)) dailyMap.set(d, { earned: 0, spent: 0 })
      dailyMap.get(d)!.earned += t.amount
    }
    for (const t of periodSpend) {
      const d = t.created_at.substring(0, 10)
      if (!dailyMap.has(d)) dailyMap.set(d, { earned: 0, spent: 0 })
      dailyMap.get(d)!.spent += Math.abs(t.amount)
    }

    // Fill gaps
    const daily: Array<{ date: string; earned: number; spent: number; net: number }> = []
    const start = new Date(since)
    const end = new Date()
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const ds = d.toISOString().substring(0, 10)
      const entry = dailyMap.get(ds)
      daily.push({
        date: ds,
        earned: entry?.earned || 0,
        spent: entry?.spent || 0,
        net: (entry?.earned || 0) - (entry?.spent || 0),
      })
    }

    // Top earners (by total earned, anonymized for public)
    const earnerMap = new Map<string, number>()
    for (const t of earnTx) {
      earnerMap.set(t.user_id, (earnerMap.get(t.user_id) || 0) + t.amount)
    }
    const topEarners = Array.from(earnerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // Fetch usernames for top earners
    const topEarnerIds = topEarners.map(([id]) => id)
    let usernameMap = new Map<string, string>()
    if (topEarnerIds.length > 0) {
      const { data: users } = await db
        .from('users')
        .select('id, username')
        .in('id', topEarnerIds)
      for (const u of (users || [])) {
        usernameMap.set(u.id, u.username || 'anonymous')
      }
    }

    // Velocity: tokens earned per day (period)
    const periodDays = Math.max(1, days)
    const velocity = Math.round(periodIssued / periodDays)

    // Gini coefficient for token distribution
    const balances = Array.from(earnerMap.values()).sort((a, b) => a - b)
    let gini = 0
    if (balances.length > 1) {
      const n = balances.length
      const total = balances.reduce((a, b) => a + b, 0)
      for (let i = 0; i < n; i++) {
        gini += (2 * (i + 1) - n - 1) * balances[i]
      }
      gini = total > 0 ? gini / (n * total) : 0
    }

    return NextResponse.json({
      overview: {
        total_issued: totalIssued,
        total_spent: totalSpent,
        in_circulation: totalCirculation,
        unique_holders: holderSet.size,
        velocity_per_day: velocity,
        distribution_gini: Math.round(gini * 1000) / 1000,
        distribution_health: gini < 0.4 ? 'healthy' : gini < 0.6 ? 'moderate' : 'concentrated',
      },
      period: {
        days,
        earned: periodIssued,
        spent: periodSpentAmt,
        net: periodIssued - periodSpentAmt,
        transactions: periodEarn.length + periodSpend.length,
      },
      earn_categories: Object.fromEntries(earnByCategory),
      spend_categories: Object.fromEntries(spendByCategory),
      top_contributors: topEarners.map(([id, amount]) => ({
        username: usernameMap.get(id) || 'anonymous',
        total_earned: amount,
      })),
      daily,
    })
  } catch (error) {
    console.error('Treasury API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
