import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { postId, channelName, postTitle, postContent } = await request.json()
    
    if (!postId || !channelName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }


    // 간단한 AI 반응 로직 (실제로는 더 복잡한 AI 분석을 수행)
    const shouldReact = Math.random() > 0.3 // 70% 확률로 반응
    
    if (!shouldReact) {
      return NextResponse.json({ 
        success: true, 
        action: 'no_reaction',
        message: 'AI decided not to react'
      })
    }

    // AI 반응 유형 결정
    const reactionTypes = ['comment', 'vote']
    const reactionType = reactionTypes[Math.floor(Math.random() * reactionTypes.length)]
    
    const supabase = createAdminClient()
    
    // AI 봇 user 가져오기 또는 생성
    let { data: aiBot } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'ai-bot')
      .single()

    if (!aiBot) {
      const { data: newBot, error: botError } = await supabase
        .from('users')
        .insert({
          username: 'ai-bot',
          email_hash: 'ai-bot-hash-' + Date.now(),
          karma_points: 1000,
          age_verified: true
        })
        .select('id')
        .single()

      if (botError) {
        console.error('Failed to create AI bot:', botError)
        return NextResponse.json({ error: 'Failed to create AI bot' }, { status: 500 })
      }
      
      aiBot = newBot
    }

    if (reactionType === 'vote') {
      // AI가 투표하기 (긍정적인 투표 확률 높게)
      const voteType = Math.random() > 0.2 ? 'upvote' : 'downvote'
      
      // 기존 투표 확인
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('user_id', aiBot.id)
        .eq('post_id', postId)
        .single()

      if (!existingVote) {
        const { error: voteError } = await supabase
          .from('votes')
          .insert({
            user_id: aiBot.id,
            post_id: postId,
            vote_type: voteType
          })

        if (voteError) {
          console.error('AI vote error:', voteError)
        } else {
          // post 투표 수 업데이트
          const updateField = voteType === 'upvote' ? 'upvotes' : 'downvotes'
          await supabase
            .from('posts')
            .update({
              [updateField]: supabase.rpc('increment_by_one')
            })
            .eq('id', postId)

        }
      }
    } else if (reactionType === 'comment') {
      // AI가 comment 작성하기
      const comments = [
        "흥미로운 주제네요! 더 자세히 알고 싶습니다.",
        "좋은 내용 감사합니다. 도움이 되었어요.",
        "다른 관점에서 보면 어떨까요?",
        "관련해서 추가 정보가 있다면 공유해주세요!",
        "의견에 공감합니다. 비슷한 경험이 있어요.",
        "정말 유용한 정보네요. 북마크해둘게요.",
        "이 주제에 대해 더 논의해봐도 좋을 것 같아요.",
      ]
      
      const randomComment = comments[Math.floor(Math.random() * comments.length)]
      
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          content: randomComment,
          author_id: aiBot.id,
          post_id: postId,
          ai_generated: true,
          moderation_status: 'approved'
        })

      if (commentError) {
        console.error('AI comment error:', commentError)
      } else {
        // comment 수 업데이트
        await supabase
          .from('posts')
          .update({
            comment_count: supabase.rpc('increment_by_one')
          })
          .eq('id', postId)

      }
    }

    return NextResponse.json({ 
      success: true, 
      action: reactionType,
      message: `AI ${reactionType} completed for post ${postId}`
    })

  } catch (error) {
    console.error('AI auto-reaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}