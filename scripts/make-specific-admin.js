// 특정 이메일 사용자를 관리자로 설정하는 스크립트
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function makeSpecificUserAdmin(targetEmail) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log(`🔍 ${targetEmail} 사용자 찾는 중...`)

    // 이메일 해시로 사용자 찾기
    const crypto = require('crypto')
    const emailHash = crypto.createHash('sha256').update(targetEmail.toLowerCase()).digest('hex')

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email_hash', emailHash)

    if (error) {
      console.error('❌ 사용자 조회 오류:', error)
      return
    }

    if (!users || users.length === 0) {
      console.log(`❌ ${targetEmail} 사용자를 찾을 수 없습니다.`)
      console.log('💡 먼저 해당 이메일로 회원가입을 해주세요.')
      return
    }

    const targetUser = users[0]
    
    if (targetUser.role === 'admin' || targetUser.is_admin) {
      console.log(`✅ ${targetUser.username}님은 이미 관리자입니다.`)
      return
    }

    console.log(`👤 사용자 찾음: ${targetUser.username} (생성일: ${targetUser.created_at})`)

    // 관리자로 설정
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: 'admin',
        is_admin: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUser.id)

    if (updateError) {
      console.error('❌ 관리자 설정 오류:', updateError)
      return
    }

    console.log(`🎉 ${targetUser.username}님을 관리자로 설정했습니다!`)
    console.log(`📧 이메일: ${targetEmail}`)
    console.log('🔄 이제 로그아웃 후 다시 로그인하면 관리자 메뉴가 나타납니다.')
    console.log('🔗 관리자 페이지: http://localhost:3000/admin')

  } catch (error) {
    console.error('❌ 오류 발생:', error)
  }
}

// 스크립트 실행
const targetEmail = process.argv[2] || 'kimjuik@gmail.com'
makeSpecificUserAdmin(targetEmail)