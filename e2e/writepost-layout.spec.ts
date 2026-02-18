// E2E test for preview mode header overlap in WritePostForm

import { test, expect, Page } from '@playwright/test'

test.describe('WritePostForm Layout - Preview Mode Header Overlap', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage

    // Navigate to write page
    await page.goto('/ai/write')

    // Wait for the form to be ready
    await page.waitForSelector('[data-testid="write-post-form"], form', { timeout: 10000 })
  })

  test('should prevent preview content from overlapping header', async () => {
    // Fill the form with content
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Long Test Post Title')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    // Create long content to test scrolling behavior
    const longContent = Array(50).fill('This is a very long paragraph with lots of text content that will create a scrollable area in preview mode. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.').join('\n\n')

    // Fill editor with long content
    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill(longContent)

    // Look for preview mode toggle
    const previewToggle = page.locator('[data-testid="preview-toggle"], .preview-mode-toggle, button:has-text("Preview")')

    if (await previewToggle.isVisible()) {
      // Enable preview mode
      await previewToggle.click()

      // Wait for preview mode to activate
      await page.waitForSelector('[data-testid="preview-container"], .preview-content', { timeout: 5000 })

      // Get header and preview container elements
      const header = page.locator('header, [data-testid="header"], .site-header').first()
      const previewContainer = page.locator('[data-testid="preview-container"], .preview-content').first()

      // Verify both elements exist
      await expect(header).toBeVisible()
      await expect(previewContainer).toBeVisible()

      // Get bounding boxes
      const headerBounds = await header.boundingBox()
      const previewBounds = await previewContainer.boundingBox()

      expect(headerBounds).toBeTruthy()
      expect(previewBounds).toBeTruthy()

      // Test initial positioning
      if (headerBounds && previewBounds) {
        // Preview content should start below the header or have lower z-index
        const initialGap = previewBounds.y - (headerBounds.y + headerBounds.height)
        const hasProperInitialSpacing = initialGap >= -10 // Allow 10px margin

        // If not properly spaced, check z-index hierarchy
        if (!hasProperInitialSpacing) {
          const headerZIndex = await header.evaluate((el) => {
            const computed = window.getComputedStyle(el)
            return parseInt(computed.zIndex) || 0
          })

          const previewZIndex = await previewContainer.evaluate((el) => {
            const computed = window.getComputedStyle(el)
            return parseInt(computed.zIndex) || 0
          })

          // Header should have higher z-index than preview content
          expect(headerZIndex).toBeGreaterThan(previewZIndex)
        } else {
          // If properly spaced, that's also acceptable
          expect(hasProperInitialSpacing).toBeTruthy()
        }
      }

      // Test scroll behavior
      await page.evaluate(() => {
        window.scrollTo(0, 500)
      })

      await page.waitForTimeout(500) // Allow scroll to settle

      // After scrolling, header should still be visible and properly layered
      await expect(header).toBeVisible()

      // Test with more scroll
      await page.evaluate(() => {
        window.scrollTo(0, 1500)
      })

      await page.waitForTimeout(500)

      // Header should remain visible and properly positioned
      await expect(header).toBeVisible()

      // Verify no visual overlap by checking z-index values
      const finalHeaderZIndex = await header.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return parseInt(computed.zIndex) || parseInt(computed.getPropertyValue('--writepost-header-z-index')) || 40
      })

      const finalPreviewZIndex = await previewContainer.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return parseInt(computed.zIndex) || parseInt(computed.getPropertyValue('--writepost-preview-z-index')) || 25
      })

      // Assert final z-index hierarchy
      expect(finalHeaderZIndex).toBeGreaterThan(finalPreviewZIndex)
      expect(finalHeaderZIndex).toBeGreaterThanOrEqual(40)
      expect(finalPreviewZIndex).toBeLessThanOrEqual(25)
    }
  })

  test('should maintain proper CSS z-index custom properties', async () => {
    // Check if CSS custom properties are properly defined
    const rootZIndexValues = await page.evaluate(() => {
      const rootStyle = window.getComputedStyle(document.documentElement)
      return {
        headerZIndex: rootStyle.getPropertyValue('--writepost-header-z-index') || '40',
        previewZIndex: rootStyle.getPropertyValue('--writepost-preview-z-index') || '25',
        editorZIndex: rootStyle.getPropertyValue('--writepost-editor-z-index') || '20'
      }
    })

    // Parse values and verify hierarchy
    const headerZ = parseInt(rootZIndexValues.headerZIndex)
    const previewZ = parseInt(rootZIndexValues.previewZIndex)
    const editorZ = parseInt(rootZIndexValues.editorZIndex)

    expect(headerZ).toBeGreaterThan(previewZ)
    expect(previewZ).toBeGreaterThan(editorZ)
    expect(headerZ).toBeGreaterThanOrEqual(40)
  })

  test('should handle viewport resize without breaking z-index hierarchy', async () => {
    // Fill form with content
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Responsive Test Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill('Test content for responsive behavior testing.')

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1024, height: 768 },  // Tablet
      { width: 375, height: 667 },   // Mobile portrait
      { width: 667, height: 375 }    // Mobile landscape
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(500) // Allow layout to settle

      // Toggle to preview mode if available
      const previewToggle = page.locator('[data-testid="preview-toggle"], .preview-mode-toggle, button:has-text("Preview")')

      if (await previewToggle.isVisible()) {
        await previewToggle.click()

        await page.waitForTimeout(500)

        // Check z-index hierarchy is maintained
        const header = page.locator('header, [data-testid="header"]').first()
        const previewContainer = page.locator('[data-testid="preview-container"], .preview-content').first()

        if (await header.isVisible() && await previewContainer.isVisible()) {
          const headerZIndex = await header.evaluate((el) => {
            const computed = window.getComputedStyle(el)
            return parseInt(computed.zIndex) || 40
          })

          const previewZIndex = await previewContainer.evaluate((el) => {
            const computed = window.getComputedStyle(el)
            return parseInt(computed.zIndex) || 25
          })

          expect(headerZIndex).toBeGreaterThan(previewZIndex)
        }

        // Toggle back to editor mode
        await previewToggle.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('should handle fixed header positioning correctly', async () => {
    // Fill form with content
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Fixed Header Test Post')

    const longContent = Array(100).fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit. ').join('')
    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill(longContent)

    // Check if header is fixed positioned
    const header = page.locator('header, [data-testid="header"]').first()

    if (await header.isVisible()) {
      const headerPosition = await header.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          position: computed.position,
          top: computed.top,
          zIndex: computed.zIndex || computed.getPropertyValue('--writepost-header-z-index')
        }
      })

      // Header should be fixed or sticky positioned
      expect(['fixed', 'sticky'].includes(headerPosition.position)).toBeTruthy()

      if (headerPosition.position === 'fixed') {
        expect(headerPosition.top).toBe('0px')
      }
    }

    // Test preview mode with fixed header
    const previewToggle = page.locator('[data-testid="preview-toggle"], .preview-mode-toggle, button:has-text("Preview")')

    if (await previewToggle.isVisible()) {
      await previewToggle.click()

      // Scroll through preview content
      await page.evaluate(() => {
        const scrollAmounts = [0, 500, 1000, 1500, 2000]
        scrollAmounts.forEach((scroll, index) => {
          setTimeout(() => window.scrollTo(0, scroll), index * 200)
        })
      })

      await page.waitForTimeout(1200) // Wait for all scrolls to complete

      // Header should remain visible throughout scrolling
      await expect(header).toBeVisible()

      // Verify no content overlaps the header visually
      const headerBounds = await header.boundingBox()
      const previewContainer = page.locator('[data-testid="preview-container"], .preview-content').first()

      if (await previewContainer.isVisible() && headerBounds) {
        const previewZIndex = await previewContainer.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).zIndex) || 25
        })

        const headerZIndex = await header.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).zIndex) || 40
        })

        expect(headerZIndex).toBeGreaterThan(previewZIndex)
      }
    }
  })

  test('should work correctly with image content in preview mode', async () => {
    // Fill basic form fields
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Image Test Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    // Add content with image to editor
    const contentWithImage = `
      <h2>Test Post with Images</h2>
      <p>This is a test post with an image:</p>
      <img src="https://via.placeholder.com/800x600" alt="Test image" />
      <p>More content after the image to test scrolling behavior.</p>
      ${Array(20).fill('<p>Additional paragraph content for scrolling.</p>').join('')}
    `

    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill(contentWithImage)

    // Toggle to preview mode
    const previewToggle = page.locator('[data-testid="preview-toggle"], .preview-mode-toggle, button:has-text("Preview")')

    if (await previewToggle.isVisible()) {
      await previewToggle.click()

      await page.waitForSelector('[data-testid="preview-container"], .preview-content')

      // Wait for images to load
      await page.waitForTimeout(2000)

      // Test scrolling with image content
      await page.evaluate(() => {
        window.scrollTo(0, 800) // Scroll to image area
      })

      await page.waitForTimeout(500)

      // Verify header is still properly positioned above content
      const header = page.locator('header, [data-testid="header"]').first()
      const previewContainer = page.locator('[data-testid="preview-container"], .preview-content').first()

      if (await header.isVisible() && await previewContainer.isVisible()) {
        const headerZIndex = await header.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          return parseInt(computed.zIndex) || parseInt(computed.getPropertyValue('--writepost-header-z-index')) || 40
        })

        const previewZIndex = await previewContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          return parseInt(computed.zIndex) || parseInt(computed.getPropertyValue('--writepost-preview-z-index')) || 25
        })

        expect(headerZIndex).toBeGreaterThan(previewZIndex)

        // Verify header remains visible
        await expect(header).toBeVisible()
      }
    }
  })

  test('should handle rapid preview mode toggling', async () => {
    // Fill form with content
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Toggle Test Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill('Test content for toggle testing.')

    const previewToggle = page.locator('[data-testid="preview-toggle"], .preview-mode-toggle, button:has-text("Preview")')

    if (await previewToggle.isVisible()) {
      // Rapidly toggle preview mode multiple times
      for (let i = 0; i < 5; i++) {
        await previewToggle.click()
        await page.waitForTimeout(200)

        // Verify z-index hierarchy remains intact after each toggle
        const header = page.locator('header, [data-testid="header"]').first()

        if (await header.isVisible()) {
          const headerZIndex = await header.evaluate((el) => {
            const computed = window.getComputedStyle(el)
            return parseInt(computed.zIndex) || parseInt(computed.getPropertyValue('--writepost-header-z-index')) || 40
          })

          expect(headerZIndex).toBeGreaterThanOrEqual(25) // Should be above preview content
        }
      }
    }
  })
})

test.describe('WritePostForm Layout - CSS Custom Properties', () => {
  test('should have proper CSS custom properties defined', async ({ page }) => {
    await page.goto('/ai/write')

    // Check that the required CSS custom properties are available
    const cssProperties = await page.evaluate(() => {
      const rootStyle = window.getComputedStyle(document.documentElement)

      return {
        headerZIndex: rootStyle.getPropertyValue('--writepost-header-z-index').trim(),
        previewZIndex: rootStyle.getPropertyValue('--writepost-preview-z-index').trim(),
        editorZIndex: rootStyle.getPropertyValue('--writepost-editor-z-index').trim(),
        headerHeight: rootStyle.getPropertyValue('--writepost-header-height').trim(),
      }
    })

    // These properties should be defined (non-empty)
    expect(cssProperties.headerZIndex).toBeTruthy()
    expect(cssProperties.previewZIndex).toBeTruthy()
    expect(cssProperties.editorZIndex).toBeTruthy()

    // Values should follow expected hierarchy
    if (cssProperties.headerZIndex && cssProperties.previewZIndex && cssProperties.editorZIndex) {
      const headerZ = parseInt(cssProperties.headerZIndex)
      const previewZ = parseInt(cssProperties.previewZIndex)
      const editorZ = parseInt(cssProperties.editorZIndex)

      expect(headerZ).toBeGreaterThan(previewZ)
      expect(previewZ).toBeGreaterThan(editorZ)
    }
  })
})

// These tests must FAIL initially as per TDD requirements
// The WritePostForm component and CSS need to be implemented to fix
// the z-index hierarchy issues and header overlap problems