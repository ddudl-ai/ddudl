import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    const supabase = createAdminClient()
    
    let queryBuilder = supabase
      .from('users')
      .select('*', { count: 'exact' })

    // 검색 필터 적용
    if (query) {
      queryBuilder = queryBuilder.or(`username.ilike.%${query}%,email_hash.ilike.%${query}%`)
    }

    // 역할 필터
    if (role && role !== 'all') {
      queryBuilder = queryBuilder.eq('role', role)
    }

    // 상태 필터
    if (status === 'banned') {
      queryBuilder = queryBuilder.eq('is_banned', true)
    } else if (status === 'active') {
      queryBuilder = queryBuilder.eq('is_banned', false)
    }

    // 정렬
    queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' })

    // 페이지네이션
    const offset = (page - 1) * limit
    queryBuilder = queryBuilder.range(offset, offset + limit - 1)

    const { data: users, error, count } = await queryBuilder

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: count,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('User search API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}