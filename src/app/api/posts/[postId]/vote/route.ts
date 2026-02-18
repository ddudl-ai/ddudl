import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Agent authentication helper
async function authenticateAgent(request: NextRequest) {
  const agentKey = request.headers.get('x-agent-key')
  const agentToken = request.headers.get('x-agent-token')
  
  if (!agentKey || !agentToken) {
    return null // Not an agent request
  }

  const supabase = createAdminClient()

  // API 키 검증
  const { data: agentKeyData, error: keyError } = await supabase
    .from('agent_keys')
    .select('id, username, is_active')
    .eq('api_key', agentKey)
    .eq('is_active', true)
    .single()

  if (keyError || !agentKeyData) {
    throw new Error('Invalid or inactive API key')
  }

  // 토큰 검증 (일회용이고 미사용이어야 함)
  const { data: tokenData, error: tokenError } = await supabase
    .from('agent_tokens')
    .select('*')
    .eq('token', agentToken)
    .eq('agent_key_id', agentKeyData.id)
    .eq('used', false)
    .single()

  if (tokenError || !tokenData) {
    throw new Error('Invalid or already used token')
  }

  // 토큰 만료 확인
  if (new Date() > new Date(tokenData.expires_at)) {
    throw new Error('Token expired')
  }

  // 토큰 사용 처리
  await supabase
    .from('agent_tokens')
    .update({ used: true })
    .eq('id', tokenData.id)

  // 마지막 사용 시간 업데이트
  await supabase
    .from('agent_keys')
    .update({ 
      last_used_at: new Date().toISOString()
    })
    .eq('id', agentKeyData.id)

  return {
    agentId: agentKeyData.id,
    username: agentKeyData.username
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { voteType } = await request.json() // 'up' | 'down' | 'remove'
    const { postId } = await params

    if (!voteType || !['up', 'down', 'remove'].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
    }

    // Agent authentication check
    let userId = null
    let isAgentRequest = false
    let agentData = null
    
    try {
      agentData = await authenticateAgent(request)
      if (agentData) {
        isAgentRequest = true
        
        // 에이전트의 실제 user ID 가져오기
        const adminSupabase = createAdminClient()
        const { data: agentUser, error: userError } = await adminSupabase
          .from('users')
          .select('id')
          .eq('username', agentData.username)
          .single()

        if (userError || !agentUser) {
          return NextResponse.json({ error: 'Agent user not found' }, { status: 401 })
        }
        
        userId = agentUser.id
      }
    } catch (agentError: any) {
      return NextResponse.json({ error: agentError.message }, { status: 401 })
    }

    // Regular user authentication if not agent
    if (!isAgentRequest) {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      
      userId = user.id
    }

    const adminSupabase = createAdminClient()

    // 기존 투표 확인
    const { data: existingVote } = await adminSupabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single()

    let deltaUpvotes = 0
    let deltaDownvotes = 0

    if (voteType === 'remove') {
      // 투표 제거
      if (existingVote) {
        await adminSupabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)

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
            .from('post_votes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId)

          if (voteType === 'up') {
            deltaUpvotes = -1
          } else {
            deltaDownvotes = -1
          }
        } else {
          // 다른 투표면 변경
          await adminSupabase
            .from('post_votes')
            .update({ vote_type: voteType, updated_at: new Date().toISOString() })
            .eq('post_id', postId)
            .eq('user_id', userId)

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
          .from('post_votes')
          .insert({
            post_id: postId,
            user_id: userId,
            vote_type: voteType
          })

        if (voteType === 'up') {
          deltaUpvotes = 1
        } else {
          deltaDownvotes = 1
        }
      }
    }

    // post의 투표 수 업데이트
    if (deltaUpvotes !== 0 || deltaDownvotes !== 0) {
      const { data: currentPost } = await adminSupabase
        .from('posts')
        .select('upvotes, downvotes, author_id')
        .eq('id', postId)
        .single()

      if (currentPost) {
        await adminSupabase
          .from('posts')
          .update({
            upvotes: Math.max(0, currentPost.upvotes + deltaUpvotes),
            downvotes: Math.max(0, currentPost.downvotes + deltaDownvotes),
            updated_at: new Date().toISOString()
          })
          .eq('id', postId)

        // Award tokens to post author for votes received
        if (currentPost.author_id) {
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
                  user_id: currentPost.author_id,
                  amount: upvoteSetting.amount,
                  type: 'earn',
                  category: 'upvote_received',
                  description: 'Upvote received'
                })
                
                const { data: authorUser } = await adminSupabase.from('users').select('karma_points').eq('id', currentPost.author_id).single()
                if (authorUser) {
                  await adminSupabase.from('users').update({ 
                    karma_points: (authorUser.karma_points || 0) + upvoteSetting.amount 
                  }).eq('id', currentPost.author_id)
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
                  user_id: currentPost.author_id,
                  amount: downvoteSetting.amount,
                  type: 'earn',
                  category: 'downvote_received',
                  description: 'Downvote received'
                })
                
                const { data: authorUser } = await adminSupabase.from('users').select('karma_points').eq('id', currentPost.author_id).single()
                if (authorUser) {
                  await adminSupabase.from('users').update({ 
                    karma_points: (authorUser.karma_points || 0) + downvoteSetting.amount 
                  }).eq('id', currentPost.author_id)
                }
              }
            }
          } catch (tokenError) {
            console.error('Token earn failed for vote:', tokenError)
            // Don't fail vote if token earning fails
          }
        }
      }
    }

    // 업데이트된 post 정보 반환
    const { data: updatedPost } = await adminSupabase
      .from('posts')
      .select('upvotes, downvotes')
      .eq('id', postId)
      .single()

    // 현재 user의 투표 상태 조회
    const { data: currentVote } = await adminSupabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single()

    return NextResponse.json({
      success: true,
      upvotes: updatedPost?.upvotes || 0,
      downvotes: updatedPost?.downvotes || 0,
      userVote: currentVote?.vote_type || null
    })

  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    // Agent authentication check (for GET, agent auth is optional)
    let userId = null
    let isAgentRequest = false
    let agentData = null
    
    try {
      agentData = await authenticateAgent(request)
      if (agentData) {
        isAgentRequest = true
        
        // 에이전트의 실제 user ID 가져오기
        const adminSupabase = createAdminClient()
        const { data: agentUser, error: userError } = await adminSupabase
          .from('users')
          .select('id')
          .eq('username', agentData.username)
          .single()

        if (!userError && agentUser) {
          userId = agentUser.id
        }
      }
    } catch (agentError) {
      // For GET requests, ignore agent auth errors and fall back to regular auth
    }

    // Regular user authentication if not agent
    if (!isAgentRequest) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    const adminSupabase = createAdminClient()

    // post 투표 정보 조회
    const { data: post } = await adminSupabase
      .from('posts')
      .select('upvotes, downvotes')
      .eq('id', postId)
      .single()

    let userVote = null
    if (userId) {
      const { data: vote } = await adminSupabase
        .from('post_votes')
        .select('vote_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single()

      userVote = vote?.vote_type || null
    }

    return NextResponse.json({
      upvotes: post?.upvotes || 0,
      downvotes: post?.downvotes || 0,
      userVote
    })

  } catch (error) {
    console.error('Get vote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}