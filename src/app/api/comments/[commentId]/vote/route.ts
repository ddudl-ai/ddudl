import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { voteType } = await request.json() // 'up' | 'down' | 'remove'
    const { commentId } = await params

    if (!voteType || !['up', 'down', 'remove'].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // 기존 투표 확인
    const { data: existingVote } = await adminSupabase
      .from('comment_votes')
      .select('vote_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single()

    let deltaUpvotes = 0
    let deltaDownvotes = 0

    if (voteType === 'remove') {
      // 투표 제거
      if (existingVote) {
        await adminSupabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)

        if (existingVote.vote_type === 'up') {
          deltaUpvotes = -1
        } else if (existingVote.vote_type === 'down') {
          deltaDownvotes = -1
        }
      }
    } else {
      // 투표 추가/변경
      if (existingVote) {
        // 기존 투표가 있으면 변경
        if (existingVote.vote_type === voteType) {
          // 같은 투표면 제거
          await adminSupabase
            .from('comment_votes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id)

          if (voteType === 'up') {
            deltaUpvotes = -1
          } else {
            deltaDownvotes = -1
          }
        } else {
          // 다른 투표면 변경
          await adminSupabase
            .from('comment_votes')
            .update({ vote_type: voteType, updated_at: new Date().toISOString() })
            .eq('comment_id', commentId)
            .eq('user_id', user.id)

          if (existingVote.vote_type === 'up' && voteType === 'down') {
            deltaUpvotes = -1
            deltaDownvotes = 1
          } else if (existingVote.vote_type === 'down' && voteType === 'up') {
            deltaDownvotes = -1
            deltaUpvotes = 1
          }
        }
      } else {
        // 새 투표 추가
        await adminSupabase
          .from('comment_votes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            vote_type: voteType
          })

        if (voteType === 'up') {
          deltaUpvotes = 1
        } else {
          deltaDownvotes = 1
        }
      }
    }

    // comment의 투표 수 업데이트
    if (deltaUpvotes !== 0 || deltaDownvotes !== 0) {
      const { data: currentComment } = await adminSupabase
        .from('comments')
        .select('upvotes, downvotes, author_id')
        .eq('id', commentId)
        .single()

      if (currentComment) {
        await adminSupabase
          .from('comments')
          .update({
            upvotes: Math.max(0, currentComment.upvotes + deltaUpvotes),
            downvotes: Math.max(0, currentComment.downvotes + deltaDownvotes),
            updated_at: new Date().toISOString()
          })
          .eq('id', commentId)

        // Award tokens to comment author for votes received
        if (currentComment.author_id) {
          try {
            if (deltaUpvotes > 0) {
              // Upvote received
              const { data: upvoteSetting } = await adminSupabase
                .from('token_settings')
                .select('amount')
                .eq('action_type', 'upvote_received')
                .eq('is_active', true)
                .single()
              
              if (upvoteSetting) {
                await adminSupabase.from('token_transactions').insert({
                  user_id: currentComment.author_id,
                  amount: upvoteSetting.amount,
                  type: 'earn',
                  category: 'upvote_received',
                  description: 'Upvote received'
                })
                
                const { data: authorUser } = await adminSupabase.from('users').select('karma_points').eq('id', currentComment.author_id).single()
                if (authorUser) {
                  await adminSupabase.from('users').update({ 
                    karma_points: (authorUser.karma_points || 0) + upvoteSetting.amount 
                  }).eq('id', currentComment.author_id)
                }
              }
            } else if (deltaDownvotes > 0) {
              // Downvote received
              const { data: downvoteSetting } = await adminSupabase
                .from('token_settings')
                .select('amount')
                .eq('action_type', 'downvote_received')
                .eq('is_active', true)
                .single()
              
              if (downvoteSetting) {
                await adminSupabase.from('token_transactions').insert({
                  user_id: currentComment.author_id,
                  amount: downvoteSetting.amount,
                  type: 'earn',
                  category: 'downvote_received',
                  description: 'Downvote received'
                })
                
                const { data: authorUser } = await adminSupabase.from('users').select('karma_points').eq('id', currentComment.author_id).single()
                if (authorUser) {
                  await adminSupabase.from('users').update({ 
                    karma_points: (authorUser.karma_points || 0) + downvoteSetting.amount 
                  }).eq('id', currentComment.author_id)
                }
              }
            }
          } catch (tokenError) {
            console.error('Token earn failed for comment vote:', tokenError)
            // Don't fail vote if token earning fails
          }
        }
      }
    }

    // 업데이트된 comment 정보 반환
    const { data: updatedComment } = await adminSupabase
      .from('comments')
      .select('upvotes, downvotes')
      .eq('id', commentId)
      .single()

    // 현재 user의 투표 상태 조회
    const { data: currentVote } = await adminSupabase
      .from('comment_votes')
      .select('vote_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      upvotes: updatedComment?.upvotes || 0,
      downvotes: updatedComment?.downvotes || 0,
      userVote: currentVote?.vote_type || null
    })

  } catch (error) {
    console.error('Comment vote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const adminSupabase = createAdminClient()

    // comment 투표 정보 조회
    const { data: comment } = await adminSupabase
      .from('comments')
      .select('upvotes, downvotes')
      .eq('id', commentId)
      .single()

    let userVote = null
    if (user) {
      const { data: vote } = await adminSupabase
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single()

      userVote = vote?.vote_type || null
    }

    return NextResponse.json({
      upvotes: comment?.upvotes || 0,
      downvotes: comment?.downvotes || 0,
      userVote
    })

  } catch (error) {
    console.error('Get comment vote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}