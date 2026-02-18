// 샘플 데이터 삽입 스크립트
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function insertSampleData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('🔄 샘플 데이터 삽입 시작...')

    // 1. 샘플 사용자 생성
    const { data: users, error: userError } = await supabase
      .from('users')
      .insert([
        {
          username: '뜨들러1',
          email_hash: 'hash1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
          karma_points: 150,
          age_verified: true
        },
        {
          username: '게임마니아',
          email_hash: 'hash2234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
          karma_points: 230,
          age_verified: true
        },
        {
          username: '테크리뷰어',
          email_hash: 'hash3234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
          karma_points: 180,
          age_verified: true
        },
        {
          username: '음식탐험가',
          email_hash: 'hash4234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
          karma_points: 95,
          age_verified: true
        }
      ])
      .select()

    if (userError) {
      console.error('❌ 사용자 생성 실패:', userError)
      return
    }

    console.log('✅ 사용자 생성 완료:', users.length, '명')

    // 2. 서브레딧 가져오기
    const { data: subreddits, error: subredditError } = await supabase
      .from('subreddits')
      .select('*')

    if (subredditError) {
      console.error('❌ 서브레딧 조회 실패:', subredditError)
      return
    }

    console.log('✅ 서브레딧 조회 완료:', subreddits.length, '개')

    // 3. 샘플 게시물 생성
    const samplePosts = [
      {
        title: '떠들 플랫폼에 오신 것을 환영합니다! 🎉',
        content: '새로운 한국형 커뮤니티 플랫폼 떠들에 오신 것을 환영합니다. 여기서는 다양한 주제로 자유롭게 이야기를 나눌 수 있습니다. AI가 도와주는 건전한 토론 문화를 함께 만들어가요!',
        author_id: users[0].id,
        subreddit_id: subreddits.find(s => s.name === 'general').id,
        upvotes: 45,
        downvotes: 2,
        comment_count: 8,
        moderation_status: 'approved',
        flair: '공지'
      },
      {
        title: '2024년 최고의 인디 게임 추천 리스트',
        content: '올해 플레이한 인디 게임 중에서 정말 재미있었던 게임들을 소개합니다.\n\n1. Hades 2 (얼리 액세스)\n2. Pizza Tower\n3. Sea of Stars\n4. Bomb Rush Cyberfunk\n\n각각의 게임에 대한 자세한 리뷰는 댓글로 남겨드릴게요!',
        author_id: users[1].id,
        subreddit_id: subreddits.find(s => s.name === 'gaming').id,
        upvotes: 89,
        downvotes: 5,
        comment_count: 23,
        moderation_status: 'approved',
        flair: '추천'
      },
      {
        title: 'M3 맥북 프로 1년 사용기 - 개발자 관점',
        content: 'M3 맥북 프로를 1년간 사용한 개발자로서의 솔직한 후기를 공유합니다.\n\n**장점:**\n- 배터리 수명이 정말 우수함\n- 컴파일 속도가 빨라짐\n- 발열이 거의 없음\n\n**단점:**\n- 일부 개발 도구 호환성 이슈\n- 포트가 부족함\n\n전반적으로는 매우 만족스럽습니다.',
        author_id: users[2].id,
        subreddit_id: subreddits.find(s => s.name === 'tech').id,
        upvotes: 156,
        downvotes: 12,
        comment_count: 34,
        moderation_status: 'approved',
        flair: '리뷰'
      },
      {
        title: '서울 강남역 근처 맛집 추천 받습니다',
        content: '내일 친구들과 강남역에서 만날 예정인데, 괜찮은 맛집 추천해주실 수 있나요? 가격대는 1인당 2-3만원 정도로 생각하고 있습니다.\n\n한식, 일식, 양식 모두 괜찮고, 분위기 좋은 곳이면 더욱 좋겠어요!',
        author_id: users[3].id,
        subreddit_id: subreddits.find(s => s.name === 'food').id,
        upvotes: 34,
        downvotes: 1,
        comment_count: 17,
        moderation_status: 'approved',
        flair: '질문'
      },
      {
        title: 'ChatGPT vs Claude vs Gemini 비교 분석',
        content: '최근 각 AI 모델들을 비교해보고 있는데, 각각의 특징을 정리해봤습니다.\n\n**ChatGPT-4:**\n- 범용성이 뛰어남\n- 플러그인 생태계 풍부\n\n**Claude:**\n- 긴 텍스트 처리 우수\n- 한국어 이해도 높음\n\n**Gemini:**\n- 구글 서비스 연동 좋음\n- 실시간 정보 검색 가능\n\n여러분들은 어떤 것을 주로 사용하시나요?',
        author_id: users[2].id,
        subreddit_id: subreddits.find(s => s.name === 'tech').id,
        upvotes: 78,
        downvotes: 8,
        comment_count: 29,
        moderation_status: 'approved',
        flair: '토론'
      },
      {
        title: 'AI가 생성한 첫 번째 게시물입니다',
        content: '안녕하세요! 저는 떠들 플랫폼의 AI 어시스턴트입니다. 이 게시물은 자동으로 생성된 콘텐츠의 예시입니다.\n\n커뮤니티가 활성화될 수 있도록 다양한 주제의 토론거리를 제공하고, 건전한 토론 문화를 만들어가는 것이 제 역할입니다.\n\n궁금한 점이 있으시면 언제든 말씀해주세요!',
        author_id: users[0].id,
        subreddit_id: subreddits.find(s => s.name === 'general').id,
        upvotes: 23,
        downvotes: 3,
        comment_count: 11,
        moderation_status: 'approved',
        ai_generated: true,
        flair: 'AI 생성'
      }
    ]

    const { data: posts, error: postError } = await supabase
      .from('posts')
      .insert(samplePosts)
      .select()

    if (postError) {
      console.error('❌ 게시물 생성 실패:', postError)
      return
    }

    console.log('✅ 게시물 생성 완료:', posts.length, '개')

    // 4. 샘플 댓글 생성
    const sampleComments = [
      {
        content: '와! 정말 좋은 플랫폼이네요. 잘 이용하겠습니다!',
        author_id: users[1].id,
        post_id: posts[0].id,
        upvotes: 12,
        downvotes: 0
      },
      {
        content: 'AI 모더레이션이 어떻게 작동하는지 궁금해요.',
        author_id: users[2].id,
        post_id: posts[0].id,
        upvotes: 8,
        downvotes: 1
      },
      {
        content: 'Pizza Tower 정말 재밌더라고요! 완전 추천합니다.',
        author_id: users[0].id,
        post_id: posts[1].id,
        upvotes: 15,
        downvotes: 0
      },
      {
        content: 'Hades 2는 아직 얼리 액세스라서 좀 기다려보는 중이에요.',
        author_id: users[3].id,
        post_id: posts[1].id,
        upvotes: 7,
        downvotes: 2
      },
      {
        content: '저도 M1에서 M3로 업그레이드 고려 중인데 도움이 되네요!',
        author_id: users[1].id,
        post_id: posts[2].id,
        upvotes: 9,
        downvotes: 0
      },
      {
        content: '강남역 근처 "미쁘다 초밥" 추천드려요. 가성비 좋습니다.',
        author_id: users[0].id,
        post_id: posts[3].id,
        upvotes: 6,
        downvotes: 0
      }
    ]

    const { data: comments, error: commentError } = await supabase
      .from('comments')
      .insert(sampleComments)
      .select()

    if (commentError) {
      console.error('❌ 댓글 생성 실패:', commentError)
      return
    }

    console.log('✅ 댓글 생성 완료:', comments.length, '개')

    console.log('🎉 샘플 데이터 삽입 완료!')
    console.log('📊 생성된 데이터:')
    console.log(`   - 사용자: ${users.length}명`)
    console.log(`   - 게시물: ${posts.length}개`)
    console.log(`   - 댓글: ${comments.length}개`)

  } catch (err) {
    console.error('❌ 오류 발생:', err)
  }
}

insertSampleData()