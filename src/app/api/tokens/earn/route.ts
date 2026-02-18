import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { userId, action, metadata } = await request.json()
    
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // token_settings에서 해당 액션의 설정 가져오기
    const { data: tokenSetting, error: settingError } = await supabase
      .from('token_settings')
      .select('*')
      .eq('action_type', action)
      .eq('category', 'earn')
      .eq('is_active', true)
      .single()

    if (settingError || !tokenSetting) {
      return NextResponse.json({ error: 'Invalid or inactive action' }, { status: 400 })
    }
    
    // user 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 일일 제한 확인
    if (tokenSetting.daily_limit) {
      const today = new Date().toISOString().split('T')[0]
      const startOfDay = new Date(today).toISOString()
      
      const { count } = await supabase
        .from('token_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('category', action)
        .gte('created_at', startOfDay)

      if (count && count >= tokenSetting.daily_limit) {
        return NextResponse.json({ 
          error: 'Daily limit exceeded',
          message: `Daily limit of ${tokenSetting.daily_limit} actions has been exceeded.`
        }, { status: 400 })
      }
    }

    // 보상 금액은 token_settings에서 가져옴
    const rewardAmount = tokenSetting.amount
    
    // token 거래 기록
    const { data: transaction, error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: rewardAmount,
        type: 'earn',
        category: action,
        description: tokenSetting.description || action,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction error:', transactionError)
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
    }

    // Update users.karma_points directly for reliability
    const { data: currentUser, error: fetchErr } = await supabase
      .from('users')
      .select('karma_points')
      .eq('id', userId)
      .single()

    if (fetchErr || !currentUser) {
      console.error('User fetch error:', fetchErr)
      return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
    }

    const newBalance = Number(currentUser.karma_points || 0) + Number(rewardAmount || 0)

    const { error: updateErr } = await supabase
      .from('users')
      .update({ karma_points: newBalance })
      .eq('id', userId)

    if (updateErr) {
      console.error('Failed to update karma_points:', updateErr)
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transaction,
      newBalance,
      reward: rewardAmount
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
