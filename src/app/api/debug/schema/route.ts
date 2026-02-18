import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    // users 테이블의 첫 번째 행 구조 확인
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const schema = data && data.length > 0 ? Object.keys(data[0]) : []
    
    return NextResponse.json({ 
      table: 'users',
      columns: schema,
      sampleData: data?.[0] || null
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}