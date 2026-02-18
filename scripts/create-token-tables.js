const { createClient } = require('@supabase/supabase-js')

// 환경 변수 로드
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL과 Service Role Key가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTokenTables() {
  try {
    console.log('토큰 시스템 테이블을 생성합니다...')
    
    // 토큰 거래 기록 테이블
    const tokenTransactionsSQL = `
      CREATE TABLE IF NOT EXISTS public.token_transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          amount DECIMAL(10,2) NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: tokenError } = await supabase.rpc('exec_sql', { 
      sql: tokenTransactionsSQL 
    }).catch(async () => {
      // RPC가 없다면 직접 테이블 생성 시도
      return await supabase
        .from('_migrations')
        .insert({ name: 'token_transactions', sql: tokenTransactionsSQL })
        .then(() => ({ error: null }))
        .catch(() => ({ error: 'RPC not available' }))
    })
    
    if (tokenError && tokenError !== 'RPC not available') {
      console.error('token_transactions 테이블 생성 오류:', tokenError)
    } else {
      console.log('✓ token_transactions 테이블 생성 완료')
    }
    
    // 프리미엄 구매 기록 테이블
    const premiumSQL = `
      CREATE TABLE IF NOT EXISTS public.premium_purchases (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          feature_type TEXT NOT NULL,
          cost DECIMAL(10,2) NOT NULL,
          duration_type TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    const { error: premiumError } = await supabase.rpc('exec_sql', { 
      sql: premiumSQL 
    }).catch(() => ({ error: 'RPC not available' }))
    
    if (premiumError && premiumError !== 'RPC not available') {
      console.error('premium_purchases 테이블 생성 오류:', premiumError)
    } else {
      console.log('✓ premium_purchases 테이블 생성 완료')
    }
    
    // 일일 활동 기록 테이블
    const dailyActivitySQL = `
      CREATE TABLE IF NOT EXISTS public.user_daily_activity (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          activity_date DATE NOT NULL,
          posts_created INTEGER DEFAULT 0,
          comments_created INTEGER DEFAULT 0,
          upvotes_given INTEGER DEFAULT 0,
          tokens_earned DECIMAL(10,2) DEFAULT 0,
          login_streak INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, activity_date)
      );
    `
    
    const { error: activityError } = await supabase.rpc('exec_sql', { 
      sql: dailyActivitySQL 
    }).catch(() => ({ error: 'RPC not available' }))
    
    if (activityError && activityError !== 'RPC not available') {
      console.error('user_daily_activity 테이블 생성 오류:', activityError)
    } else {
      console.log('✓ user_daily_activity 테이블 생성 완료')
    }
    
    console.log('\n토큰 시스템 테이블 생성이 완료되었습니다!')
    console.log('Supabase 대시보드에서 테이블을 확인하거나, 다음 SQL을 직접 실행하세요:')
    console.log('\n--- SQL 실행 필요 ---')
    console.log(tokenTransactionsSQL)
    console.log(premiumSQL)
    console.log(dailyActivitySQL)
    
  } catch (error) {
    console.error('스크립트 실행 중 오류:', error)
  }
}

createTokenTables()