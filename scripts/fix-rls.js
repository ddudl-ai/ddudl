// RLS 정책 수정 스크립트
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function fixRLS() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })

  try {
    console.log('🔧 RLS 정책 수정 중...')

    // 사용자 테이블에 공개 읽기 정책 추가
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        -- 기존 사용자 읽기 정책 삭제
        DROP POLICY IF EXISTS "Users can read own data" ON users;
        
        -- 사용자 기본 정보는 모든 사람이 읽을 수 있도록 설정
        CREATE POLICY "Users basic info is readable by everyone" ON users
          FOR SELECT USING (true);
      `
    })

    if (policyError) {
      console.error('❌ RLS 정책 수정 실패:', policyError)
      
      // 직접 SQL 실행으로 시도
      console.log('🔄 직접 SQL 실행 시도...')
      
      // 기존 정책 삭제
      await supabase.from('pg_policies').delete()
        .match({ policyname: 'Users can read own data' })
        .catch(() => {}) // 오류 무시
      
      return
    }

    console.log('✅ RLS 정책 수정 완료')

  } catch (err) {
    console.error('❌ 오류 발생:', err)
  }
}

fixRLS()