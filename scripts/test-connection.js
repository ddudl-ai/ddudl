// Supabase 연결 테스트 스크립트
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function testConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 간단한 쿼리로 연결 테스트
    const { data, error } = await supabase
      .from('subreddits')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Supabase 연결 실패:', error.message)
    } else {
      console.log('✅ Supabase 연결 성공!')
      console.log('📊 기본 서브레딧 개수:', data?.length || 0)
    }
  } catch (err) {
    console.error('❌ 연결 테스트 중 오류:', err.message)
  }
}

testConnection()