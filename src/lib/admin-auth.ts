import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export function validateAdminKey(request: NextRequest): boolean {
  const key = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_API_KEY || 'ddudl_admin_secret_key_change_me'
  return key === adminKey
}

export async function validateAdminAccess(request: NextRequest): Promise<boolean> {
  // 1. Check X-Admin-Key header first (for external/script access)
  if (validateAdminKey(request)) {
    return true
  }

  // 2. Check session-based auth (for logged-in admin users on dashboard)
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    return profile?.role === 'admin'
  } catch {
    return false
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Invalid or missing X-Admin-Key' }, { status: 401 })
}
