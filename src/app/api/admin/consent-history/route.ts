import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Admin용 동의 이력 조회 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    
    const supabase = createAdminClient()

    // permission 확인 (실제 운영시에는 Admin permission 확인 로직 추가 필요)
    // const { data: { user } } = await supabase.auth.getUser()
    // if (!user || !isAdmin(user)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    let query = supabase
      .from('users')
      .select(`
        id,
        username,
        email_hash,
        terms_accepted,
        privacy_accepted,
        marketing_accepted,
        consent_date,
        consent_ip,
        created_at
      `)

    // 특정 user 필터링
    if (userId) {
      query = query.eq('id', userId)
    }

    // 페이지네이션
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: users, error } = await query.order('consent_date', { ascending: false })

    if (error) {
      console.error('Error fetching consent history:', error)
      return NextResponse.json({ error: 'Failed to fetch consent history' }, { status: 500 })
    }

    // 동의 이력 데이터 변환
    const consentHistory = users?.map(user => ({
      userId: user.id,
      username: user.username,
      consents: {
        terms: user.terms_accepted || false,
        privacy: user.privacy_accepted || false,
        marketing: user.marketing_accepted || false
      },
      consentDate: user.consent_date,
      consentIp: user.consent_ip,
      userCreated: user.created_at
    })) || []

    return NextResponse.json({
      history: consentHistory,
      pagination: {
        page,
        limit,
        total: users?.length || 0
      },
      summary: {
        totalUsers: consentHistory.length,
        termsAccepted: consentHistory.filter(h => h.consents.terms).length,
        privacyAccepted: consentHistory.filter(h => h.consents.privacy).length,
        marketingAccepted: consentHistory.filter(h => h.consents.marketing).length
      }
    })

  } catch (error) {
    console.error('Consent history API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}