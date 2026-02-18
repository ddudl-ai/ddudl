// E2E test for media persistence after post save

import { test, expect, Page } from '@playwright/test'
import path from 'path'

test.describe('WritePostForm Media Persistence', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage

    // Navigate to write page
    await page.goto('/ai/write')

    // Wait for the form to be ready
    await page.waitForSelector('[data-testid="write-post-form"], form', { timeout: 10000 })
  })

  test('should persist uploaded images after post creation', async () => {
    // Create test image files
    const testImagePath1 = path.join(__dirname, 'fixtures', 'test-image-1.jpg')
    const testImagePath2 = path.join(__dirname, 'fixtures', 'test-image-2.png')

    // Fill basic form fields
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Image Persistence Test Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    // Upload images
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testImagePath1, testImagePath2])

    // Wait for uploads to complete
    await expect(page.locator('.upload-gallery, [data-testid="upload-gallery"]')).toBeVisible({ timeout: 15000 })

    // Wait for both thumbnails to appear
    const thumbnails = page.locator('.upload-thumbnail, [data-testid="upload-thumbnail"]')
    await expect(thumbnails).toHaveCount(2, { timeout: 10000 })

    // Insert both images into editor
    await thumbnails.first().click()
    await page.waitForTimeout(500)
    await thumbnails.nth(1).click()
    await page.waitForTimeout(500)

    // Verify images appear in editor
    const editorImages = page.locator('.jodit-wysiwyg img, [data-testid="jodit-editor"] img')
    await expect(editorImages).toHaveCount(2, { timeout: 5000 })

    // Add some additional text content
    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill(`
      <h2>Test Post with Images</h2>
      <p>This is the first paragraph before images.</p>
      <img src="${await editorImages.first().getAttribute('src')}" alt="test image 1" />
      <p>This is text between the two images.</p>
      <img src="${await editorImages.nth(1).getAttribute('src')}" alt="test image 2" />
      <p>This is the final paragraph after images.</p>
    `)

    // Submit the form
    await page.click('[data-testid="submit-button"], button[type="submit"], button:has-text("게시")')

    // Wait for successful submission and redirect
    await expect(page).toHaveURL(/\/posts\/|\/ai\/\d+/, { timeout: 20000 })

    // Verify we're on the created post page
    await page.waitForSelector('article, .post-content, [data-testid="post-content"]', { timeout: 10000 })

    // Check that all images are present in the saved post
    const savedPostImages = page.locator('article img, .post-content img, [data-testid="post-content"] img')
    await expect(savedPostImages).toHaveCount(2, { timeout: 5000 })

    // Verify images have valid Supabase Storage URLs
    for (let i = 0; i < 2; i++) {
      const imageSrc = await savedPostImages.nth(i).getAttribute('src')
      expect(imageSrc).toMatch(/https:\/\/.*storage\.supabase\.co.*\.(webp|jpg|png)/)
    }

    // Verify text content is also preserved
    const postContent = page.locator('article, .post-content, [data-testid="post-content"]')
    await expect(postContent).toContainText('This is the first paragraph before images')
    await expect(postContent).toContainText('This is text between the two images')
    await expect(postContent).toContainText('This is the final paragraph after images')

    // Verify post title is displayed
    const postTitle = page.locator('h1, .post-title, [data-testid="post-title"]')
    await expect(postTitle).toContainText('Image Persistence Test Post')
  })

  test('should persist YouTube embeds after post creation', async () => {
    // Fill form with YouTube content
    await page.fill('[data-testid="title-input"], input[name="title"]', 'YouTube Embed Test Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    // Add content with YouTube embed to editor
    const youTubeContent = `
      <h2>Post with YouTube Video</h2>
      <p>Check out this video:</p>
      <iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>
      <p>That was an amazing video!</p>
    `

    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill(youTubeContent)

    // Submit the form
    await page.click('[data-testid="submit-button"], button[type="submit"], button:has-text("게시")')

    // Wait for successful submission and redirect
    await expect(page).toHaveURL(/\/posts\/|\/ai\/\d+/, { timeout: 15000 })

    // Wait for post content to load
    await page.waitForSelector('article, .post-content', { timeout: 10000 })

    // Verify YouTube iframe is present and functional
    const youtubeIframe = page.locator('article iframe, .post-content iframe')
    await expect(youtubeIframe).toBeVisible()

    const iframeSrc = await youtubeIframe.getAttribute('src')
    expect(iframeSrc).toContain('youtube.com/embed/')

    // Verify surrounding text content
    const postContent = page.locator('article, .post-content')
    await expect(postContent).toContainText('Check out this video')
    await expect(postContent).toContainText('That was an amazing video')
  })

  test('should persist mixed media content (images + YouTube)', async () => {
    // Create test image
    const testImagePath = path.join(__dirname, 'fixtures', 'mixed-media-test.jpg')

    // Fill form
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Mixed Media Test Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    // Upload image
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testImagePath])

    // Wait for upload to complete
    await expect(page.locator('.upload-gallery')).toBeVisible({ timeout: 10000 })
    const thumbnail = page.locator('.upload-thumbnail').first()
    await thumbnail.click()

    // Get the uploaded image URL
    const uploadedImage = page.locator('.jodit-wysiwyg img').first()
    const imageUrl = await uploadedImage.getAttribute('src')

    // Create mixed content
    const mixedContent = `
      <h1>Mixed Media Article</h1>
      <p>This post contains both images and videos.</p>

      <h2>First, an image:</h2>
      <img src="${imageUrl}" alt="Uploaded test image" />
      <p>Caption: This is our uploaded image.</p>

      <h2>Now, a YouTube video:</h2>
      <iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>
      <p>Caption: This is an embedded YouTube video.</p>

      <h2>Conclusion</h2>
      <p>Both media types should persist after saving the post.</p>
    `

    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill(mixedContent)

    // Submit the form
    await page.click('[data-testid="submit-button"], button[type="submit"], button:has-text("게시")')

    // Wait for redirect to post page
    await expect(page).toHaveURL(/\/posts\/|\/ai\/\d+/, { timeout: 15000 })
    await page.waitForSelector('article, .post-content', { timeout: 10000 })

    // Verify both image and YouTube embed are present
    const postImages = page.locator('article img, .post-content img')
    const postIframes = page.locator('article iframe, .post-content iframe')

    await expect(postImages).toHaveCount(1)
    await expect(postIframes).toHaveCount(1)

    // Verify image URL is from Supabase Storage
    const savedImageSrc = await postImages.first().getAttribute('src')
    expect(savedImageSrc).toMatch(/storage\.supabase\.co/)

    // Verify YouTube iframe
    const savedIframeSrc = await postIframes.first().getAttribute('src')
    expect(savedIframeSrc).toContain('youtube.com/embed/')

    // Verify all text content is preserved
    const postContent = page.locator('article, .post-content')
    await expect(postContent).toContainText('Mixed Media Article')
    await expect(postContent).toContainText('This is our uploaded image')
    await expect(postContent).toContainText('This is an embedded YouTube video')
    await expect(postContent).toContainText('Both media types should persist')
  })

  test('should handle large images without losing content', async () => {
    // Test with a larger image file
    const largeImagePath = path.join(__dirname, 'fixtures', 'large-test-image.jpg')

    await page.fill('[data-testid="title-input"], input[name="title"]', 'Large Image Test Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    // Upload large image
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([largeImagePath])

    // Wait for upload with longer timeout for large files
    await expect(page.locator('.upload-gallery')).toBeVisible({ timeout: 30000 })

    // Insert image into editor
    const thumbnail = page.locator('.upload-thumbnail').first()
    await thumbnail.click()

    // Add substantial text content
    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    const contentWithLargeImage = `
      <h1>Large Image Test</h1>
      <p>This post tests handling of large images. The image below should be automatically resized for display while maintaining quality.</p>

      ${await page.locator('.jodit-wysiwyg img').first().innerHTML()}

      <p>The large image above should be properly scaled and not break the layout. It should also persist correctly after saving.</p>

      <h2>Additional Content</h2>
      <p>This is additional content to ensure the large image doesn't interfere with other parts of the post.</p>
      <ul>
        <li>Large images should be optimized</li>
        <li>Content should not be lost</li>
        <li>Layout should remain intact</li>
      </ul>
    `

    await editor.fill(contentWithLargeImage)

    // Submit form
    await page.click('[data-testid="submit-button"], button[type="submit"], button:has-text("게시")')

    // Wait for post creation
    await expect(page).toHaveURL(/\/posts\/|\/ai\/\d+/, { timeout: 25000 })
    await page.waitForSelector('article, .post-content', { timeout: 10000 })

    // Verify image is present and properly sized
    const savedImage = page.locator('article img, .post-content img').first()
    await expect(savedImage).toBeVisible()

    // Check that image has reasonable dimensions (should be constrained)
    const imageBounds = await savedImage.boundingBox()
    expect(imageBounds).toBeTruthy()
    if (imageBounds) {
      expect(imageBounds.width).toBeLessThanOrEqual(800) // Should respect max-width constraints
    }

    // Verify all text content is preserved
    const postContent = page.locator('article, .post-content')
    await expect(postContent).toContainText('Large Image Test')
    await expect(postContent).toContainText('automatically resized for display')
    await expect(postContent).toContainText('Additional Content')
    await expect(postContent).toContainText('Large images should be optimized')
  })

  test('should handle post editing and media preservation', async () => {
    // Create initial post with media
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Editable Media Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    // Upload image
    const testImagePath = path.join(__dirname, 'fixtures', 'edit-test-image.jpg')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testImagePath])

    await expect(page.locator('.upload-gallery')).toBeVisible({ timeout: 10000 })
    await page.locator('.upload-thumbnail').first().click()

    // Add initial content
    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill(`
      <h2>Original Content</h2>
      <p>This is the original post content.</p>
      <img src="${await page.locator('.jodit-wysiwyg img').first().getAttribute('src')}" alt="original image" />
      <p>Text after image.</p>
    `)

    // Submit initial post
    await page.click('[data-testid="submit-button"], button[type="submit"], button:has-text("게시")')
    await expect(page).toHaveURL(/\/posts\/|\/ai\/\d+/, { timeout: 15000 })

    // Verify initial post was created with media
    await page.waitForSelector('article img, .post-content img', { timeout: 5000 })
    const initialImage = page.locator('article img, .post-content img').first()
    await expect(initialImage).toBeVisible()

    // If there's an edit button, test editing functionality
    const editButton = page.locator('[data-testid="edit-post"], .edit-button, a:has-text("Edit")')

    if (await editButton.isVisible()) {
      await editButton.click()

      // Should return to edit form
      await page.waitForSelector('[data-testid="write-post-form"], form', { timeout: 5000 })

      // Verify original content and media are loaded
      const loadedEditor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
      const editorContent = await loadedEditor.inputValue()

      expect(editorContent).toContain('Original Content')
      expect(editorContent).toContain('<img')

      // Modify content while preserving media
      await loadedEditor.fill(`
        <h2>Updated Content</h2>
        <p>This is the updated post content.</p>
        <img src="${await page.locator('.jodit-wysiwyg img').first().getAttribute('src')}" alt="preserved image" />
        <p>Updated text after image.</p>
        <p>Additional paragraph added in edit.</p>
      `)

      // Submit updated post
      await page.click('[data-testid="submit-button"], button[type="submit"], button:has-text("게시")')
      await expect(page).toHaveURL(/\/posts\/|\/ai\/\d+/, { timeout: 15000 })

      // Verify updated content and preserved media
      const postContent = page.locator('article, .post-content')
      await expect(postContent).toContainText('Updated Content')
      await expect(postContent).toContainText('Additional paragraph added in edit')

      const preservedImage = page.locator('article img, .post-content img').first()
      await expect(preservedImage).toBeVisible()

      const preservedImageSrc = await preservedImage.getAttribute('src')
      expect(preservedImageSrc).toMatch(/storage\.supabase\.co/)
    }
  })

  test('should handle network interruptions during save gracefully', async () => {
    // Fill form with media content
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Network Test Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    const testImagePath = path.join(__dirname, 'fixtures', 'network-test-image.jpg')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testImagePath])

    await expect(page.locator('.upload-gallery')).toBeVisible({ timeout: 10000 })
    await page.locator('.upload-thumbnail').first().click()

    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill(`
      <h2>Network Resilience Test</h2>
      <p>Testing post save with network issues.</p>
      <img src="${await page.locator('.jodit-wysiwyg img').first().getAttribute('src')}" alt="test image" />
      <p>This content should persist even with network delays.</p>
    `)

    // Simulate network delay/interruption
    await page.route('**/api/posts', route => {
      // Delay the response to simulate slow network
      setTimeout(() => {
        route.continue()
      }, 3000)
    })

    // Submit form
    await page.click('[data-testid="submit-button"], button[type="submit"], button:has-text("게시")')

    // Should show loading state during network delay
    const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner')
    await expect(loadingIndicator).toBeVisible({ timeout: 2000 })

    // Eventually should succeed and redirect
    await expect(page).toHaveURL(/\/posts\/|\/ai\/\d+/, { timeout: 30000 })

    // Verify content persisted correctly despite network delay
    await page.waitForSelector('article, .post-content', { timeout: 10000 })
    const savedImage = page.locator('article img, .post-content img').first()
    await expect(savedImage).toBeVisible()

    const postContent = page.locator('article, .post-content')
    await expect(postContent).toContainText('Network Resilience Test')
    await expect(postContent).toContainText('This content should persist')
  })
})

test.describe('Media Cleanup and Management', () => {
  test('should clean up unused uploaded media', async ({ page }) => {
    await page.goto('/ai/write')
    await page.waitForSelector('[data-testid="write-post-form"], form', { timeout: 10000 })

    // Upload image but don't use it in post
    const testImagePath = path.join(__dirname, 'fixtures', 'unused-image.jpg')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([testImagePath])

    await expect(page.locator('.upload-gallery')).toBeVisible({ timeout: 10000 })

    // Don't insert the image into editor, just submit with text only
    await page.fill('[data-testid="title-input"], input[name="title"]', 'Text Only Post')
    await page.fill('[data-testid="author-input"], input[name="author"]', 'Test Author')

    const editor = page.locator('.jodit-wysiwyg, [data-testid="jodit-editor"], textarea')
    await editor.fill('<h2>Text Only</h2><p>This post has no images in the content.</p>')

    // Submit form
    await page.click('[data-testid="submit-button"], button[type="submit"], button:has-text("게시")')
    await expect(page).toHaveURL(/\/posts\/|\/ai\/\d+/, { timeout: 15000 })

    // Verify post has no images (unused media should be cleaned up)
    const postImages = page.locator('article img, .post-content img')
    await expect(postImages).toHaveCount(0)

    const postContent = page.locator('article, .post-content')
    await expect(postContent).toContainText('Text Only')
    await expect(postContent).toContainText('This post has no images')
  })
})

// These tests must FAIL initially as per TDD requirements
// The WritePostForm component and backend need to be implemented/fixed
// to properly persist media content after post creation