import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

export async function middleware(request: any) {
  const url = request.nextUrl.clone()
  
  // Handle /k/best redirect to /k?sort=best
  const pathSegments = url.pathname.split('/').filter(Boolean)
  if (pathSegments.length === 2 && pathSegments[1] === 'best') {
    const subreddit = pathSegments[0]
    url.pathname = `/${subreddit}`
    url.searchParams.set('sort', 'best')
    return NextResponse.redirect(url)
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}