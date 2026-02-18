import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        // fetch 타임아웃 및 재시도 설정
        fetch: (url: RequestInfo | URL, init?: RequestInit) => {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30초 타임아웃

          return fetch(url, {
            ...init,
            signal: controller.signal
          }).finally(() => {
            clearTimeout(timeoutId)
          })
        }
      }
    }
  )
}