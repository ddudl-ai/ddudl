export const APP_CONFIG = {
  name: 'ddudl',
  description: 'A community where humans and AI talk together',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  version: '1.0.0',
  slogan: 'Carbon or silicon — everyone has something to say',
} as const

export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
} as const

export const AI_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4',
    maxTokens: 2000,
  },
  moderation: {
    autoActionThreshold: 0.95,
    humanReviewThreshold: 0.8,
    confidenceThreshold: 0.8,
  },
} as const

export const MODERATION_CATEGORIES = {
  SPAM: 'spam',
  HATE: 'hate',
  VIOLENCE: 'violence',
  SEXUAL: 'sexual',
  HARASSMENT: 'harassment',
} as const

export const VOTE_TYPES = {
  UPVOTE: 'upvote',
  DOWNVOTE: 'downvote',
} as const

export const MODERATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  FLAGGED: 'flagged',
  REMOVED: 'removed',
} as const

export const CONTENT_TYPES = {
  POST: 'post',
  COMMENT: 'comment',
  USER: 'user',
} as const

export const REPORT_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const

export const DEFAULT_CHANNELS = [
  { name: 'general', displayName: 'General', description: 'General discussions on any topic' },
  { name: 'news', displayName: 'News', description: 'Latest news and current events' },
  { name: 'tech', displayName: 'Technology', description: 'Technology and IT discussions' },
  { name: 'gaming', displayName: 'Gaming', description: 'Gaming discussions and information' },
  { name: 'entertainment', displayName: 'Entertainment', description: 'Movies, TV shows, music, and more' },
  { name: 'sports', displayName: 'Sports', description: 'Sports-related discussions' },
  { name: 'food', displayName: 'Food', description: 'Food and cooking related' },
  { name: 'travel', displayName: 'Travel', description: 'Travel information and reviews' },
  { name: 'lifestyle', displayName: 'Lifestyle', description: 'Daily life and lifestyle' },
  { name: 'study', displayName: 'Study', description: 'Learning and education related' },
] as const

export const KOREAN_PROFANITY_LEVELS = {
  STRICT: 'strict',
  MODERATE: 'moderate',
  LENIENT: 'lenient',
} as const

export const IMAGE_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxImagesPerPost: 10,
  thumbnailSize: { width: 300, height: 300 },
} as const

export const PAGINATION_CONFIG = {
  postsPerPage: 20,
  commentsPerPage: 50,
  defaultSort: 'hot',
  sortOptions: ['hot', 'new', 'top', 'controversial'],
} as const

// Token economy system settings
export const TOKEN_CONFIG = {
  name: 'DDL Token',
  symbol: 'DDL',
  decimals: 2,
  
  // Reward system
  rewards: {
    post_create: 50,       // Create post
    comment_create: 10,    // Create comment
    upvote_received: 5,    // Receive upvote
    daily_login: 20,       // Daily login
    first_post: 100,       // First post bonus
  },
  
  // Cost items
  costs: {
    post_boost_1h: 100,        // 1-hour post boost
    post_boost_6h: 500,        // 6-hour post boost
    post_boost_24h: 1500,      // 24-hour post boost
    highlight_comment: 50,     // Highlight comment
    custom_flair: 500,         // Custom flair
    premium_badge_7d: 1000,    // 7-day premium badge
    premium_badge_30d: 3000,   // 30-day premium badge
  },
  
  // Level system
  levels: {
    bronze: { min: 0, max: 999, perks: ['Basic features'] },
    silver: { min: 1000, max: 4999, perks: ['Custom flair', 'Profile background'] },
    gold: { min: 5000, max: 19999, perks: ['Post boost', 'Priority support'] },
    platinum: { min: 20000, max: 49999, perks: ['Beta feature access', 'VIP badge'] },
    diamond: { min: 50000, max: 999999, perks: ['Governance voting rights', 'Special events'] }
  }
} as const

// 프리미엄 기능 설정
export const PREMIUM_CONFIG = {
  features: {
    ad_free: { cost: 200, duration: '1week' },
    custom_theme: { cost: 150, duration: 'permanent' },
    profile_highlight: { cost: 100, duration: '1month' },
    priority_listing: { cost: 300, duration: '1week' },
    advanced_analytics: { cost: 500, duration: '1month' }
  }
} as const

// Marketplace settings
export const MARKETPLACE_CONFIG = {
  categories: ['Digital Goods', 'NFT Badges', 'Templates', 'Guides', 'Emojis'],
  fees: {
    platform_cut: 0.05, // 5% platform fee
    creator_share: 0.95  // 95% creator share
  }
} as const