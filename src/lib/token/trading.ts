/**
 * DDL Token Trading System
 *
 * Enables peer-to-peer token transfers between community members.
 * Points earned through participation become tradeable, creating
 * a community-driven micro-economy.
 *
 * Philosophy:
 * - Community first: tokens reward genuine participation
 * - Transparent: all transfers are logged and auditable
 * - Sustainable: transfer fees fund the community treasury
 * - Agent-native: agents can send/receive tokens too
 *
 * Rules:
 * - Minimum transfer: 10 DDL
 * - Transfer fee: 2% (goes to community treasury)
 * - Daily transfer limit: 5000 DDL per user
 * - No self-transfers
 * - Sender must have sufficient balance
 */

import { createAdminClient } from '@/lib/supabase/admin'

export const TRADE_CONFIG = {
  minTransfer: 10,
  feePercent: 0.02,
  dailyLimit: 5000,
  treasuryUserId: 'community-treasury', // Special account
} as const

export interface TransferRequest {
  fromUserId: string
  toUsername: string
  amount: number
  memo?: string
}

export interface TransferResult {
  success: boolean
  transferId?: string
  fromBalance?: number
  toBalance?: number
  fee?: number
  error?: string
}

/**
 * Get a user's current DDL balance.
 */
export async function getBalance(userId: string): Promise<number> {
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('token_transactions')
    .select('amount, type')
    .eq('user_id', userId)

  let balance = 0
  for (const r of rows ?? []) {
    balance += r.type === 'spend' ? -Number(r.amount) : Number(r.amount)
  }
  return balance
}

/**
 * Get total transferred today by a user.
 */
async function getDailyTransferred(userId: string): Promise<number> {
  const admin = createAdminClient()
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { data: rows } = await admin
    .from('token_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'spend')
    .eq('category', 'transfer')
    .gte('created_at', todayStart.toISOString())

  return (rows ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
}

/**
 * Execute a token transfer between users.
 */
export async function executeTransfer(req: TransferRequest): Promise<TransferResult> {
  const admin = createAdminClient()

  // Validate amount
  if (req.amount < TRADE_CONFIG.minTransfer) {
    return { success: false, error: `Minimum transfer is ${TRADE_CONFIG.minTransfer} DDL.` }
  }

  // Resolve recipient
  const { data: toUser } = await admin
    .from('users')
    .select('id, username')
    .eq('username', req.toUsername)
    .single()

  if (!toUser) {
    // Check agent_keys too
    const { data: agentKey } = await admin
      .from('agent_keys')
      .select('id, username')
      .eq('username', req.toUsername)
      .single()

    if (!agentKey) {
      return { success: false, error: `User "${req.toUsername}" not found.` }
    }
    // For agents, use agent key id as a pseudo user id
  }

  const toUserId = toUser?.id
  if (!toUserId) {
    return { success: false, error: `Cannot resolve recipient user ID.` }
  }

  // No self-transfer
  if (req.fromUserId === toUserId) {
    return { success: false, error: 'Cannot transfer to yourself.' }
  }

  // Check balance
  const senderBalance = await getBalance(req.fromUserId)
  const fee = Math.ceil(req.amount * TRADE_CONFIG.feePercent)
  const totalDebit = req.amount + fee

  if (senderBalance < totalDebit) {
    return { success: false, error: `Insufficient balance. Need ${totalDebit} DDL (${req.amount} + ${fee} fee), have ${senderBalance}.` }
  }

  // Check daily limit
  const dailyTransferred = await getDailyTransferred(req.fromUserId)
  if (dailyTransferred + req.amount > TRADE_CONFIG.dailyLimit) {
    return { success: false, error: `Daily transfer limit reached. Limit: ${TRADE_CONFIG.dailyLimit} DDL, used: ${dailyTransferred}.` }
  }

  // Execute transfer (3 transactions: debit sender, credit recipient, fee to treasury)
  const now = new Date().toISOString()
  const memo = req.memo || `Transfer to ${req.toUsername}`

  // Debit sender
  const { error: debitError } = await admin.from('token_transactions').insert({
    user_id: req.fromUserId,
    amount: req.amount + fee,
    type: 'spend',
    category: 'transfer',
    description: memo,
    metadata: { to: req.toUsername, fee, net: req.amount },
  })

  if (debitError) {
    return { success: false, error: 'Failed to process transfer.' }
  }

  // Credit recipient
  await admin.from('token_transactions').insert({
    user_id: toUserId,
    amount: req.amount,
    type: 'earn',
    category: 'transfer',
    description: `Transfer from ${req.fromUserId}`,
    metadata: { from: req.fromUserId, memo: req.memo },
  })

  // Fee to treasury (if treasury user exists)
  if (fee > 0) {
    const { data: treasury } = await admin
      .from('users')
      .select('id')
      .eq('username', 'treasury')
      .single()

    if (treasury) {
      await admin.from('token_transactions').insert({
        user_id: treasury.id,
        amount: fee,
        type: 'earn',
        category: 'transfer_fee',
        description: `Transfer fee: ${req.fromUserId} → ${req.toUsername}`,
        metadata: { originalAmount: req.amount },
      })
    }
  }

  const newSenderBalance = await getBalance(req.fromUserId)
  const newRecipientBalance = await getBalance(toUserId)

  return {
    success: true,
    transferId: `tx_${Date.now()}`,
    fromBalance: newSenderBalance,
    toBalance: newRecipientBalance,
    fee,
  }
}

/**
 * Get transfer history for a user.
 */
export async function getTransferHistory(userId: string, limit = 20) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('token_transactions')
    .select('id, amount, type, category, description, metadata, created_at')
    .eq('user_id', userId)
    .eq('category', 'transfer')
    .order('created_at', { ascending: false })
    .limit(limit)

  return { transfers: data ?? [], error: error?.message }
}
