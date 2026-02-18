// E2E test for WritePostForm image upload functionality

import { test, expect, Page } from '@playwright/test'
import path from 'path'

test.describe('WritePostForm Image Upload', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    // Navigate to write page
    await page.goto('/ai/write')

    // Wait for the page to be ready
    await page.waitForSelector('[data-testid="write-post-form"]', { timeout: 10000 })
  })

  test('Complete image upload and post creation flow', async () => {
    // Create test image files in temporary directory
    const testImagePath1 = path.join(__dirname, 'fixtures', 'test-image-1.jpg')
    const testImagePath2 = path.join(__dirname, 'fixtures', 'test-image-2.png')

    // Upload image files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testImagePath1, testImagePath2])

    // Verify upload progress appears
    await expect(page.locator('.upload-progress, [data-testid="upload-progress"]')).toBeVisible({ timeout: 5000 })

    // Wait for upload to complete
    await expect(page.locator('.upload-gallery, [data-testid="upload-gallery"]')).toBeVisible({ timeout: 10000 })

    // Verify thumbnails appear
    const thumbnails = page.locator('.upload-thumbnail, [data-testid="upload-thumbnail"]')
    await expect(thumbnails).toHaveCount(2)

    // Insert first image into editor by clicking thumbnail
    await thumbnails.first().click()

    // Verify image appears in Jodit editor
    const editorContent = page.locator('.jodit-wysiwyg')
    await expect(editorContent.locator('img')).toBeVisible({ timeout: 5000 })

    // Fill required form fields
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Test Post with Images')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    // Handle CAPTCHA if present (skip in test environment)
    const captchaElement = page.locator('[data-testid="captcha"], .captcha-container')
    if (await captchaElement.isVisible()) {
      // In test environment, we might have a bypass or mock
      await page.click('[data-testid="captcha-bypass"], .captcha-test-bypass')
    }

    // Submit the form
    await page.click('[data-testid="submit-button"], button[type="submit"]')

    // Wait for submission to complete and navigate to post
    await expect(page).toHaveURL(/\/posts\/|\/ai\/\d+/, { timeout: 15000 })

    // Verify images persist in the saved post
    const postImages = page.locator('article img, .post-content img')
    await expect(postImages).toHaveCount(1) // One image was inserted
    await expect(postImages.first()).toHaveAttribute('src', /storage\.supabase\.co/)
  })

  test('Upload validation - oversized file rejection', async () => {
    // This would require a large test file > 10MB
    // For testing purposes, we'll simulate with a smaller file and mock the validation

    const testLargeImagePath = path.join(__dirname, 'fixtures', 'large-image.jpg')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testLargeImagePath])

    // Expect error message for oversized file
    const errorMessage = page.locator('.upload-error, [data-testid="upload-error"]')
    await expect(errorMessage).toContainText(/파일 크기|file size|10MB/, { timeout: 5000 })

    // Verify form remains functional
    await expect(page.locator('[data-testid="write-post-form"]')).toBeVisible()
  })

  test('Upload validation - unsupported file format', async () => {
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testPdfPath])

    // Expect error message for unsupported format
    const errorMessage = page.locator('.upload-error, [data-testid="upload-error"]')
    await expect(errorMessage).toContainText(/지원하지 않는|unsupported|format/, { timeout: 5000 })
  })

  test('FileList timing bug verification', async () => {
    // This test specifically checks for the FileList timing issue
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image-1.jpg')

    // Monitor console for the specific error
    const consoleMessages: string[] = []
    page.on('console', (msg) => {
      consoleMessages.push(msg.text())
    })

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testImagePath])

    // Wait for processing
    await page.waitForTimeout(2000)

    // Verify no "FileList is empty" or similar errors in console
    const hasFileListError = consoleMessages.some(msg =>
      msg.includes('FileList is empty') ||
      msg.includes('files received: 0')
    )

    expect(hasFileListError).toBeFalsy()

    // Verify successful upload indication in console
    const hasSuccessLog = consoleMessages.some(msg =>
      msg.includes('files received:') &&
      !msg.includes('files received: 0')
    )

    expect(hasSuccessLog).toBeTruthy()
  })

  test('Image adaptive sizing behavior', async () => {
    // Test with images of different sizes
    const smallImagePath = path.join(__dirname, 'fixtures', 'small-image.png') // < 800px width
    const largeImagePath = path.join(__dirname, 'fixtures', 'large-image.jpg') // > 1920px width

    // Upload both images
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([smallImagePath, largeImagePath])

    // Wait for uploads to complete
    await expect(page.locator('.upload-gallery, [data-testid="upload-gallery"]')).toBeVisible()

    // Insert both images
    const thumbnails = page.locator('.upload-thumbnail, [data-testid="upload-thumbnail"]')
    await thumbnails.first().click() // Small image
    await thumbnails.nth(1).click() // Large image

    // Verify images in editor have appropriate sizing
    const editorImages = page.locator('.jodit-wysiwyg img')
    await expect(editorImages).toHaveCount(2)

    // Check CSS max-width constraints are applied
    for (let i = 0; i < 2; i++) {
      const img = editorImages.nth(i)
      const maxWidth = await img.evaluate((el) => {
        const computedStyle = window.getComputedStyle(el)
        return computedStyle.maxWidth
      })

      // Should have max-width constraint (either explicit or from CSS custom property)
      expect(maxWidth).not.toBe('none')
    }
  })

  test('Responsive behavior on window resize', async () => {
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image-1.jpg')

    // Upload and insert image
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testImagePath])

    await expect(page.locator('.upload-gallery')).toBeVisible()
    await page.locator('.upload-thumbnail').first().click()

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1024, height: 768 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(500) // Allow layout to settle

      const editorImage = page.locator('.jodit-wysiwyg img').first()
      if (await editorImage.isVisible()) {
        const imageWidth = await editorImage.evaluate((el) => el.getBoundingClientRect().width)

        // Image should not exceed viewport width minus padding
        expect(imageWidth).toBeLessThanOrEqual(viewport.width)
      }
    }
  })

  test('Upload retry mechanism', async () => {
    // Mock network failure for first attempt
    await page.route('/api/upload', (route) => {
      // Fail the first request, succeed on retry
      if (route.request().url().includes('retry=1')) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            files: ['https://storage.supabase.co/v1/object/public/post-images/test.webp'],
            isImages: [true]
          })
        })
      } else {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            error: { message: 'Network error' }
          })
        })
      }
    })

    const testImagePath = path.join(__dirname, 'fixtures', 'test-image-1.jpg')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testImagePath])

    // Should show error initially
    await expect(page.locator('.upload-error')).toBeVisible({ timeout: 5000 })

    // Look for retry button and click it
    const retryButton = page.locator('[data-testid="retry-upload"], .retry-button')
    if (await retryButton.isVisible()) {
      await retryButton.click()

      // Should succeed on retry
      await expect(page.locator('.upload-gallery')).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('WritePostForm Layout and Z-Index', () => {
  test('Preview mode maintains proper layout', async ({ page }) => {
    await page.goto('/ai/write')
    await page.waitForSelector('[data-testid="write-post-form"]')

    // Add some content
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Test Layout Post')

    // Check if preview mode toggle exists
    const previewToggle = page.locator('[data-testid="preview-toggle"], .preview-mode-toggle')

    if (await previewToggle.isVisible()) {
      await previewToggle.click()

      // Test scroll behavior in preview mode
      await page.evaluate(() => window.scrollTo(0, 1000))

      // Verify header remains visible and properly layered
      const header = page.locator('header, [data-testid="header"]')
      await expect(header).toBeVisible()

      // Check that preview content doesn't overlap header
      const headerBounds = await header.boundingBox()
      const previewContent = page.locator('.preview-content, [data-testid="preview-content"]')

      if (await previewContent.isVisible()) {
        const contentBounds = await previewContent.boundingBox()

        if (headerBounds && contentBounds) {
          expect(contentBounds.y).toBeGreaterThanOrEqual(headerBounds.height - 10) // Allow 10px margin
        }
      }
    }
  })
})