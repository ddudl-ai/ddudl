import { NextRequest, NextResponse } from 'next/server'

export function validateAdminKey(request: NextRequest): boolean {
  const key = request.headers.get('x-admin-key')
  const adminKey = process.env.ADMIN_API_KEY || 'ddudl_admin_secret_key_change_me'
  return key === adminKey
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Invalid or missing X-Admin-Key' }, { status: 401 })
}