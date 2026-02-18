import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = createAdminClient()

    // user 약관 동의 테이블 생성
    const { error: consentsError } = await supabase.rpc('create_user_consents_table', {})
    
    if (consentsError) {
      console.error('Error creating user_consents table:', consentsError)
      return NextResponse.json({ error: 'Failed to create user_consents table' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'User consents table created successfully',
      tables: ['user_consents']
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}