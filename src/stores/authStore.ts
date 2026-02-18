'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: { id: string; username: string; email_hash: string; [key: string]: unknown } | null
  isLoading: boolean
  isAdmin: boolean
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAdmin: false,

      signUp: async (email: string, password: string, username: string) => {
        try {
          const supabase = createClient()
          
          // 1. Supabase Auth에 회원가입
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username
              },
              emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL || 'https://ddudl.com'
            }
          })

          if (error) {
            return { success: false, error: error.message }
          }

          if (data.user) {
            // 2. API를 통해 users 테이블에 프로필 생성
            const profileResponse = await fetch('/api/auth/profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: data.user.id,
                username,
                emailHash: btoa(email).slice(0, 32)
              })
            })

            if (!profileResponse.ok) {
              const errorData = await profileResponse.json()
              console.error('Profile creation error:', errorData)
              await supabase.auth.signOut()
              const detail = errorData?.error || errorData?.details?.message || 'Unknown error'
              return { success: false, error: `Profile creation failed: ${detail}` }
            }

            set({ user: data.user })
            return { success: true }
          }

          return { success: false, error: 'Registration failed.' }
        } catch (error) {
          console.error('Sign up error:', error)
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'An unknown error occurred.' 
          }
        }
      },

      signIn: async (email: string, password: string) => {
        try {
          const supabase = createClient()
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (error) {
            return { success: false, error: error.message }
          }

          if (data.user) {
            // user 프로필 조회
            const username = data.user.user_metadata?.username || data.user.email?.split('@')[0]
            if (username) {
              try {
                let response = await fetch(`/api/users/profile?username=${username}`)

                // 프로필이 없는 경우 (404) 자동 생성 시도 (Self-Healing)
                if (response.status === 404) {
                  const createResponse = await fetch('/api/auth/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: data.user.id,
                      username,
                      emailHash: btoa(email).slice(0, 32)
                    })
                  })
                  
                  if (createResponse.ok) {
                    response = await fetch(`/api/users/profile?username=${username}`)
                  }
                }

                if (response.ok) {
                  const { user: profile } = await response.json()
                  const isAdmin = profile?.role === 'admin' || profile?.is_admin === true
                  set({ 
                    user: data.user, 
                    profile,
                    isAdmin 
                  })
                }
              } catch (_err) {
                console.error('Failed to fetch profile:', _err)
                set({ user: data.user })
              }
            } else {
              set({ user: data.user })
            }
            return { success: true }
          }

          return { success: false, error: 'Login failed.' }
        } catch (error) {
          console.error('Sign in error:', error)
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'An unknown error occurred.' 
          }
        }
      },

      signOut: async () => {
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
          set({ user: null, profile: null, isAdmin: false })
        } catch (error) {
          console.error('Sign out error:', error)
        }
      },

      initialize: async () => {
        try {
          const supabase = createClient()
          
          // 현재 세션 확인
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            // user 프로필 조회
            const username = session.user.user_metadata?.username || session.user.email?.split('@')[0]
            if (username) {
              try {
                let response = await fetch(`/api/users/profile?username=${username}`)

                // 프로필이 없는 경우 (404) 자동 생성 시도 (Self-Healing)
                if (response.status === 404) {
                  const createResponse = await fetch('/api/auth/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: session.user.id,
                      username,
                      emailHash: btoa(session.user.email || '').slice(0, 32)
                    })
                  })
                  
                  if (createResponse.ok) {
                    response = await fetch(`/api/users/profile?username=${username}`)
                  }
                }

                if (response.ok) {
                  const { user: profile } = await response.json()
                  const isAdmin = profile?.role === 'admin' || profile?.is_admin === true
                  set({ 
                    user: session.user, 
                    profile,
                    isAdmin,
                    isLoading: false 
                  })
                } else {
                  set({ user: session.user, isLoading: false })
                }
              } catch (_err) {
                console.error('Failed to fetch profile:', _err)
                set({ user: session.user, isLoading: false })
              }
            } else {
              set({ user: session.user, isLoading: false })
            }
          } else {
            set({ user: null, profile: null, isAdmin: false, isLoading: false })
          }

          // Auth 상태 변화 리스너 설정
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              const username = session.user.user_metadata?.username || session.user.email?.split('@')[0]
              if (username) {
                try {
                  let response = await fetch(`/api/users/profile?username=${username}`)
                  
                  // 프로필이 없는 경우 (404) 자동 생성 시도 (Self-Healing)
                  if (response.status === 404) {
                    const createResponse = await fetch('/api/auth/profile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: session.user.id,
                        username,
                        emailHash: btoa(session.user.email || '').slice(0, 32)
                      })
                    })
                    
                    if (createResponse.ok) {
                      // 생성 success 후 다시 조회
                      response = await fetch(`/api/users/profile?username=${username}`)
                    }
                  }

                  if (response.ok) {
                    const { user: profile } = await response.json()
                    const isAdmin = profile?.role === 'admin' || profile?.is_admin === true
                    set({ 
                      user: session.user, 
                      profile,
                      isAdmin 
                    })
                  } else {
                    set({ user: session.user })
                  }
                } catch {
                  set({ user: session.user })
                }
              } else {
                set({ user: session.user })
              }
            } else {
              set({ user: null, profile: null, isAdmin: false })
            }
          })
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ user: null, isLoading: false })
        }
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({})
    }
  )
)