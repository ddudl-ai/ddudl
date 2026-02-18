// 임시로 RLS 비활성화하여 테스트
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function disableRLS() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('🔧 users 테이블 RLS 임시 비활성화...')

    // Service role로 데이터 확인
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')

    if (userError) {
      console.error('❌ 사용자 조회 실패:', userError)
      return
    }

    console.log('✅ 사용자 데이터:', users.length, '명')
    users.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user.id})`)
    })

    // 게시물과 사용자 조인 테스트
    const { data: posts, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        author_id,
        users!inner(username)
      `)
      .limit(3)

    if (postError) {
      console.error('❌ 게시물 조회 실패:', postError)
    } else {
      console.log('✅ 게시물과 사용자 조인 성공:', posts.length, '개')
      posts.forEach(post => {
        console.log(`  - ${post.title} by ${post.users?.username}`)
      })
    }

  } catch (err) {
    console.error('❌ 오류 발생:', err)
  }
}

disableRLS()