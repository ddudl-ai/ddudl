import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, email, userId, role, reason } = await request.json()
    const supabase = createAdminClient()

    let targetUserId = userId

    // 이메일로 user 찾기
    if (email && !userId) {
      const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')
      const { data: users, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email_hash', emailHash)

      if (findError || !users || users.length === 0) {
        return NextResponse.json({ 
          error: 'User not found',
          message: `${email} User not found.`
        }, { status: 404 })
      }

      targetUserId = users[0].id
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID or email required' }, { status: 400 })
    }

    switch (action) {
      case 'make_admin':
        const { error: adminError } = await supabase
          .from('users')
          .update({ 
            role: 'admin',
            is_admin: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetUserId)

        if (adminError) {
          return NextResponse.json({ error: adminError.message }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          message: 'Set as administrator.'
        })

      case 'change_role':
        const { error: roleError } = await supabase
          .from('users')
          .update({ 
            role: role || 'user',
            is_admin: role === 'admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', targetUserId)

        if (roleError) {
          return NextResponse.json({ error: roleError.message }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          message: `역할이 ${role || 'user'}로 변경되었습니다.`
        })

      case 'ban_user':
        const { error: banError } = await supabase
          .from('users')
          .update({ 
            is_banned: true,
            ban_reason: reason || 'Admin에 의한 제재',
            updated_at: new Date().toISOString()
          })
          .eq('id', targetUserId)

        if (banError) {
          return NextResponse.json({ error: banError.message }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          message: 'User has been banned.'
        })

      case 'unban_user':
        const { error: unbanError } = await supabase
          .from('users')
          .update({ 
            is_banned: false,
            ban_reason: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetUserId)

        if (unbanError) {
          return NextResponse.json({ error: unbanError.message }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          message: 'User ban has been lifted.'
        })

      case 'delete_user':
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', targetUserId)

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          message: 'User has been deleted.'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}