import { test, expect } from '@playwright/test'

test.describe('Post Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should create a post as anonymous user with CAPTCHA', async ({ page }) => {
    // Navigate to a subreddit
    await page.click('text=test') // Assuming there's a subreddit called 'test'
    
    // Click write post button
    await page.click('text=글쓰기')
    
    // Verify we're on the write post page
    await expect(page).toHaveURL(/.*\/test\/write/)
    
    // Fill in the post form
    await page.fill('input[placeholder*="게시물 제목"]', 'E2E 테스트 게시물')
    await page.fill('textarea[placeholder*="게시물 내용"]', '이것은 E2E 테스트로 작성된 게시물입니다.')
    
    // Select a flair
    await page.click('text=질문')
    
    // Verify author is set to anonymous
    await expect(page.locator('input[value="떠들이"]')).toBeVisible()
    
    // Verify CAPTCHA is shown for anonymous users
    await expect(page.locator('text=익명 사용자 인증')).toBeVisible()
    
    // Complete CAPTCHA (this would be mocked in a real test environment)
    await page.click('button:has-text("CAPTCHA 완료")') // Mock CAPTCHA button
    
    // Submit the form
    await page.click('button:has-text("게시하기")')
    
    // Verify successful submission by checking URL change
    await expect(page).toHaveURL(/.*\/test\/posts\/.*/)
    
    // Verify post content is displayed
    await expect(page.locator('h1')).toContainText('E2E 테스트 게시물')
    await expect(page.locator('text=이것은 E2E 테스트로 작성된 게시물입니다.')).toBeVisible()
  })

  test('should create a post with authenticated user (no CAPTCHA)', async ({ page }) => {
    // Mock authentication by setting localStorage or cookies
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'user-123', email: 'test@example.com' }
      }))
    })
    
    // Navigate to write post
    await page.goto('/test/write')
    
    // Fill form
    await page.fill('input[placeholder*="게시물 제목"]', '인증된 사용자 게시물')
    await page.fill('textarea[placeholder*="게시물 내용"]', '인증된 사용자가 작성한 게시물입니다.')
    
    // Verify no CAPTCHA is required
    await expect(page.locator('text=익명 사용자 인증')).not.toBeVisible()
    
    // Verify authenticated user badge
    await expect(page.locator('text=인증됨')).toBeVisible()
    
    // Submit
    await page.click('button:has-text("게시하기")')
    
    // Verify success
    await expect(page).toHaveURL(/.*\/test\/posts\/.*/)
  })

  test('should validate form inputs correctly', async ({ page }) => {
    await page.goto('/test/write')
    
    // Try to submit with empty title
    await page.click('button:has-text("게시하기")')
    
    // Should see validation error
    await expect(page.locator('text=제목과 작성자명은 필수입니다.')).toBeVisible()
    
    // Fill short title (less than 5 characters)
    await page.fill('input[placeholder*="게시물 제목"]', 'hi')
    await page.click('button:has-text("게시하기")')
    
    // Should see length validation error
    await expect(page.locator('text=제목은 최소 5자 이상이어야 합니다.')).toBeVisible()
  })

  test('should support markdown preview', async ({ page }) => {
    await page.goto('/test/write')
    
    // Fill title
    await page.fill('input[placeholder*="게시물 제목"]', 'Markdown Test')
    
    // Fill markdown content
    const markdownContent = '**굵은 텍스트**\n\n- 리스트 항목 1\n- 리스트 항목 2'
    await page.fill('textarea[placeholder*="게시물 내용"]', markdownContent)
    
    // Switch to preview mode
    await page.click('button:has-text("미리보기")')
    
    // Verify markdown rendering
    await expect(page.locator('strong')).toContainText('굵은 텍스트')
    await expect(page.locator('ul li')).toHaveCount(2)
    
    // Switch back to edit mode
    await page.click('button:has-text("편집")')
    await expect(page.locator('textarea')).toHaveValue(markdownContent)
  })

  test('should handle flair selection', async ({ page }) => {
    await page.goto('/test/write')
    
    const flairOptions = ['일반', '질문', '토론', '정보', '후기', '추천', '뉴스', '유머', '기타']
    
    // Test each flair option
    for (const flair of flairOptions) {
      await page.click(`text=${flair}`)
      
      // Verify selection (implementation may vary based on styling)
      const flairElement = page.locator(`text=${flair}`)
      await expect(flairElement).toBeVisible()
      
      // Deselect by clicking again
      await page.click(`text=${flair}`)
    }
  })

  test('should handle form errors gracefully', async ({ page }) => {
    await page.goto('/test/write')
    
    // Mock API error by intercepting the POST request
    await page.route('/api/posts', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error occurred' })
      })
    })
    
    // Fill form correctly
    await page.fill('input[placeholder*="게시물 제목"]', 'Valid Title Here')
    
    // Complete CAPTCHA (mock)
    await page.click('button:has-text("CAPTCHA 완료")')
    
    // Submit
    await page.click('button:has-text("게시하기")')
    
    // Should show error message
    await expect(page.locator('text=Server error occurred')).toBeVisible()
    
    // Form should remain filled
    await expect(page.locator('input[placeholder*="게시물 제목"]')).toHaveValue('Valid Title Here')
  })

  test('should show loading states appropriately', async ({ page }) => {
    await page.goto('/test/write')
    
    // Mock slow API response
    await page.route('/api/posts', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ post: { id: 'new-post-123' } })
      })
    })
    
    // Fill form
    await page.fill('input[placeholder*="게시물 제목"]', 'Loading Test Post')
    await page.click('button:has-text("CAPTCHA 완료")')
    
    // Submit
    await page.click('button:has-text("게시하기")')
    
    // Should show loading state
    await expect(page.locator('button:has-text("게시 중...")')).toBeVisible()
    
    // Button should be disabled during loading
    await expect(page.locator('button:has-text("게시 중...")')).toBeDisabled()
  })
})

test.describe('Post Creation Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone size

  test('should work on mobile devices', async ({ page }) => {
    await page.goto('/test/write')
    
    // Verify mobile-friendly layout
    await expect(page.locator('input[placeholder*="게시물 제목"]')).toBeVisible()
    
    // Fill form on mobile
    await page.fill('input[placeholder*="게시물 제목"]', 'Mobile Test Post')
    
    // Mobile-specific interactions might be needed
    await page.tap('text=질문') // Use tap instead of click for mobile
    
    // Verify mobile CAPTCHA works
    await expect(page.locator('text=익명 사용자 인증')).toBeVisible()
  })
})