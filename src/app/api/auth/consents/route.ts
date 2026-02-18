import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TERMS_VERSION, PRIVACY_VERSION } from '@/data/terms'

interface ConsentRequest {
  userId: string
  termsAccepted: boolean
  privacyAccepted: boolean
  aiTrainingAccepted: boolean
  marketingAccepted: boolean
  userAgent?: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId, termsAccepted, privacyAccepted, aiTrainingAccepted, marketingAccepted, userAgent }: ConsentRequest = await request.json()
    
    // IP 주소 추출
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwarded?.split(',')[0] || realIp || '127.0.0.1'
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // required 약관 동의 확인
    if (!termsAccepted || !privacyAccepted || !aiTrainingAccepted) {
      return NextResponse.json({ 
        error: 'Terms of service, privacy policy, and AI training consent must be accepted' 
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // user 존재 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 트랜잭션으로 모든 동의 기록 저장
    const consents = []
    const timestamp = new Date().toISOString()

    // 이용약관 동의
    if (termsAccepted) {
      consents.push({
        user_id: userId,
        consent_type: 'terms_of_service',
        consent_version: TERMS_VERSION,
        consented: true,
        consent_date: timestamp,
        ip_address: ipAddress,
        user_agent: userAgent || null
      })
    }

    // 개인정보처리방침 동의
    if (privacyAccepted) {
      consents.push({
        user_id: userId,
        consent_type: 'privacy_policy',
        consent_version: PRIVACY_VERSION,
        consented: true,
        consent_date: timestamp,
        ip_address: ipAddress,
        user_agent: userAgent || null
      })
    }

    // AI 학습 데이터 제공 동의 (required)
    if (aiTrainingAccepted) {
      consents.push({
        user_id: userId,
        consent_type: 'ai_training',
        consent_version: '2.0',
        consented: true,
        consent_date: timestamp,
        ip_address: ipAddress,
        user_agent: userAgent || null
      })
    }

    // 마케팅 동의 (선택사항)
    consents.push({
      user_id: userId,
      consent_type: 'marketing',
      consent_version: '2.0',
      consented: marketingAccepted,
      consent_date: timestamp,
      ip_address: ipAddress,
      user_agent: userAgent || null
    })

    // 임시로 users 테이블에 동의 상태 저장 (실제 운영시에는 user_consents 테이블 사용)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        terms_accepted: termsAccepted,
        privacy_accepted: privacyAccepted,
        ai_training_accepted: aiTrainingAccepted,
        marketing_accepted: marketingAccepted,
        consent_date: timestamp,
        consent_ip: ipAddress,
        updated_at: timestamp
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user consent:', updateError)
      return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Consent recorded successfully',
      consentDate: timestamp,
      consents: {
        terms: termsAccepted,
        privacy: privacyAccepted,
        aiTraining: aiTrainingAccepted,
        marketing: marketingAccepted
      }
    })

  } catch (error) {
    console.error('Consent API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 임시로 users 테이블에서 동의 상태 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('terms_accepted, privacy_accepted, marketing_accepted, consent_date, consent_ip')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User consent data not found' }, { status: 404 })
    }

    return NextResponse.json({
      userId,
      consents: {
        terms: user.terms_accepted || false,
        privacy: user.privacy_accepted || false,
        marketing: user.marketing_accepted || false
      },
      consentDate: user.consent_date,
      consentIp: user.consent_ip,
      versions: {
        terms: TERMS_VERSION,
        privacy: PRIVACY_VERSION,
        marketing: '1.0'
      }
    })

  } catch (error) {
    console.error('Get consent API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, consentType, consented }: { userId: string, consentType: string, consented: boolean } = await request.json()
    
    // IP 주소 추출
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwarded?.split(',')[0] || realIp || '127.0.0.1'
    
    if (!userId || !consentType || consented === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (!['terms_of_service', 'privacy_policy', 'marketing'].includes(consentType)) {
      return NextResponse.json({ error: 'Invalid consent type' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const timestamp = new Date().toISOString()

    // 동의 상태 업데이트 (임시로 users 테이블 사용)
    const updateField = consentType === 'terms_of_service' ? 'terms_accepted' :
                       consentType === 'privacy_policy' ? 'privacy_accepted' : 'marketing_accepted'

    const { error: updateError } = await supabase
      .from('users')
      .update({
        [updateField]: consented,
        consent_date: timestamp,
        consent_ip: ipAddress,
        updated_at: timestamp
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating consent:', updateError)
      return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Consent updated successfully',
      consentType,
      consented,
      updatedAt: timestamp
    })

  } catch (error) {
    console.error('Update consent API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}