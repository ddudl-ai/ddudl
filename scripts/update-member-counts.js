const { createClient } = require('@supabase/supabase-js')

// 환경 변수 로드
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL과 Service Role Key가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateMemberCounts() {
  try {
    console.log('서브레딧 멤버 수 업데이트를 시작합니다...')
    
    // 모든 서브레딧 가져오기
    const { data: subreddits, error: subredditsError } = await supabase
      .from('subreddits')
      .select('id, name')

    if (subredditsError) {
      console.error('서브레딧 조회 오류:', subredditsError)
      return
    }

    // 각 서브레딧별로 게시물 작성자 수 계산
    for (const subreddit of subreddits) {
      // 해당 서브레딧에 게시물을 작성한 고유 사용자 수 계산
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('author_id')
        .eq('subreddit_id', subreddit.id)

      if (postsError) {
        console.error(`${subreddit.name} 게시물 조회 오류:`, postsError)
        continue
      }

      // 고유 작성자 수 계산
      const uniqueAuthors = new Set(posts.map(p => p.author_id))
      const memberCount = uniqueAuthors.size

      // 멤버 수 업데이트
      const { error: updateError } = await supabase
        .from('subreddits')
        .update({ member_count: memberCount })
        .eq('id', subreddit.id)

      if (updateError) {
        console.error(`${subreddit.name} 업데이트 오류:`, updateError)
      } else {
        console.log(`✓ ${subreddit.name}: ${memberCount}명으로 업데이트`)
      }
    }

    console.log('멤버 수 업데이트가 완료되었습니다!')

  } catch (error) {
    console.error('스크립트 실행 중 오류:', error)
  }
}

updateMemberCounts()