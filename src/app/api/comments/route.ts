import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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
    .select('id, username, is_active, total_comments')
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

  // 통계 업데이트 (comments)
  await supabase
    .from('agent_keys')
    .update({ 
      total_comments: agentKeyData.total_comments + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', agentKeyData.id)

  return {
    agentId: agentKeyData.id,
    username: agentKeyData.username
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    const { content, postId, parentId, ai_generated } = requestData
    let { authorName } = requestData

    // Agent authentication check (before validation so username can be auto-filled)
    let isAgentRequest = false
    let agentData = null
    let finalAiGenerated = ai_generated || false

    try {
      agentData = await authenticateAgent(request)
      if (agentData) {
        isAgentRequest = true
        finalAiGenerated = true
        if (!authorName) {
          authorName = agentData.username
        }
      }
    } catch (agentError) {
      return NextResponse.json({ 
        error: `Agent authentication failed: ${agentError instanceof Error ? agentError.message : 'Unknown error'}` 
      }, { status: 401 })
    }

    if (!content || !postId || !authorName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (authorName.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    // user ID 찾기 또는 생성 (에이전트가 아닐 때만)
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', authorName)
      .single()

    let userId = null;
    if (user) {
      userId = user.id
    } else if (!isAgentRequest) {
      // 에이전트가 아닐 때만 새 user 생성
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          username: authorName,
          email_hash: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          karma_points: 0,
          age_verified: true
        })
        .select('id')
        .single()

      if (userError) {
        console.error('Error creating user:', userError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
      userId = newUser.id
    }

    // 에이전트 요청의 경우 기존 유저가 없으면 유저로 간주하지 않음
    if (!userId && !isAgentRequest) {
      return NextResponse.json({ error: 'Authentication required. Please log in to create comments.', code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    // post의 서브레딧 정보 가져오기 (자동 가입을 위해)
    const { data: postData } = await supabase
      .from('posts')
      .select('channel_id, allow_guest_comments')
      .eq('id', postId)
      .single()

    // 게스트 댓글 허용 여부 확인 (에이전트는 제외)
    if (!isAgentRequest) {
      const auth = await createClient()
      const { data: { user: sessionUser } } = await auth.auth.getUser()
      if (postData && postData.allow_guest_comments === false && !sessionUser) {
        return NextResponse.json({ error: 'Guest comments are not allowed for this post' }, { status: 403 })
      }
    }

    // 서브레딧 자동 가입 (일반 유저만)
    if (postData?.channel_id && userId) {
      try {
        // 이미 가입되어 있는지 확인
        const { data: existingMembership } = await supabase
          .from('channel_members')
          .select('id')
          .eq('user_id', userId)
          .eq('channel_id', postData.channel_id)
          .single()

        // 가입되어 있지 않으면 자동 가입
        if (!existingMembership) {
          await supabase
            .from('channel_members')
            .insert({
              user_id: userId,
              channel_id: postData.channel_id,
              joined_at: new Date().toISOString()
            })
          
          // 멤버 수 증가 (트리거가 없으면 수동으로 처리)
          const { data: currentChannel } = await supabase
            .from('channels')
            .select('member_count')
            .eq('id', postData.channel_id)
            .single()

          if (currentChannel) {
            await supabase
              .from('channels')
              .update({ 
                member_count: (currentChannel.member_count || 0) + 1 
              })
              .eq('id', postData.channel_id)
          }
        }
      } catch (membershipError) {
        console.error('Auto-join error:', membershipError)
        // 멤버십 오류는 comment 생성을 막지 않음
      }
    }

    // comment 생성
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        content,
        post_id: postId,
        author_id: userId,
        author_name: isAgentRequest ? agentData?.username : null, // Agent comments use author_name
        parent_id: parentId || null,
        upvotes: 0,
        downvotes: 0,
        ai_generated: finalAiGenerated
      })
      .select(`
        *,
        users (username)
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // comment_count 증가
    try {
      await supabase.rpc('increment_comment_count', { post_id_input: postId })
    } catch (error) {
      // rpc 없으면 직접 업데이트
      await supabase
        .from('posts')
        .update({ comment_count: undefined }) // fallback below
        .eq('id', postId)
    }
    // 직접 카운트 업데이트 (rpc 없을 경우 대비)
    const { data: currentPost } = await supabase.from('posts').select('comment_count').eq('id', postId).single()
    if (currentPost) {
      await supabase.from('posts').update({ comment_count: (currentPost.comment_count || 0) + 1 }).eq('id', postId)
    }

    // token 보상 지급 (백그라운드에서 처리, 일반 유저만)
    if (userId && !isAgentRequest) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tokens/earn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            action: 'comment_create',
            metadata: {
              commentId: comment.id,
              postId
            }
          })
        })
        
        if (!response.ok) {
        }
      } catch (tokenError) {
        console.error('Token reward error:', tokenError)
        // token error는 comment 생성에 영향주지 않음
      }
    }

    return NextResponse.json({ comment })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}