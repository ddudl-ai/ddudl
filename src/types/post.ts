// Post-related types for the writing system

export interface Post {
  id: string
  title: string
  content?: string
  author_id: string
  author_name: string
  channel_id: string
  channel_name: string
  flair?: string
  image_urls?: string[]
  link_preview?: LinkPreview
  created_at: string
  updated_at: string
  is_nsfw: boolean
  is_spoiler: boolean
  vote_score: number
  comment_count: number
  view_count: number
  is_pinned: boolean
  is_locked: boolean
  is_archived: boolean
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged'
  ai_analysis?: AIAnalysis
}

export interface PostDraft {
  id?: string
  title: string
  content?: string
  channel_name: string
  flair?: string
  image_urls?: string[]
  link_preview?: LinkPreview
  is_nsfw?: boolean
  is_spoiler?: boolean
  saved_at?: string
}

export interface CreatePostData {
  title: string
  content?: string
  channel_name: string
  flair?: string
  is_nsfw?: boolean
  is_spoiler?: boolean
}

export interface UpdatePostData {
  title?: string
  content?: string
  flair?: string
  is_nsfw?: boolean
  is_spoiler?: boolean
}

export interface LinkPreview {
  id: string
  url: string
  title: string
  description?: string
  image_url?: string
  site_name?: string
  type?: 'website' | 'video' | 'article' | 'tweet'
  author?: string
  published_time?: string
  duration?: number
  cached_at: string
  is_valid: boolean
}

export interface PostFlair {
  id: string
  name: string
  display_text: string
  css_class?: string
  background_color?: string
  text_color?: string
  is_moderator_only: boolean
  max_emojis?: number
}

export interface PostValidationError {
  field: string
  message: string
  code: string
}

export interface PostFormData {
  title: string
  content: string
  channel_name: string
  flair?: string
  is_nsfw: boolean
  is_spoiler: boolean
  image_files: File[]
  link_urls: string[]
  draft_id?: string
}

export interface PostSubmissionResult {
  success: boolean
  post?: Post
  errors?: PostValidationError[]
  warnings?: string[]
  moderation_required?: boolean
}

export interface AIAnalysis {
  id: string
  post_id: string
  content_rating: {
    spam_score: number
    hate_score: number
    violence_score: number
    sexual_score: number
    harassment_score: number
  }
  sentiment: {
    positive: number
    negative: number
    neutral: number
  }
  topics: string[]
  language: string
  readability_score: number
  engagement_prediction: number
  viral_potential: number
  moderation_flags: string[]
  requires_human_review: boolean
  confidence: number
  analyzed_at: string
}

export interface PostStats {
  post_id: string
  views: number
  unique_views: number
  upvotes: number
  downvotes: number
  comments: number
  shares: number
  saves: number
  reports: number
  click_through_rate: number
  engagement_rate: number
  time_on_post: number
  bounce_rate: number
  updated_at: string
}

// Form validation types
export interface PostFormValidation {
  title: {
    min_length: number
    max_length: number
    required: boolean
    pattern?: string
  }
  content: {
    max_length: number
    required: boolean
  }
  images: {
    max_count: number
    max_size: number
    allowed_types: string[]
  }
  links: {
    max_count: number
    allowed_domains?: string[]
    blocked_domains?: string[]
  }
}

// Channel-specific settings
export interface ChannelPostSettings {
  channel_id: string
  channel_name: string
  allow_images: boolean
  allow_videos: boolean
  allow_links: boolean
  allow_text_posts: boolean
  require_flair: boolean
  available_flairs: PostFlair[]
  custom_validation: PostFormValidation
  moderation_mode: 'auto' | 'manual' | 'disabled'
  auto_nsfw_detection: boolean
  link_preview_enabled: boolean
  max_daily_posts_per_user: number
  min_account_age_days: number
  min_karma_required: number
}