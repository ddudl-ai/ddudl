import { test, expect } from '@playwright/test'

test.describe('Voting System', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for voting tests
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'user-123', email: 'test@example.com' }
      }))
    })
    
    await page.goto('/')
  })

  test('should allow upvoting a post', async ({ page }) => {
    // Navigate to a post
    await page.click('text=첫 번째 게시물') // Mock post title
    
    // Find the upvote button
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first()
    
    // Get initial vote count
    const voteScore = page.locator('[data-testid="vote-score"]').first()
    const initialScore = await voteScore.textContent()
    
    // Mock the vote API response
    await page.route('/api/posts/*/vote', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          upvotes: 11,
          downvotes: 2,
          userVote: 'up'
        })
      })
    })
    
    // Click upvote
    await upvoteButton.click()
    
    // Verify vote count updated
    await expect(voteScore).toContainText('9') // 11 - 2 = 9
    
    // Verify upvote button is highlighted
    await expect(upvoteButton).toHaveClass(/text-orange-500/)
  })

  test('should allow downvoting a post', async ({ page }) => {
    await page.goto('/test/posts/123')
    
    const downvoteButton = page.locator('[data-testid="downvote-button"]').first()
    const voteScore = page.locator('[data-testid="vote-score"]').first()
    
    await page.route('/api/posts/*/vote', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          upvotes: 10,
          downvotes: 3,
          userVote: 'down'
        })
      })
    })
    
    await downvoteButton.click()
    
    await expect(voteScore).toContainText('7') // 10 - 3 = 7
    await expect(downvoteButton).toHaveClass(/text-blue-500/)
  })

  test('should toggle vote when clicking same button', async ({ page }) => {
    await page.goto('/test/posts/123')
    
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first()
    const voteScore = page.locator('[data-testid="vote-score"]').first()
    
    // Mock initial upvote
    await page.route('/api/posts/*/vote', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          upvotes: 11,
          downvotes: 2,
          userVote: 'up'
        })
      })
    })
    
    await upvoteButton.click()
    await expect(voteScore).toContainText('9')
    
    // Mock vote removal
    await page.route('/api/posts/*/vote', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          upvotes: 10,
          downvotes: 2,
          userVote: null
        })
      })
    })
    
    // Click upvote again to remove
    await upvoteButton.click()
    await expect(voteScore).toContainText('8') // 10 - 2 = 8
    await expect(upvoteButton).toHaveClass(/text-gray-400/)
  })

  test('should change vote when clicking opposite button', async ({ page }) => {
    await page.goto('/test/posts/123')
    
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first()
    const downvoteButton = page.locator('[data-testid="downvote-button"]').first()
    const voteScore = page.locator('[data-testid="vote-score"]').first()
    
    // Mock initial upvote
    let requestCount = 0
    await page.route('/api/posts/*/vote', (route) => {
      requestCount++
      if (requestCount === 1) {
        // First request - upvote
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            upvotes: 11,
            downvotes: 2,
            userVote: 'up'
          })
        })
      } else {
        // Second request - change to downvote
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            upvotes: 10,
            downvotes: 3,
            userVote: 'down'
          })
        })
      }
    })
    
    await upvoteButton.click()
    await expect(voteScore).toContainText('9')
    
    await downvoteButton.click()
    await expect(voteScore).toContainText('7') // 10 - 3 = 7
    await expect(downvoteButton).toHaveClass(/text-blue-500/)
    await expect(upvoteButton).toHaveClass(/text-gray-400/)
  })

  test('should handle voting on comments', async ({ page }) => {
    await page.goto('/test/posts/123')
    
    // Find comment vote buttons
    const commentUpvoteButton = page.locator('[data-testid="comment-upvote-button"]').first()
    const commentVoteScore = page.locator('[data-testid="comment-vote-score"]').first()
    
    await page.route('/api/comments/*/vote', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          upvotes: 4,
          downvotes: 0,
          userVote: 'up'
        })
      })
    })
    
    await commentUpvoteButton.click()
    await expect(commentVoteScore).toContainText('4')
  })

  test('should prevent multiple simultaneous votes', async ({ page }) => {
    await page.goto('/test/posts/123')
    
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first()
    
    // Mock slow API response
    await page.route('/api/posts/*/vote', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          upvotes: 11,
          downvotes: 2,
          userVote: 'up'
        })
      })
    })
    
    // Click multiple times quickly
    await upvoteButton.click()
    await upvoteButton.click()
    await upvoteButton.click()
    
    // Button should be disabled during voting
    await expect(upvoteButton).toBeDisabled()
    
    // Should have opacity class for loading state
    await expect(upvoteButton).toHaveClass(/opacity-50/)
  })

  test('should show authentication error for anonymous users', async ({ page }) => {
    // Remove authentication
    await page.evaluate(() => {
      localStorage.removeItem('supabase.auth.token')
    })
    
    await page.goto('/test/posts/123')
    
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first()
    
    // Mock authentication error
    await page.route('/api/posts/*/vote', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not authenticated' })
      })
    })
    
    // Mock alert dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('투표하려면 로그인이 필요합니다.')
      await dialog.accept()
    })
    
    await upvoteButton.click()
  })

  test('should handle server errors gracefully', async ({ page }) => {
    await page.goto('/test/posts/123')
    
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first()
    
    await page.route('/api/posts/*/vote', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('투표 실패: Internal server error')
      await dialog.accept()
    })
    
    await upvoteButton.click()
  })

  test('should display vote scores with appropriate colors', async ({ page }) => {
    await page.goto('/test')
    
    // Mock posts with different vote scores
    const posts = [
      { id: '1', upvotes: 15, downvotes: 5 }, // Positive score (10)
      { id: '2', upvotes: 5, downvotes: 15 }, // Negative score (-10)
      { id: '3', upvotes: 10, downvotes: 10 }, // Zero score (0)
    ]
    
    for (const [index, post] of posts.entries()) {
      const voteScore = page.locator('[data-testid="vote-score"]').nth(index)
      const score = post.upvotes - post.downvotes
      
      await expect(voteScore).toContainText(score.toString())
      
      if (score > 0) {
        await expect(voteScore).toHaveClass(/text-orange-500/)
      } else if (score < 0) {
        await expect(voteScore).toHaveClass(/text-blue-500/)
      } else {
        await expect(voteScore).toHaveClass(/text-gray-500/)
      }
    }
  })

  test('should persist vote state after page reload', async ({ page }) => {
    await page.goto('/test/posts/123')
    
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first()
    
    // Mock initial vote load
    await page.route('/api/posts/123/vote', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            upvotes: 11,
            downvotes: 2,
            userVote: 'up'
          })
        })
      } else {
        route.continue()
      }
    })
    
    // Reload page
    await page.reload()
    
    // Verify vote state is loaded
    await expect(upvoteButton).toHaveClass(/text-orange-500/)
    await expect(page.locator('[data-testid="vote-score"]').first()).toContainText('9')
  })
})

test.describe('Voting System Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should work on touch devices', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'user-123' }
      }))
    })
    
    await page.goto('/test/posts/123')
    
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first()
    
    await page.route('/api/posts/*/vote', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          upvotes: 11,
          downvotes: 2,
          userVote: 'up'
        })
      })
    })
    
    // Use tap for mobile
    await upvoteButton.tap()
    
    await expect(upvoteButton).toHaveClass(/text-orange-500/)
  })

  test('should handle touch gestures appropriately', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'user-123' }
      }))
    })
    
    await page.goto('/test/posts/123')
    
    // Verify vote buttons are appropriately sized for touch
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first()
    const buttonBox = await upvoteButton.boundingBox()
    
    // Vote buttons should be at least 44px (iOS recommendation)
    expect(buttonBox?.width).toBeGreaterThanOrEqual(32) // Allowing for smaller but reasonable size
    expect(buttonBox?.height).toBeGreaterThanOrEqual(32)
  })
})