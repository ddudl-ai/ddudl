import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 태그 처리 함수
async function processChannelTags(adminSupabase: any, channelId: string, tags: string[]) {
  const tagIds: string[] = []
  
  for (const tagName of tags.slice(0, 5)) { // 최대 5개
    // 기존 태그 찾기
    let { data: existingTag } = await adminSupabase
      .from('tags')
      .select('id')
      .eq('name', tagName.toLowerCase().trim())
      .single()

    if (!existingTag) {
      // 새 태그 생성
      const { data: newTag } = await adminSupabase
        .from('tags')
        .insert({
          name: tagName.toLowerCase().trim(),
          color: getRandomTagColor(),
          description: null
        })
        .select('id')
        .single()
      
      if (newTag) {
        existingTag = newTag
      }
    }

    if (existingTag) {
      tagIds.push(existingTag.id)
    }
  }

  // channel-태그 연결 (Note: DB table name remains channel_tags for now)
  if (tagIds.length > 0) {
    const tagConnections = tagIds.map(tagId => ({
      channel_id: channelId,
      tag_id: tagId
    }))

    await adminSupabase
      .from('channel_tags')  // Note: DB table name updated
      .insert(tagConnections)
  }
}

// 랜덤 태그 색상 생성
function getRandomTagColor(): string {
  const colors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export async function POST(request: NextRequest) {
  try {
    const { name, displayName, description, reason, tags = [] } = await request.json()
    
    if (!name || !displayName || !description || !reason) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'Please fill in all required fields.' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()


    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Authentication required.'
      }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // user 정보 확인
    const { data: initialUserData, error: userError } = await adminSupabase
      .from('users')
      .select('username, karma_points, created_at, is_banned, is_admin')
      .eq('id', user.id)
      .single()
    
    let userData = initialUserData


    // user가 없으면 자동 생성
    if (!userData) {
      
      const { data: newUser, error: createUserError } = await adminSupabase
        .from('users')
        .insert({
          id: user.id,
          username: user.email?.split('@')[0] || 'user',
          email_hash: user.email || '',
          karma_points: 0,
          age_verified: true,
          is_admin: user.email === 'kimjuik@gmail.com', // 특별히 Admin로 설정
          created_at: new Date().toISOString()
        })
        .select('username, karma_points, created_at, is_banned, is_admin')
        .single()

      if (createUserError) {
        console.error('Failed to create user:', createUserError)
        return NextResponse.json({
          error: 'User creation failed',
          message: 'Failed to create user.'
        }, { status: 500 })
      }

      userData = newUser
    }

    if (userData.is_banned) {
      return NextResponse.json({ 
        error: 'User banned',
        message: 'User is banned.'
      }, { status: 403 })
    }

    // Admin가 아닌 경우에만 자격 요건 체크
    if (!userData.is_admin) {
      // 기본 자격 요건 체크
      const accountAge = new Date().getTime() - new Date(userData.created_at).getTime()
      const minAccountAge = 7 * 24 * 60 * 60 * 1000 // 7일
      const minKarma = 10

      if (accountAge < minAccountAge) {
        return NextResponse.json({
          error: 'Account too new',
          message: 'You can create a channel only after 7 days from account creation.'
        }, { status: 400 })
      }

      if (userData.karma_points < minKarma) {
        return NextResponse.json({
          error: 'Insufficient karma',
          message: `Minimum ${minKarma} karma points required to create a channel.`
        }, { status: 400 })
      }
    }

    // 중복 이름 체크
    const { data: existingChannel } = await adminSupabase
      .from('channels')  // Note: DB table name changed to channels
      .select('id')
      .eq('name', name.toLowerCase())
      .single()

    if (existingChannel) {
      return NextResponse.json({
        error: 'Name taken',
        message: 'Channel name already exists.'
      }, { status: 400 })
    }

    // AI 모더레이션 검사
    const aiReviewResult = await performAIReview({
      name,
      displayName,
      description,
      reason,
      username: userData.username
    })

    if (!aiReviewResult.approved) {
      // AI가 반려한 경우 Admin 검토 대기열에 추가
      await adminSupabase
        .from('channel_requests')
        .insert({
          name: name.toLowerCase(),
          display_name: displayName,
          description,
          reason,
          creator_id: user.id,
          status: 'pending_review',
          ai_review_result: aiReviewResult,
          created_at: new Date().toISOString()
        })

      return NextResponse.json({
        success: true,
        status: 'pending_review',
        message: 'Application submitted. Will be approved after admin review.',
        reviewReason: aiReviewResult.reason
      })
    }

    // AI 승인된 경우 자동 생성
    const { data: newChannel, error: createError } = await adminSupabase
      .from('channels')  // Note: DB table name changed to channels
      .insert({
        name: name.toLowerCase(),
        display_name: displayName,
        description,
        master_id: user.id,
        member_count: 1,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating channel:', createError)
      return NextResponse.json({ 
        error: 'Failed to create channel' 
      }, { status: 500 })
    }

    // 생성자를 Admin로 자동 등록
    await adminSupabase
      .from('channel_memberships')
      .insert({
        user_id: user.id,
        channel_id: newChannel.id,
        joined_at: new Date().toISOString()
      })

    // 태그 처리
    if (tags && tags.length > 0) {
      await processChannelTags(adminSupabase, newChannel.id, tags)
    }

    // 승인 기록 저장
    await adminSupabase
      .from('channel_requests')
      .insert({
        name: name.toLowerCase(),
        display_name: displayName,
        description,
        reason,
        creator_id: user.id,
        status: 'approved',
        ai_review_result: aiReviewResult,
        approved_at: new Date().toISOString(),
        channel_id: newChannel.id
      })

    return NextResponse.json({
      success: true,
      status: 'approved',
      message: 'Channel successfully created!',
      channel: newChannel
    })

  } catch (error) {
    console.error('Channel creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// AI 모더레이션 함수
async function performAIReview(data: {
  name: string
  displayName: string
  description: string
  reason: string
  username: string
}) {
  try {
    // OpenAI API 호출 (실제 구현 시)
    const prompt = `
Please review the following Korean community (channel) creation request:

이름: ${data.name}
표시명: ${data.displayName}
설명: ${data.description}
개설 이유: ${data.reason}
신청자: ${data.username}

검토 기준:
1. 부적절한 언어 사용 여부 (욕설, 차별, 혐오 표현)
2. 기존 일반적인 카테고리와 중복성
3. 구체적이고 건전한 목적성
4. 한국 문화와 법률 적합성

JSON 형태로 응답:
{
  "approved": boolean,
  "confidence": number (0-1),
  "reason": "검토 결과 설명"
}
    `

    // 실제로는 OpenAI API 호출
    // const response = await openai.chat.completions.create({...})
    
    // 임시 로직 (실제 AI 대신)
    const hasInappropriateContent = checkInappropriateContent(data.name + data.displayName + data.description)
    
    if (hasInappropriateContent) {
      return {
        approved: false,
        confidence: 0.9,
        reason: 'Inappropriate language detected.'
      }
    }

    if (data.description.length < 20) {
      return {
        approved: false,
        confidence: 0.8,
        reason: 'Channel description is too short. More specific description is needed.'
      }
    }

    return {
      approved: true,
      confidence: 0.85,
      reason: 'Judged as an appropriate channel application.'
    }

  } catch (error) {
    console.error('AI review error:', error)
    // AI error 시 Admin 검토로 넘김
    return {
      approved: false,
      confidence: 0.5,
      reason: 'An error occurred during AI review. Admin review required.'
    }
  }
}

// 부적절한 컨텐츠 체크 (간단한 키워드 필터)
function checkInappropriateContent(text: string): boolean {
  const inappropriateKeywords = [
    '섹스', '야동', '성인', '도박', '마약', '자살',
    '시발', '개새끼', '병신', '좆', '씨발'
  ]
  
  return inappropriateKeywords.some(keyword => 
    text.toLowerCase().includes(keyword)
  )
}