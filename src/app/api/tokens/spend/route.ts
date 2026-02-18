import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { userId, action, targetId, metadata } = await request.json()
    
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // token_settings에서 해당 액션의 설정 가져오기
    const { data: tokenSetting, error: settingError } = await supabase
      .from('token_settings')
      .select('*')
      .eq('action_type', action)
      .eq('category', 'spend')
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

    // 최소 레벨 확인
    if (tokenSetting.min_user_level > 0 && user.level < tokenSetting.min_user_level) {
      return NextResponse.json({ 
        error: 'Level requirement not met',
        message: `이 기능을 사용하려면 레벨 ${tokenSetting.min_user_level} 이상이어야 합니다.`
      }, { status: 403 })
    }

    // token 잔액 확인
    if (user.karma_points < tokenSetting.amount) {
      return NextResponse.json({ 
        error: 'Insufficient tokens',
        message: `token이 부족합니다. 필요: ${tokenSetting.amount}, 보유: ${user.karma_points}`
      }, { status: 400 })
    }

    // 재사용 대기시간 확인
    if (tokenSetting.cooldown_minutes > 0) {
      const cooldownTime = new Date(Date.now() - tokenSetting.cooldown_minutes * 60000).toISOString()
      
      const { count } = await supabase
        .from('token_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('category', action)
        .eq('type', 'spend')
        .gte('created_at', cooldownTime)

      if (count && count > 0) {
        return NextResponse.json({ 
          error: 'Action on cooldown',
          message: `${tokenSetting.cooldown_minutes}분 후에 다시 사용할 수 있습니다.`
        }, { status: 400 })
      }
    }

    // token 거래 기록
    const { data: transaction, error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: tokenSetting.amount,
        type: 'spend',
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

    // 액션별 처리
    let result = null
    
    if (action.startsWith('post_boost_')) {
      // post 부스트 처리
      const duration = action.replace('post_boost_', '')
      const hours = duration === '1h' ? 1 : duration === '6h' ? 6 : 24
      
      const { data: boost, error: boostError } = await supabase
        .from('post_boosts')
        .insert({
          post_id: targetId,
          user_id: userId,
          boost_type: 'paid',
          duration_hours: hours,
          token_cost: tokenSetting.amount,
          expires_at: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (boostError) {
        // 트랜잭션 롤백
        await supabase
          .from('token_transactions')
          .delete()
          .eq('id', transaction.id)
        
        console.error('Boost error:', boostError)
        return NextResponse.json({ error: 'Failed to apply boost' }, { status: 500 })
      }
      
      result = boost
    } else if (action.startsWith('premium_badge_')) {
      // 프리미엄 배지 처리
      const duration = action.replace('premium_badge_', '')
      const days = duration === '7d' ? 7 : 30
      
      const { data: purchase, error: purchaseError } = await supabase
        .from('premium_purchases')
        .insert({
          user_id: userId,
          feature_type: 'premium_badge',
          duration_days: days,
          token_cost: tokenSetting.amount,
          expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (purchaseError) {
        // 트랜잭션 롤백
        await supabase
          .from('token_transactions')
          .delete()
          .eq('id', transaction.id)
        
        console.error('Purchase error:', purchaseError)
        return NextResponse.json({ error: 'Failed to purchase premium badge' }, { status: 500 })
      }
      
      result = purchase
    } else if (action === 'highlight_comment') {
      // comment 강조 처리
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .update({
          is_highlighted: true,
          highlighted_at: new Date().toISOString(),
          highlight_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', targetId)
        .eq('author_id', userId)
        .select()
        .single()

      if (commentError) {
        // 트랜잭션 롤백
        await supabase
          .from('token_transactions')
          .delete()
          .eq('id', transaction.id)
        
        console.error('Comment error:', commentError)
        return NextResponse.json({ error: 'Failed to highlight comment' }, { status: 500 })
      }
      
      result = comment
    }

    // 트리거가 자동으로 user karma_points 업데이트
    // 업데이트된 user 정보 조회
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .select('karma_points')
      .eq('id', userId)
      .single()

    if (updateError || !updatedUser) {
      console.error('User fetch error:', updateError)
      return NextResponse.json({ error: 'Failed to fetch updated balance' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transaction,
      newBalance: updatedUser.karma_points,
      spent: tokenSetting.amount,
      result
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // user의 token 잔액 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('karma_points')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 사용 가능한 액션 목록 조회
    const { data: spendActions, error: actionsError } = await supabase
      .from('token_settings')
      .select('*')
      .eq('category', 'spend')
      .eq('is_active', true)
      .order('amount', { ascending: true })

    if (actionsError) {
      console.error('Actions fetch error:', actionsError)
      return NextResponse.json({ error: 'Failed to fetch spend actions' }, { status: 500 })
    }

    return NextResponse.json({
      balance: user.karma_points,
      availableActions: spendActions
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}