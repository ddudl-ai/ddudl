// MSW handlers for API mocking during testing
import { http, HttpResponse } from 'msw'
import { CreatePostRequest, CreatePostResponse, UploadImageResponse, LinkPreviewResponse } from '@/types/forms'

const BASE_URL = process.env.NODE_ENV === 'test' ? '' : 'http://localhost:3000'

export const handlers = [
  // POST /api/posts - Create new post
  http.post(`${BASE_URL}/api/posts`, async ({ request }) => {
    const body = await request.json() as CreatePostRequest

    // Simulate validation errors for testing
    if (!body.title || body.title.length < 5) {
      return HttpResponse.json({
        error: 'Title must be at least 5 characters long',
        code: 'TITLE_TOO_SHORT'
      }, { status: 400 })
    }

    if (body.authorName === 'blocked-user') {
      return HttpResponse.json({
        error: 'User is blocked',
        code: 'USER_BLOCKED'
      }, { status: 403 })
    }

    // Simulate CAPTCHA validation for anonymous users
    if (body.authorName.startsWith('ddudl이') && !body.captchaToken) {
      return HttpResponse.json({
        error: 'CAPTCHA verification required',
        code: 'CAPTCHA_REQUIRED'
      }, { status: 401 })
    }

    // Success response
    const response: CreatePostResponse = {
      post: {
        id: `post-${Date.now()}`,
        title: body.title,
        content: body.content,
        authorName: body.authorName,
        channelName: body.channelName,
        flair: body.flair,
        images: body.images || [],
        allowGuestComments: body.allowGuestComments ?? true,
        createdAt: new Date().toISOString(),
      }
    }

    return HttpResponse.json(response, { status: 201 })
  }),

  // PATCH /api/posts/[id] - Update existing post
  http.patch(`${BASE_URL}/api/posts/:postId`, async ({ request, params }) => {
    const { postId } = params
    const body = await request.json() as Partial<CreatePostRequest>

    if (postId === 'non-existent') {
      return HttpResponse.json({
        error: 'Post not found',
        code: 'POST_NOT_FOUND'
      }, { status: 404 })
    }

    if (postId === 'unauthorized') {
      return HttpResponse.json({
        error: 'Not authorized to update this post',
        code: 'UNAUTHORIZED'
      }, { status: 403 })
    }

    // Success response
    const response: CreatePostResponse = {
      post: {
        id: postId as string,
        title: body.title || 'Updated Post Title',
        content: body.content,
        authorName: body.authorName || 'Test Author',
        channelName: body.channelName || 'test-channel',
        flair: body.flair,
        images: body.images || [],
        allowGuestComments: body.allowGuestComments ?? true,
        createdAt: '2025-01-01T00:00:00.000Z',
      }
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // POST /api/uploads/image - Upload image
  http.post(`${BASE_URL}/api/uploads/image`, async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return HttpResponse.json({
        error: 'No file provided',
        code: 'NO_FILE'
      }, { status: 400 })
    }

    // Simulate file size validation
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return HttpResponse.json({
        error: 'File too large. Maximum size is 10MB',
        code: 'FILE_TOO_LARGE'
      }, { status: 400 })
    }

    // Simulate unsupported file type
    if (!file.type.startsWith('image/')) {
      return HttpResponse.json({
        error: 'Unsupported file type. Only images are allowed',
        code: 'INVALID_FILE_TYPE'
      }, { status: 400 })
    }

    // Simulate slow upload for testing loading states
    const isSlowUpload = file.name.includes('slow')
    if (isSlowUpload) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Simulate upload failure
    if (file.name.includes('fail')) {
      return HttpResponse.json({
        error: 'Upload failed',
        code: 'UPLOAD_ERROR'
      }, { status: 500 })
    }

    // Success response
    const response: UploadImageResponse = {
      url: `https://example.com/images/${file.name}-${Date.now()}.webp`,
      processedSize: Math.floor(file.size * 0.7), // Simulate compression
      originalSize: file.size,
      compressionRatio: 30,
      format: 'webp'
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // POST /api/link-preview - Generate link preview
  http.post(`${BASE_URL}/api/link-preview`, async ({ request }) => {
    const { url } = await request.json() as { url: string }

    if (!url) {
      return HttpResponse.json({
        error: 'URL is required',
        code: 'URL_REQUIRED'
      }, { status: 400 })
    }

    // Simulate invalid URL
    if (url === 'invalid-url') {
      return HttpResponse.json({
        error: 'Invalid URL format',
        code: 'INVALID_URL'
      }, { status: 400 })
    }

    // Simulate timeout
    if (url.includes('timeout')) {
      return HttpResponse.json({
        error: 'Request timeout',
        code: 'TIMEOUT'
      }, { status: 408 })
    }

    // Simulate not found
    if (url.includes('404')) {
      return HttpResponse.json({
        error: 'URL not accessible',
        code: 'NOT_FOUND'
      }, { status: 404 })
    }

    // YouTube URL handling
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const response: LinkPreviewResponse = {
        title: 'Sample YouTube Video',
        description: 'This is a sample YouTube video description for testing purposes.',
        image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        siteName: 'YouTube',
        favicon: 'https://www.youtube.com/favicon.ico'
      }

      return HttpResponse.json(response, { status: 200 })
    }

    // Generic URL handling
    const response: LinkPreviewResponse = {
      title: 'Sample Website Title',
      description: 'This is a sample website description for testing link preview functionality.',
      image: 'https://via.placeholder.com/600x315/0066cc/ffffff?text=Link+Preview',
      siteName: 'Example.com',
      favicon: 'https://example.com/favicon.ico'
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // GET /api/posts/[id] - Get post for editing
  http.get(`${BASE_URL}/api/posts/:postId`, ({ params }) => {
    const { postId } = params

    if (postId === 'non-existent') {
      return HttpResponse.json({
        error: 'Post not found',
        code: 'POST_NOT_FOUND'
      }, { status: 404 })
    }

    const response = {
      post: {
        id: postId as string,
        title: 'Existing Post Title',
        content: 'This is the existing post content for editing.',
        authorName: 'Test Author',
        channelName: 'test-channel',
        flair: '일반',
        images: ['https://example.com/image1.jpg'],
        allowGuestComments: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      }
    }

    return HttpResponse.json(response, { status: 200 })
  })
]

// Error handlers for network failures
export const errorHandlers = [
  http.post(`${BASE_URL}/api/posts`, () => {
    return HttpResponse.error()
  }),

  http.post(`${BASE_URL}/api/uploads/image`, () => {
    return HttpResponse.error()
  }),

  http.post(`${BASE_URL}/api/link-preview`, () => {
    return HttpResponse.error()
  })
]

// Success handlers with delays for testing loading states
export const slowHandlers = [
  http.post(`${BASE_URL}/api/posts`, async ({ request }) => {
    await new Promise(resolve => setTimeout(resolve, 3000))
    return HttpResponse.json({
      post: {
        id: 'slow-post',
        title: 'Slow Post',
        content: 'This post was created slowly',
        authorName: 'Slow User',
        channelName: 'test-channel',
        flair: '일반',
        images: [],
        allowGuestComments: true,
        createdAt: new Date().toISOString(),
      }
    }, { status: 201 })
  })
]