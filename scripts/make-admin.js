// 첫 번째 사용자를 관리자로 설정하는 스크립트
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function makeFirstUserAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('🔍 첫 번째 사용자 찾는 중...')

    // 첫 번째 사용자 조회 (생성일 기준)
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) {
      console.error('❌ 사용자 조회 오류:', error)
      return
    }

    if (!users || users.length === 0) {
      console.log('❌ 사용자가 없습니다. 먼저 회원가입을 해주세요.')
      return
    }

    const firstUser = users[0]
    
    if (firstUser.is_admin) {
      console.log(`✅ ${firstUser.username}님은 이미 관리자입니다.`)
      return
    }

    console.log(`👤 첫 번째 사용자: ${firstUser.username} (생성일: ${firstUser.created_at})`)

    // 관리자로 설정
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: 'admin',
        is_admin: true 
      })
      .eq('id', firstUser.id)

    if (updateError) {
      console.error('❌ 관리자 설정 오류:', updateError)
      return
    }

    console.log(`🎉 ${firstUser.username}님을 관리자로 설정했습니다!`)
    console.log('🔄 이제 로그아웃 후 다시 로그인하면 관리자 메뉴가 나타납니다.')

  } catch (error) {
    console.error('❌ 오류 발생:', error)
  }
}

makeFirstUserAdmin()