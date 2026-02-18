import { createAdminClient } from '@/lib/supabase/admin'
import { TOKEN_CONFIG } from '@/lib/constants'

export async function awardTokens(userId: string, action: string, metadata: any = {}) {
  const supabase = createAdminClient()

  try {
    // token_settings에서 해당 액션의 설정 가져오기
    const { data: tokenSetting, error: settingError } = await supabase
      .from('token_settings')
      .select('*')
      .eq('action_type', action)
      .eq('category', 'earn')
      .eq('is_active', true)
      .single()

    // Fallback: if no active row, we still allow rewards using TOKEN_CONFIG
    if (settingError || !tokenSetting) {
    }

    // user 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    // 일일 제한 확인 (설정이 있는 경우에만)
    if (tokenSetting?.daily_limit) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const startOfDay = new Date(today).toISOString()
        
        const { count } = await supabase
          .from('token_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('category', action)
          .gte('created_at', startOfDay)

        if (count && count >= tokenSetting.daily_limit) {
          return { 
            success: false, 
            error: 'Daily limit exceeded',
            message: `일일 제한 ${tokenSetting.daily_limit}회를 초과했습니다.`
          }
        }
      } catch (dailyCheckError) {
      }
    }

    // 보상 금액: token_settings 우선, 없으면 TOKEN_CONFIG.rewards fallback
    let rewardAmount = Number(tokenSetting?.amount ?? TOKEN_CONFIG.rewards[action as keyof typeof TOKEN_CONFIG.rewards] ?? 0)

    // 마지막 안전장치: 음수/NaN 방지
    if (!Number.isFinite(rewardAmount) || rewardAmount < 0) rewardAmount = 0

    // token 거래 기록 (테이블이 없으면 skip)
    let transaction = null
    const { data: transactionData, error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: rewardAmount,
        type: 'earn',
        category: action,
        description: (tokenSetting?.description || action),
        metadata: metadata || {}
      })
      .select()
      .single()

    if (transactionError) {
      
      // 테이블이 없으면 직접 karma_points 업데이트
      const newKarmaPoints = (user.karma_points || 0) + rewardAmount
      
      const { data: updateData, error: karmaUpdateError } = await supabase
        .from('users')
        .update({ 
          karma_points: newKarmaPoints
        })
        .eq('id', userId)
        .select()
        .single()

      if (karmaUpdateError) {
        console.error('Failed to update karma points directly:', karmaUpdateError)
        return { success: false, error: 'Failed to update karma' }
      } else {
      }
    } else {
      transaction = transactionData
    }

    // 트리거가 자동으로 user karma_points 업데이트 (없으면 아래에서 보정)
    // 업데이트된 user 정보 조회
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .select('karma_points')
      .eq('id', userId)
      .single()

    if (updateError || !updatedUser) {
      console.error('User fetch error:', updateError)
      return { success: false, error: 'Failed to fetch updated balance' }
    }

    // 만약 DB 트리거가 없어 balance가 변하지 않았다면 직접 보정 (경합 최소화를 위해 단순 가산)
    if (rewardAmount > 0 && typeof user.karma_points === 'number' && updatedUser.karma_points === user.karma_points) {
      const manualNew = (user.karma_points || 0) + rewardAmount
      const { error: manualErr } = await supabase
        .from('users')
        .update({ karma_points: manualNew })
        .eq('id', userId)
      if (manualErr) {
        console.error('Manual karma_points correction failed:', manualErr)
      } else {
        updatedUser.karma_points = manualNew as unknown as number
      }
    }


    return {
      success: true,
      transaction,
      newBalance: updatedUser.karma_points,
      reward: rewardAmount
    }

  } catch (error) {
    console.error('Token award error:', error)
    return { success: false, error: 'Internal error' }
  }
}
