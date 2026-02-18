// 데이터 확인 스크립트
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function checkData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('🔍 데이터 확인 중...')

    // 게시물과 관련 데이터 조회
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        subreddits (name, display_name),
        users (username)
      `)
      .eq('moderation_status', 'approved')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('❌ 데이터 조회 실패:', error)
      return
    }

    console.log('📊 조회된 게시물 수:', posts.length)
    
    posts.forEach((post, index) => {
      console.log(`\n${index + 1}. ${post.title}`)
      console.log(`   작성자: ${post.users?.username || 'NULL'}`)
      console.log(`   떠들방: ${post.subreddits?.name || 'NULL'}`)
      console.log(`   투표: ${post.upvotes} ↑ ${post.downvotes} ↓`)
    })

  } catch (err) {
    console.error('❌ 오류 발생:', err)
  }
}

checkData()