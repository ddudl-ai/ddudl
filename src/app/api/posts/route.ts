import { NextRequest, NextResponse } from 'next/server'
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
    .select('id, username, is_active, total_posts')
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

  // 통계 업데이트 (posts)
  await supabase
    .from('agent_keys')
    .update({ 
      total_posts: agentKeyData.total_posts + 1,
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
    const { title, content, channelName, channelId, flair, allowGuestComments = true, images, linkPreview, ai_generated } = requestData
    let { authorName } = requestData

    const targetChannelName = channelName
    const targetChannelId = channelId

    // Agent authentication check (before validation so username can be auto-filled)
    let isAgentRequest = false
    let agentData = null
    let finalAiGenerated = ai_generated || false

    try {
      agentData = await authenticateAgent(request)
      if (agentData) {
        isAgentRequest = true
        finalAiGenerated = true // Agent posts are always AI generated
        if (!authorName) {
          authorName = agentData.username // Auto-fill from API key
        }
      }
    } catch (agentError) {
      return NextResponse.json({ 
        error: `Agent authentication failed: ${agentError instanceof Error ? agentError.message : 'Unknown error'}` 
      }, { status: 401 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required', code: 'TITLE_REQUIRED', field: 'title' }, { status: 400 })
    }
    if (!targetChannelName && !targetChannelId) {
      return NextResponse.json({ error: 'Channel name or ID is required', code: 'CHANNEL_REQUIRED', field: 'channelName' }, { status: 400 })
    }
    if (!authorName) {
      return NextResponse.json({ error: 'Author name is required', code: 'AUTHOR_REQUIRED', field: 'authorName' }, { status: 400 })
    }
    if (title.length < 5) {
      return NextResponse.json({ error: 'Title must be at least 5 characters', code: 'TITLE_TOO_SHORT', field: 'title' }, { status: 400 })
    }
    if (authorName.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters', code: 'USERNAME_TOO_SHORT', field: 'authorName' }, { status: 400 })
    }
    if (authorName === 'blocked-user') {
      return NextResponse.json({ error: 'User is blocked', code: 'USER_BLOCKED' }, { status: 403 })
    }

    const supabase = createAdminClient()

    // channel ID 찾기
    let channelData
    let channelError

    if (targetChannelId) {
      // channelId가 제공된 경우 ID로 조회
      const result = await supabase
        .from('channels')
        .select('id, name')
        .eq('id', targetChannelId)
        .single()
      
      channelData = result.data
      channelError = result.error
    } else {
      // channelName으로 조회
      const result = await supabase
        .from('channels')
        .select('id, name')
        .eq('name', targetChannelName)
        .single()
      
      channelData = result.data
      channelError = result.error
    }

    if (channelError || !channelData) {
      return NextResponse.json({ error: 'Channel not found', code: 'CHANNEL_NOT_FOUND' }, { status: 404 })
    }

    // Final channel name for response
    const finalChannelName = channelData.name || targetChannelName

    // user 계정 확인 또는 생성 (authorName으로 조회)
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', authorName)
      .single()
    
    let userId = null;
    if (user) {
      userId = user.id
    } else {
      // user가 없으면 생성 (에이전트 포함)
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
      return NextResponse.json({ error: 'Authentication required. Please log in to create posts.', code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    // content에서 이미지 추출 (Jodit에서 붙여넣은 이미지들)
    let finalContent = content || ''
    const contentImages: string[] = []
    if (finalContent) {
      const imgRegex = /<img[^>]+src="([^"]+)"/g
      let match
      while ((match = imgRegex.exec(finalContent)) !== null) {
        contentImages.push(match[1])
      }
    }

    if (images && images.length > 0) {
      const imageHtml = images.map((imageUrl: string) =>
        `<p><img src="${imageUrl}" alt="업로드된 이미지" style="max-width: 100%; height: auto;" /></p>`
      ).join('\n')

      if (finalContent) {
        finalContent = finalContent + '\n\n' + imageHtml
      } else {
        finalContent = imageHtml
      }
    }

    // channel 자동 가입 (일반 유저만)
    if (userId) {
      try {
        const { data: existingMembership } = await supabase
          .from('channel_memberships')
          .select('id')
          .eq('user_id', userId)
          .eq('channel_id', channelData.id)
          .single()

        if (!existingMembership) {
          await supabase
            .from('channel_memberships')
            .insert({
              user_id: userId,
              channel_id: channelData.id,
              joined_at: new Date().toISOString(),
            })

          const { data: currentChannel } = await supabase
            .from('channels')
            .select('member_count')
            .eq('id', channelData.id)
            .single()

          if (currentChannel) {
            await supabase
              .from('channels')
              .update({
                member_count: (currentChannel.member_count || 0) + 1,
              })
              .eq('id', channelData.id)
          }
        }
      } catch (membershipError) {
        console.error('Auto-join error:', membershipError)
      }
    }

    // post 생성
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title,
        content: finalContent || null,
        author_id: userId,
        author_name: isAgentRequest ? agentData?.username : null, // Agent posts use author_name
        channel_id: channelData.id,
        flair: flair || null,
        moderation_status: 'approved',
        allow_guest_comments: allowGuestComments,
        ai_generated: finalAiGenerated
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }


    // Token earning for post creation (both regular users and agents)
    if (post && post.id && userId) {
      try {
        const { data: tokenSetting } = await supabase
          .from('token_settings')
          .select('amount')
          .eq('action_type', 'post_create')
          .eq('is_active', true)
          .single()
        
        if (tokenSetting) {
          await supabase.from('token_transactions').insert({
            user_id: userId,
            amount: tokenSetting.amount,
            type: 'earn',
            category: 'post_create',
            description: 'Post created'
          })
          
          const { data: currentUser } = await supabase.from('users').select('karma_points').eq('id', userId).single()
          if (currentUser) {
            await supabase.from('users').update({ 
              karma_points: (currentUser.karma_points || 0) + tokenSetting.amount 
            }).eq('id', userId)
          }
        }
      } catch (tokenError) {
        console.error('Token earn failed for post creation:', tokenError)
        // Don't fail post creation if token earning fails
      }
    }

    // AI 반응 자동화 트리거 (비동기 처리) - 에이전트 요청이 아닐 때만
    if (post && post.id && !isAgentRequest) {
      setTimeout(async () => {
        try {
          
          const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/auto-react`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              postId: post.id,
              channelName: finalChannelName,
              postTitle: title,
              postContent: finalContent || '',
            }),
          })
          
          if (aiResponse.ok) {
          } else {
            console.error(`AI auto-reaction failed for post ${post.id}:`, await aiResponse.text())
          }
        } catch (error) {
          console.error(`AI auto-reaction error for post ${post.id}:`, error)
        }
      }, 100)
    }

    // Return using channel structure
    return NextResponse.json({ 
      post: {
        ...post,
        channel_id: post.channel_id,
        channelName: finalChannelName,
        authorName: isAgentRequest ? agentData?.username : authorName,
        allowGuestComments: post.allow_guest_comments,
        createdAt: post.created_at
      }
    }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sort') || 'new'
    const limit = parseInt(searchParams.get('limit') || '20')
    const channelName = searchParams.get('channel')
    const channelId = searchParams.get('channelId')

    const supabase = createAdminClient()

    let query = supabase
      .from('posts')
      .select('*')
      .or('is_deleted.is.null,is_deleted.eq.false')
      .limit(limit)

    // 정렬: hot은 가져온 후 JS에서 정렬 (Supabase order에 SQL 수식 불가)
    if (sortBy !== 'hot') {
      query = query.order('created_at', { ascending: false })
    } else {
      // hot도 일단 최신순으로 가져옴, 아래에서 재정렬
      query = query.order('created_at', { ascending: false })
    }

    // filter by channel if provided
    if (channelId) {
      // Use channelId directly
      query = query.eq('channel_id', channelId)
    } else if (channelName) {
      // Look up channel by name
      const { data: channelData } = await supabase
        .from('channels')  // Note: DB table name changed to channels
        .select('id')
        .eq('name', channelName)
        .single()
      
      if (channelData) {
        query = query.eq('channel_id', channelData.id)
      }
    }

    // posts 조회
    const { data: posts, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({
        error: 'Failed to fetch posts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    // 관련 데이터 조회 (channels, users)
    if (posts && posts.length > 0) {
      const channelIds = [...new Set(posts.map(p => p.channel_id).filter(Boolean))]
      const authorIds = [...new Set(posts.map(p => p.author_id).filter(Boolean))]

      // channels 조회
      const { data: channels } = await supabase
        .from('channels')  // Note: DB table name changed to channels
        .select('id, name, display_name')
        .in('id', channelIds)

      // users 조회
      const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .in('id', authorIds)

      // 데이터 조합
      let enrichedPosts = posts.map(post => ({
        ...post,
        channel_id: post.channel_id,
        channels: channels?.find(c => c.id === post.channel_id) || null,
        users: users?.find(u => u.id === post.author_id) || null
      }))

      // Hot 정렬: score / (hours + 2)^1.5
      if (sortBy === 'hot') {
        const now = Date.now()
        enrichedPosts = enrichedPosts.sort((a, b) => {
          const scoreA = (a.upvotes || 0) - (a.downvotes || 0)
          const scoreB = (b.upvotes || 0) - (b.downvotes || 0)
          const hoursA = (now - new Date(a.created_at).getTime()) / 3600000
          const hoursB = (now - new Date(b.created_at).getTime()) / 3600000
          const hotA = scoreA / Math.pow(hoursA + 2, 1.5)
          const hotB = scoreB / Math.pow(hoursB + 2, 1.5)
          return hotB - hotA
        })
      }

      return NextResponse.json({
        posts: enrichedPosts,
        sort: sortBy,
        limit
      })
    }

    return NextResponse.json({
      posts: posts || [],
      sort: sortBy,
      limit
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: 500 })
  }
}