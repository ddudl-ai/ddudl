// Test utilities for file upload mocking

import { MediaAttachment, UploadResponse, UploadErrorResponse } from '@/types/writepost-improvements'

export class MockFile extends File {
  constructor(
    bits: BlobPart[],
    name: string,
    options?: FilePropertyBag & { size?: number }
  ) {
    super(bits, name, options)

    // Mock the size property if provided
    if (options?.size !== undefined) {
      Object.defineProperty(this, 'size', {
        value: options.size,
        writable: false
      })
    }
  }
}

export const createMockFile = (
  name: string,
  content: string = 'mock file content',
  type: string = 'image/jpeg',
  size?: number
): File => {
  return new MockFile([content], name, {
    type,
    size: size || content.length
  })
}

export const createMockImageFile = (
  name: string = 'test-image.jpg',
  sizeInBytes: number = 1024 * 1024 // 1MB default
): File => {
  const content = 'x'.repeat(Math.min(sizeInBytes, 1000)) // Limit content length for memory
  return createMockFile(name, content, 'image/jpeg', sizeInBytes)
}

export const createMockFileList = (files: File[]): FileList => {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < files.length; i++) {
        yield files[i]
      }
    }
  }

  // Add indexed properties
  files.forEach((file, index) => {
    ;(fileList as any)[index] = file
  })

  return fileList as FileList
}

export const mockUploadResponse: UploadResponse = {
  success: true,
  files: [
    'https://storage.supabase.co/v1/object/public/post-images/posts/2025/9/test-uuid-1.webp',
    'https://storage.supabase.co/v1/object/public/post-images/posts/2025/9/test-uuid-2.webp'
  ],
  isImages: [true, true],
  path: 'posts/2025/9/',
  baseurl: 'https://storage.supabase.co/v1/object/public/post-images/',
  error: null,
  msg: '이미지가 성공적으로 업로드되었습니다!'
}

export const mockUploadErrorResponse: UploadErrorResponse = {
  error: {
    message: '파일 크기는 10MB를 초과할 수 없습니다'
  }
}

export const createMockMediaAttachment = (
  overrides: Partial<MediaAttachment> = {}
): MediaAttachment => ({
  id: 'mock-attachment-id',
  post_id: 'mock-post-id',
  url: 'https://storage.supabase.co/v1/object/public/post-images/posts/2025/9/mock-image.webp',
  file_name: 'mock-image.jpg',
  file_size: 1024 * 1024, // 1MB
  mime_type: 'image/webp',
  upload_status: 'completed',
  created_at: new Date(),
  optimized: true,
  dimensions: {
    width: 1920,
    height: 1080,
    max_display_width: 800
  },
  ...overrides
})

// Mock fetch for upload API testing
export const mockFetch = (
  response: UploadResponse | UploadErrorResponse,
  ok: boolean = true,
  status: number = 200
) => {
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(response)
    })
  )
}

// Mock FormData for multipart uploads
export const mockFormData = () => {
  const formData = new Map()

  global.FormData = jest.fn().mockImplementation(() => ({
    append: jest.fn((key: string, value: any) => formData.set(key, value)),
    get: jest.fn((key: string) => formData.get(key)),
    has: jest.fn((key: string) => formData.has(key)),
    entries: jest.fn(() => formData.entries()),
    values: jest.fn(() => formData.values()),
    keys: jest.fn(() => formData.keys())
  }))

  return formData
}

// Mock file input event
export const createMockFileInputEvent = (files: File[]): React.ChangeEvent<HTMLInputElement> => {
  const fileList = createMockFileList(files)

  return {
    target: {
      files: fileList,
      value: files.map(f => f.name).join(',')
    } as HTMLInputElement,
    currentTarget: {} as HTMLInputElement,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn()
  } as unknown as React.ChangeEvent<HTMLInputElement>
}

// Mock URL.createObjectURL for image previews
export const mockCreateObjectURL = () => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-object-url')
  global.URL.revokeObjectURL = jest.fn()
}

// Utility to simulate upload progress
export class MockUploadProgress {
  private callbacks: ((progress: number) => void)[] = []

  onProgress(callback: (progress: number) => void) {
    this.callbacks.push(callback)
  }

  simulateProgress(steps: number[] = [25, 50, 75, 100]) {
    steps.forEach((step, index) => {
      setTimeout(() => {
        this.callbacks.forEach(callback => callback(step))
      }, index * 100)
    })
  }
}

// Mock Supabase storage client
export const mockSupabaseStorage = {
  upload: jest.fn().mockResolvedValue({
    data: { path: 'posts/2025/9/mock-image.webp' },
    error: null
  }),
  getPublicUrl: jest.fn().mockReturnValue({
    data: { publicUrl: 'https://storage.supabase.co/v1/object/public/post-images/posts/2025/9/mock-image.webp' }
  }),
  remove: jest.fn().mockResolvedValue({ data: null, error: null })
}

// Test data generators
export const generateTestFiles = (count: number = 3): File[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockImageFile(`test-image-${index + 1}.jpg`, (index + 1) * 1024 * 1024)
  )
}

export const generateLargeFile = (sizeInMB: number = 15): File => {
  return createMockImageFile(`large-image.jpg`, sizeInMB * 1024 * 1024)
}

export const generateUnsupportedFile = (): File => {
  return createMockFile('document.pdf', 'PDF content', 'application/pdf', 2 * 1024 * 1024)
}

// Cleanup utility for tests
export const cleanupMocks = () => {
  jest.restoreAllMocks()
  delete (global as any).fetch
  delete (global as any).FormData
  delete (global as any).URL
}