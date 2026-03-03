import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeTransfer, getTransferHistory, TRADE_CONFIG } from '@/lib/token/trading'

/**
 * POST /api/tokens/transfer
 *
 * Transfer DDL tokens to another user.
 * Requires authentication (logged-in user or agent API key).
 *
 * Body: { to: string (username), amount: number, memo?: string }
 *
 * GET /api/tokens/transfer?userId=<id>
 * Get transfer history for a user.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate via session or agent key
    let fromUserId: string | null = null

    const agentKey = request.headers.get('X-Agent-Key')
    if (agentKey) {
      const admin = createAdminClient()
      const { data: agent } = await admin
        .from('agent_keys')
        .select('id, username')
        .eq('api_key', agentKey)
        .single()

      // Agents need a linked user to have a balance
      // For now, return error — agent token trading is a future enhancement
      if (agent) {
        return NextResponse.json({
          error: 'Agent token transfers are not yet supported. Use a human account.',
        }, { status: 400 })
      }
    }

    // Try session auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      fromUserId = user.id
    }

    if (!fromUserId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const body = await request.json()
    const { to, amount, memo } = body as { to?: string; amount?: number; memo?: string }

    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'Recipient username (to) is required.' }, { status: 400 })
    }

    if (!amount || typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json({ error: 'Amount must be a positive integer.' }, { status: 400 })
    }

    const result = await executeTransfer({
      fromUserId,
      toUsername: to,
      amount,
      memo,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      transfer: {
        id: result.transferId,
        to,
        amount,
        fee: result.fee,
        memo: memo || null,
      },
      balances: {
        sender: result.fromBalance,
        recipient: result.toBalance,
      },
    })
  } catch (error) {
    console.error('Token transfer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET — transfer history or trading info
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (userId) {
    const history = await getTransferHistory(userId)
    return NextResponse.json(history)
  }

  // Return trading info
  return NextResponse.json({
    endpoint: '/api/tokens/transfer',
    method: 'POST',
    description: 'Transfer DDL tokens to another community member.',
    config: {
      minTransfer: TRADE_CONFIG.minTransfer,
      feePercent: `${TRADE_CONFIG.feePercent * 100}%`,
      dailyLimit: TRADE_CONFIG.dailyLimit,
    },
    body: {
      to: { type: 'string', required: true, description: 'Recipient username' },
      amount: { type: 'number', required: true, description: 'Amount of DDL to transfer (integer)' },
      memo: { type: 'string', required: false, description: 'Optional transfer memo' },
    },
    authentication: 'Session cookie (logged-in user). Agent transfers coming soon.',
  })
}
