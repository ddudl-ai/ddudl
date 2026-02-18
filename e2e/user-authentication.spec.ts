import { test, expect } from '@playwright/test'

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should allow user to sign up successfully', async ({ page }) => {
    // Click sign up/login link
    await page.click('text=로그인')
    
    // Navigate to signup
    await page.click('text=회원가입')
    
    // Verify we're on signup page
    await expect(page).toHaveURL(/.*auth\/signup/)
    
    // Mock successful signup API
    await page.route('/api/auth/profile', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })
    
    // Fill signup form
    await page.fill('input[type="email"]', 'newuser@example.com')
    await page.fill('input[type="password"]', 'SecurePassword123!')
    await page.fill('input[placeholder*="사용자명"]', 'newusername')
    
    // Accept terms
    await page.check('input[type="checkbox"]')
    
    // Submit form
    await page.click('button:has-text("회원가입")')
    
    // Verify success message or redirect
    await expect(page.locator('text=회원가입이 완료되었습니다')).toBeVisible()
  })

  test('should validate signup form inputs', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Try to submit empty form
    await page.click('button:has-text("회원가입")')
    
    // Should show validation errors
    await expect(page.locator('text=이메일을 입력해주세요')).toBeVisible()
    
    // Fill invalid email
    await page.fill('input[type="email"]', 'invalid-email')
    await expect(page.locator('text=올바른 이메일 형식이 아닙니다')).toBeVisible()
    
    // Fill weak password
    await page.fill('input[type="password"]', '123')
    await expect(page.locator('text=비밀번호는 최소 8자 이상이어야 합니다')).toBeVisible()
    
    // Fill short username
    await page.fill('input[placeholder*="사용자명"]', 'ab')
    await expect(page.locator('text=사용자명은 3자 이상이어야 합니다')).toBeVisible()
  })

  test('should handle signup errors', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Mock email already exists error
    await page.route('**/auth/signup', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'User already registered'
        })
      })
    })
    
    // Fill form
    await page.fill('input[type="email"]', 'existing@example.com')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    await page.fill('input[placeholder*="사용자명"]', 'validusername')
    await page.check('input[type="checkbox"]')
    
    await page.click('button:has-text("회원가입")')
    
    // Should show error message
    await expect(page.locator('text=이미 등록된 이메일입니다')).toBeVisible()
  })

  test('should allow user to sign in successfully', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Mock successful signin
    await page.route('**/auth/signin', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          user: { 
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { username: 'testuser' }
          }
        })
      })
    })
    
    // Mock profile fetch
    await page.route('/api/users/profile*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-123',
            username: 'testuser',
            role: 'user'
          }
        })
      })
    })
    
    // Fill signin form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    
    await page.click('button:has-text("로그인")')
    
    // Should redirect to home page
    await expect(page).toHaveURL('/')
    
    // Should show user profile in header
    await expect(page.locator('text=testuser')).toBeVisible()
  })

  test('should handle signin errors', async ({ page }) => {
    await page.goto('/auth/signin')
    
    // Mock invalid credentials error
    await page.route('**/auth/signin', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid login credentials'
        })
      })
    })
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    await page.click('button:has-text("로그인")')
    
    await expect(page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible()
  })

  test('should allow user to sign out', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { 
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { username: 'testuser' }
        }
      }))
    })
    
    await page.goto('/')
    
    // Mock signout
    await page.route('**/auth/signout', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })
    
    // Click user menu
    await page.click('text=testuser')
    
    // Click signout
    await page.click('text=로그아웃')
    
    // Should clear authentication state
    await expect(page.locator('text=로그인')).toBeVisible()
    await expect(page.locator('text=testuser')).not.toBeVisible()
  })

  test('should handle terms and conditions modal', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Click terms link
    await page.click('text=이용약관')
    
    // Should open terms modal
    await expect(page.locator('text=서비스 이용약관')).toBeVisible()
    
    // Should display terms content
    await expect(page.locator('text=제1조 (목적)')).toBeVisible()
    
    // Close modal
    await page.click('button:has-text("확인")')
    
    // Modal should close
    await expect(page.locator('text=서비스 이용약관')).not.toBeVisible()
  })

  test('should require terms acceptance for signup', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Fill all required fields but don't check terms
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'ValidPassword123!')
    await page.fill('input[placeholder*="사용자명"]', 'testuser')
    
    // Try to submit without accepting terms
    await page.click('button:has-text("회원가입")')
    
    // Should show terms acceptance error
    await expect(page.locator('text=이용약관에 동의해야 합니다')).toBeVisible()
    
    // Check terms
    await page.check('input[type="checkbox"]')
    
    // Submit button should now be enabled
    await expect(page.locator('button:has-text("회원가입")')).not.toBeDisabled()
  })

  test('should persist authentication state across page reloads', async ({ page }) => {
    // Set authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { 
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { username: 'testuser' }
        }
      }))
    })
    
    await page.goto('/')
    
    // Mock profile fetch for initialization
    await page.route('/api/users/profile*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-123',
            username: 'testuser',
            role: 'user'
          }
        })
      })
    })
    
    // Reload page
    await page.reload()
    
    // Should still be authenticated
    await expect(page.locator('text=testuser')).toBeVisible()
  })

  test('should show different UI for authenticated vs anonymous users', async ({ page }) => {
    // Test anonymous user first
    await page.goto('/')
    
    await expect(page.locator('text=로그인')).toBeVisible()
    await expect(page.locator('text=회원가입')).toBeVisible()
    
    // Test authenticated user
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { 
          id: 'user-123',
          user_metadata: { username: 'testuser' }
        }
      }))
    })
    
    await page.reload()
    
    await expect(page.locator('text=testuser')).toBeVisible()
    await expect(page.locator('text=로그인')).not.toBeVisible()
  })

  test('should handle session expiration', async ({ page }) => {
    // Set authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'expired-token',
        user: { id: 'user-123' }
      }))
    })
    
    await page.goto('/')
    
    // Mock expired session response
    await page.route('/api/users/profile*', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' })
      })
    })
    
    // Should handle expired session gracefully
    await page.reload()
    
    // Should show login option (fallback to anonymous state)
    await expect(page.locator('text=로그인')).toBeVisible()
  })

  test('should validate password strength', async ({ page }) => {
    await page.goto('/auth/signup')
    
    const passwordInput = page.locator('input[type="password"]')
    
    // Test various password strengths
    const weakPasswords = ['123', 'password', 'abc123']
    const strongPasswords = ['StrongPass123!', 'MySecureP@ssw0rd', 'C0mpl3x!Passw0rd']
    
    for (const weakPassword of weakPasswords) {
      await passwordInput.fill(weakPassword)
      await expect(page.locator('text=비밀번호가 너무 약합니다')).toBeVisible()
    }
    
    for (const strongPassword of strongPasswords) {
      await passwordInput.fill(strongPassword)
      await expect(page.locator('text=비밀번호가 너무 약합니다')).not.toBeVisible()
    }
  })
})

test.describe('Admin Authentication', () => {
  test('should allow admin users to access admin features', async ({ page }) => {
    // Set admin user state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'admin-token',
        user: { 
          id: 'admin-123',
          email: 'admin@example.com',
          user_metadata: { username: 'adminuser' }
        }
      }))
    })
    
    // Mock admin profile
    await page.route('/api/users/profile*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'admin-123',
            username: 'adminuser',
            role: 'admin',
            is_admin: true
          }
        })
      })
    })
    
    await page.goto('/')
    
    // Should show admin menu/features
    await expect(page.locator('text=관리자')).toBeVisible()
    
    // Should be able to access admin dashboard
    await page.click('text=관리자')
    await expect(page).toHaveURL(/.*admin.*/)
  })

  test('should prevent non-admin users from accessing admin features', async ({ page }) => {
    // Set regular user state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'user-token',
        user: { 
          id: 'user-123',
          user_metadata: { username: 'regularuser' }
        }
      }))
    })
    
    // Mock regular user profile
    await page.route('/api/users/profile*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-123',
            username: 'regularuser',
            role: 'user',
            is_admin: false
          }
        })
      })
    })
    
    await page.goto('/')
    
    // Should not show admin features
    await expect(page.locator('text=관리자')).not.toBeVisible()
    
    // Direct access to admin page should be blocked
    await page.goto('/admin')
    await expect(page.locator('text=접근 권한이 없습니다')).toBeVisible()
  })
})