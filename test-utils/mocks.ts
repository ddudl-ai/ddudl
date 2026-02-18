import { ModerationResult, ContentToModerate } from '@/lib/ai/moderation'

// Mock OpenAI client
export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
}

// Mock Anthropic client
export const mockAnthropic = {
  messages: {
    create: jest.fn(),
  },
}

// Mock Supabase client with proper typing
export const mockSupabaseClient: any = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(() => Promise.resolve({ data: null, error: null })),
  maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
  auth: {
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'test-url' } })),
    })),
  },
}

// Mock Next.js request/response
export const mockRequest = (body: any = {}, headers: Record<string, string> = {}) => ({
  json: jest.fn(() => Promise.resolve(body)),
  headers: {
    get: jest.fn((key: string) => headers[key] || null),
  },
  url: 'http://localhost:3000/api/test',
})

export const mockResponse = () => {
  const json = jest.fn()
  const status = jest.fn(() => ({ json }))
  return { json, status }
}

// Mock AI moderation responses
export const mockModerationResults = {
  approved: {
    isApproved: true,
    confidence: 98,
    reasons: [],
    category: [],
    requiresHumanReview: false,
    aiProvider: 'openai' as const,
  } as ModerationResult,
  
  rejected: {
    isApproved: false,
    confidence: 95,
    reasons: ['Contains inappropriate language'],
    category: ['profanity'],
    requiresHumanReview: false,
    aiProvider: 'openai' as const,
  } as ModerationResult,
  
  lowConfidence: {
    isApproved: true,
    confidence: 85,
    reasons: [],
    category: [],
    requiresHumanReview: true,
    aiProvider: 'claude' as const,
  } as ModerationResult,
  
  ruleBased: {
    isApproved: false,
    confidence: 90,
    reasons: ['Contains inappropriate language: 씨발'],
    category: ['profanity'],
    requiresHumanReview: true,
    aiProvider: 'rule-based' as const,
  } as ModerationResult,
}

// Mock test content
export const mockContent = {
  clean: {
    text: '안녕하세요! 좋은 하루 되세요.',
    context: {
      subredditRules: ['Be respectful', 'No spam'],
      userHistory: {
        previousViolations: 0,
        accountAge: 30,
        karmaScore: 100,
      },
    },
  } as ContentToModerate,
  
  inappropriate: {
    text: '이 씨발새끼들아',
    context: {
      subredditRules: ['No profanity'],
      reportCount: 2,
    },
  } as ContentToModerate,
  
  spam: {
    text: 'Visit http://spam1.com http://spam2.com http://spam3.com http://spam4.com for deals!',
  } as ContentToModerate,
  
  shortContent: {
    text: 'hi',
  } as ContentToModerate,
}

// Mock database records
export const mockPosts = [
  {
    id: '1',
    title: '첫 번째 게시물',
    content: '이것은 첫 번째 게시물입니다.',
    author_id: 'user1',
    subreddit_id: 'subreddit1',
    upvotes: 10,
    downvotes: 2,
    comment_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    flair: '질문',
    ai_generated: false,
    allow_guest_comments: true,
    is_deleted: false,
    moderation_status: 'approved',
    channels: {
      name: 'test',
      display_name: '테스트 커뮤니티',
    },
    users: {
      username: 'testuser',
    },
  },
  {
    id: '2',
    title: 'AI 생성 게시물',
    content: '이것은 AI가 생성한 게시물입니다.',
    author_id: 'user2',
    subreddit_id: 'subreddit1',
    upvotes: 5,
    downvotes: 1,
    comment_count: 3,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    flair: null,
    ai_generated: true,
    allow_guest_comments: true,
    is_deleted: false,
    moderation_status: 'approved',
    channels: {
      name: 'test',
      display_name: '테스트 커뮤니티',
    },
    users: {
      username: 'aibot',
    },
  },
]

export const mockComments = [
  {
    id: '1',
    content: '좋은 게시물이네요!',
    post_id: '1',
    author_id: 'user2',
    parent_comment_id: null,
    upvotes: 3,
    downvotes: 0,
    created_at: '2024-01-01T01:00:00Z',
    is_deleted: false,
    moderation_status: 'approved',
    users: {
      username: 'commenter1',
    },
  },
  {
    id: '2',
    content: '동의합니다.',
    post_id: '1',
    author_id: 'user3',
    parent_comment_id: '1',
    upvotes: 1,
    downvotes: 0,
    created_at: '2024-01-01T02:00:00Z',
    is_deleted: false,
    moderation_status: 'approved',
    users: {
      username: 'commenter2',
    },
  },
]

export const mockUsers = [
  {
    id: 'user1',
    username: 'testuser',
    email_hash: 'hash123',
    karma_points: 100,
    age_verified: true,
    is_admin: false,
    role: 'user',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user2',
    username: 'adminuser',
    email_hash: 'hash456',
    karma_points: 500,
    age_verified: true,
    is_admin: true,
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z',
  },
]

export const mockChannels = [
  {
    id: 'channel1',
    name: 'test',
    display_name: '테스트 채널',
    description: '테스트용 채널입니다',
    member_count: 100,
    post_count: 50,
    created_at: '2024-01-01T00:00:00Z',
    is_nsfw: false,
    rules: ['Be respectful', 'No spam'],
  },
  {
    id: 'channel2',
    name: 'private',
    display_name: '비공개 채널',
    description: '비공개 채널입니다',
    member_count: 10,
    post_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    is_nsfw: false,
    rules: ['Invite only'],
  },
]

// 하위 호환성을 위한 alias
export const mockSubreddits = mockChannels