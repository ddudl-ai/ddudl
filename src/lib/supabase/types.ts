// Supabase Database Types - Auto-generated and custom types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string
          title: string
          content: string | null
          author_id: string
          author_name: string
          channel_id: string
          channel_name: string
          flair: string | null
          image_urls: string[] | null
          link_preview_id: string | null
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
          ai_analysis_id: string | null
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          author_id: string
          author_name: string
          channel_id: string
          channel_name: string
          flair?: string | null
          image_urls?: string[] | null
          link_preview_id?: string | null
          created_at?: string
          updated_at?: string
          is_nsfw?: boolean
          is_spoiler?: boolean
          vote_score?: number
          comment_count?: number
          view_count?: number
          is_pinned?: boolean
          is_locked?: boolean
          is_archived?: boolean
          moderation_status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          ai_analysis_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          author_id?: string
          author_name?: string
          channel_id?: string
          channel_name?: string
          flair?: string | null
          image_urls?: string[] | null
          link_preview_id?: string | null
          created_at?: string
          updated_at?: string
          is_nsfw?: boolean
          is_spoiler?: boolean
          vote_score?: number
          comment_count?: number
          view_count?: number
          is_pinned?: boolean
          is_locked?: boolean
          is_archived?: boolean
          moderation_status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          ai_analysis_id?: string | null
        }
      }
      images: {
        Row: {
          id: string
          original_name: string
          file_name: string
          file_path: string
          public_url: string
          mime_type: string
          size_bytes: number
          width: number
          height: number
          format: 'webp' | 'jpeg' | 'png' | 'gif'
          quality: number
          is_optimized: boolean
          upload_session_id: string
          uploaded_by: string
          uploaded_at: string
          last_accessed: string
          access_count: number
          is_public: boolean
          moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged'
          ai_analysis_id: string | null
        }
        Insert: {
          id?: string
          original_name: string
          file_name: string
          file_path: string
          public_url: string
          mime_type: string
          size_bytes: number
          width: number
          height: number
          format: 'webp' | 'jpeg' | 'png' | 'gif'
          quality: number
          is_optimized?: boolean
          upload_session_id: string
          uploaded_by: string
          uploaded_at?: string
          last_accessed?: string
          access_count?: number
          is_public?: boolean
          moderation_status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          ai_analysis_id?: string | null
        }
        Update: {
          id?: string
          original_name?: string
          file_name?: string
          file_path?: string
          public_url?: string
          mime_type?: string
          size_bytes?: number
          width?: number
          height?: number
          format?: 'webp' | 'jpeg' | 'png' | 'gif'
          quality?: number
          is_optimized?: boolean
          upload_session_id?: string
          uploaded_by?: string
          uploaded_at?: string
          last_accessed?: string
          access_count?: number
          is_public?: boolean
          moderation_status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          ai_analysis_id?: string | null
        }
      }
      link_previews: {
        Row: {
          id: string
          url: string
          title: string
          description: string | null
          image_url: string | null
          site_name: string | null
          type: 'website' | 'video' | 'article' | 'tweet' | null
          author: string | null
          published_time: string | null
          duration: number | null
          cached_at: string
          is_valid: boolean
          access_count: number
          last_accessed: string
        }
        Insert: {
          id?: string
          url: string
          title: string
          description?: string | null
          image_url?: string | null
          site_name?: string | null
          type?: 'website' | 'video' | 'article' | 'tweet' | null
          author?: string | null
          published_time?: string | null
          duration?: number | null
          cached_at?: string
          is_valid?: boolean
          access_count?: number
          last_accessed?: string
        }
        Update: {
          id?: string
          url?: string
          title?: string
          description?: string | null
          image_url?: string | null
          site_name?: string | null
          type?: 'website' | 'video' | 'article' | 'tweet' | null
          author?: string | null
          published_time?: string | null
          duration?: number | null
          cached_at?: string
          is_valid?: boolean
          access_count?: number
          last_accessed?: string
        }
      }
      post_flairs: {
        Row: {
          id: string
          channel_id: string
          name: string
          display_text: string
          css_class: string | null
          background_color: string | null
          text_color: string | null
          is_moderator_only: boolean
          max_emojis: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          name: string
          display_text: string
          css_class?: string | null
          background_color?: string | null
          text_color?: string | null
          is_moderator_only?: boolean
          max_emojis?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          name?: string
          display_text?: string
          css_class?: string | null
          background_color?: string | null
          text_color?: string | null
          is_moderator_only?: boolean
          max_emojis?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_analyses: {
        Row: {
          id: string
          target_id: string
          target_type: 'post' | 'image' | 'comment'
          content_rating: Json
          sentiment: Json | null
          topics: string[] | null
          language: string | null
          readability_score: number | null
          engagement_prediction: number | null
          viral_potential: number | null
          moderation_flags: string[] | null
          requires_human_review: boolean
          confidence: number
          analyzed_at: string
        }
        Insert: {
          id?: string
          target_id: string
          target_type: 'post' | 'image' | 'comment'
          content_rating: Json
          sentiment?: Json | null
          topics?: string[] | null
          language?: string | null
          readability_score?: number | null
          engagement_prediction?: number | null
          viral_potential?: number | null
          moderation_flags?: string[] | null
          requires_human_review?: boolean
          confidence: number
          analyzed_at?: string
        }
        Update: {
          id?: string
          target_id?: string
          target_type?: 'post' | 'image' | 'comment'
          content_rating?: Json
          sentiment?: Json | null
          topics?: string[] | null
          language?: string | null
          readability_score?: number | null
          engagement_prediction?: number | null
          viral_potential?: number | null
          moderation_flags?: string[] | null
          requires_human_review?: boolean
          confidence?: number
          analyzed_at?: string
        }
      }
      upload_sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          expires_at: string
          total_files: number
          completed_files: number
          failed_files: number
          total_size: number
          uploaded_size: number
          status: 'active' | 'completed' | 'cancelled' | 'expired'
          upload_context: 'post' | 'profile' | 'comment' | 'general'
          max_concurrent_uploads: number
        }
        Insert: {
          id?: string
          user_id: string
          started_at?: string
          expires_at?: string
          total_files?: number
          completed_files?: number
          failed_files?: number
          total_size?: number
          uploaded_size?: number
          status?: 'active' | 'completed' | 'cancelled' | 'expired'
          upload_context: 'post' | 'profile' | 'comment' | 'general'
          max_concurrent_uploads?: number
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          expires_at?: string
          total_files?: number
          completed_files?: number
          failed_files?: number
          total_size?: number
          uploaded_size?: number
          status?: 'active' | 'completed' | 'cancelled' | 'expired'
          upload_context?: 'post' | 'profile' | 'comment' | 'general'
          max_concurrent_uploads?: number
        }
      }
      channels: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          rules: Json | null
          allow_images: boolean
          allow_videos: boolean
          allow_links: boolean
          allow_text_posts: boolean
          require_flair: boolean
          moderation_mode: 'auto' | 'manual' | 'disabled'
          auto_nsfw_detection: boolean
          link_preview_enabled: boolean
          max_daily_posts_per_user: number
          min_account_age_days: number
          min_karma_required: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          rules?: Json | null
          allow_images?: boolean
          allow_videos?: boolean
          allow_links?: boolean
          allow_text_posts?: boolean
          require_flair?: boolean
          moderation_mode?: 'auto' | 'manual' | 'disabled'
          auto_nsfw_detection?: boolean
          link_preview_enabled?: boolean
          max_daily_posts_per_user?: number
          min_account_age_days?: number
          min_karma_required?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          rules?: Json | null
          allow_images?: boolean
          allow_videos?: boolean
          allow_links?: boolean
          allow_text_posts?: boolean
          require_flair?: boolean
          moderation_mode?: 'auto' | 'manual' | 'disabled'
          auto_nsfw_detection?: boolean
          link_preview_enabled?: boolean
          max_daily_posts_per_user?: number
          min_account_age_days?: number
          min_karma_required?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged'
      upload_context: 'post' | 'profile' | 'comment' | 'general'
      session_status: 'active' | 'completed' | 'cancelled' | 'expired'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for common operations
export type PostRow = Database['public']['Tables']['posts']['Row']
export type PostInsert = Database['public']['Tables']['posts']['Insert']
export type PostUpdate = Database['public']['Tables']['posts']['Update']

export type ImageRow = Database['public']['Tables']['images']['Row']
export type ImageInsert = Database['public']['Tables']['images']['Insert']
export type ImageUpdate = Database['public']['Tables']['images']['Update']

export type LinkPreviewRow = Database['public']['Tables']['link_previews']['Row']
export type LinkPreviewInsert = Database['public']['Tables']['link_previews']['Insert']
export type LinkPreviewUpdate = Database['public']['Tables']['link_previews']['Update']

export type PostFlairRow = Database['public']['Tables']['post_flairs']['Row']
export type PostFlairInsert = Database['public']['Tables']['post_flairs']['Insert']
export type PostFlairUpdate = Database['public']['Tables']['post_flairs']['Update']

export type AIAnalysisRow = Database['public']['Tables']['ai_analyses']['Row']
export type AIAnalysisInsert = Database['public']['Tables']['ai_analyses']['Insert']
export type AIAnalysisUpdate = Database['public']['Tables']['ai_analyses']['Update']

export type UploadSessionRow = Database['public']['Tables']['upload_sessions']['Row']
export type UploadSessionInsert = Database['public']['Tables']['upload_sessions']['Insert']
export type UploadSessionUpdate = Database['public']['Tables']['upload_sessions']['Update']

export type ChannelRow = Database['public']['Tables']['channels']['Row']
export type ChannelInsert = Database['public']['Tables']['channels']['Insert']
export type ChannelUpdate = Database['public']['Tables']['channels']['Update']

// Content rating structure for AI analysis
export interface ContentRating {
  spam_score: number
  hate_score: number
  violence_score: number
  sexual_score: number
  harassment_score: number
}

// Sentiment analysis structure
export interface SentimentAnalysis {
  positive: number
  negative: number
  neutral: number
}

// Image AI analysis specific types
export interface ImageAIAnalysisData {
  content_type: 'photo' | 'illustration' | 'text' | 'mixed'
  nsfw_score: number
  violence_score: number
  adult_score: number
  racy_score: number
  medical_score: number
  detected_objects: Array<{
    name: string
    confidence: number
    bounding_box: {
      x: number
      y: number
      width: number
      height: number
    }
  }>
  detected_text?: string
  dominant_colors: Array<{
    color: string
    percentage: number
    hex: string
  }>
  quality_score: number
  is_screenshot: boolean
  is_meme: boolean
}

// Custom query result types for common operations
export interface PostWithPreview extends PostRow {
  link_preview?: LinkPreviewRow | null
  ai_analysis?: AIAnalysisRow | null
  flair_info?: PostFlairRow | null
}

export interface PostWithImages extends PostRow {
  images?: ImageRow[]
  link_preview?: LinkPreviewRow | null
}

export interface DetailedPost extends PostRow {
  link_preview?: LinkPreviewRow | null
  ai_analysis?: AIAnalysisRow | null
  flair_info?: PostFlairRow | null
  images?: ImageRow[]
}

// Channel with settings
export interface ChannelWithSettings extends ChannelRow {
  available_flairs: PostFlairRow[]
  post_count: number
  active_users: number
}

// Upload progress tracking
export interface UploadProgress {
  session: UploadSessionRow
  completed_uploads: ImageRow[]
  failed_uploads: Array<{
    filename: string
    error: string
    attempted_at: string
  }>
  current_upload?: {
    filename: string
    progress: number
    status: 'uploading' | 'processing' | 'analyzing'
  }
}

// Database query filters
export interface PostFilters {
  channel_id?: string
  author_id?: string
  flair?: string
  moderation_status?: 'pending' | 'approved' | 'rejected' | 'flagged'
  is_nsfw?: boolean
  has_images?: boolean
  has_link_preview?: boolean
  date_from?: string
  date_to?: string
  min_score?: number
  sort_by?: 'created_at' | 'vote_score' | 'comment_count' | 'view_count'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface ImageFilters {
  uploaded_by?: string
  format?: 'webp' | 'jpeg' | 'png' | 'gif'
  moderation_status?: 'pending' | 'approved' | 'rejected' | 'flagged'
  min_size?: number
  max_size?: number
  is_optimized?: boolean
  upload_context?: 'post' | 'profile' | 'comment' | 'general'
  date_from?: string
  date_to?: string
}

// RPC function types (if any custom functions are created)
export interface DatabaseFunctions {
  get_trending_posts: {
    Args: {
      channel_id?: string
      time_range?: '1h' | '6h' | '24h' | '7d'
      limit?: number
    }
    Returns: PostWithPreview[]
  }

  update_post_stats: {
    Args: {
      post_id: string
      increment_views?: boolean
      increment_comments?: boolean
      vote_change?: number
    }
    Returns: void
  }

  moderate_content: {
    Args: {
      content_id: string
      content_type: 'post' | 'image' | 'comment'
      action: 'approve' | 'reject' | 'flag'
      reason?: string
    }
    Returns: boolean
  }
}

// Error types for database operations
export interface DatabaseError {
  code: string
  message: string
  details?: string
  hint?: string
}

// Response wrapper for database operations
export interface DatabaseResponse<T> {
  data: T | null
  error: DatabaseError | null
  count?: number
}

// Pagination helper
export interface PaginationParams {
  page: number
  per_page: number
  offset: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    per_page: number
    total_count: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
  error?: DatabaseError
}