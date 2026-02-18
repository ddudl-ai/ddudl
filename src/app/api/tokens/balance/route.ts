import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username') || undefined
    const userId = searchParams.get('userId') || undefined

    if (!username && !userId) {
      return NextResponse.json({ error: 'username or userId required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Resolve users.id
    let profileId = userId as string | undefined
    if (!profileId && username) {
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()
      profileId = profile?.id
    }

    if (!profileId) {
      return NextResponse.json({ error: 'user not found' }, { status: 404 })
    }

    // Sum token transactions
    const { data: rows, error } = await supabase
      .from('token_transactions')
      .select('amount, type')
      .eq('user_id', profileId)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    let balance = 0
    for (const r of rows || []) {
      const amt = Number(r.amount || 0)
      balance += r.type === 'spend' ? -amt : amt
    }

    // Sync users.karma_points for consistency
    await supabase
      .from('users')
      .update({ karma_points: balance })
      .eq('id', profileId)

    return NextResponse.json({ success: true, balance })
  } catch (e) {
    console.error('Balance API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

