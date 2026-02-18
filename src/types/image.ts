// Image-related types for upload and processing system

export interface ImageFile {
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
  ai_analysis?: ImageAIAnalysis
}

export interface ImageUploadOptions {
  max_width?: number
  max_height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  auto_optimize?: boolean
  generate_thumbnails?: boolean
  watermark?: boolean
}

export interface ImageProcessingResult {
  success: boolean
  original_file: File
  processed_file?: {
    buffer: ArrayBuffer
    format: string
    width: number
    height: number
    size: number
    quality: number
  }
  thumbnails?: Array<{
    size: 'small' | 'medium' | 'large'
    width: number
    height: number
    buffer: ArrayBuffer
    url?: string
  }>
  compression_ratio?: number
  processing_time_ms: number
  error?: string
}

export interface ImageUploadResponse {
  success: boolean
  image?: ImageFile
  thumbnails?: Array<{
    size: string
    url: string
    width: number
    height: number
  }>
  processing_info?: {
    original_size: number
    processed_size: number
    compression_ratio: number
    format_converted: boolean
    thumbnails_generated: number
  }
  error?: string
  upload_session_id: string
}

export interface ImageValidationResult {
  valid: boolean
  errors: ImageValidationError[]
  warnings: string[]
  metadata: {
    width: number
    height: number
    size: number
    format: string
    has_transparency: boolean
    is_animated: boolean
    color_space: string
    bit_depth: number
  }
}

export interface ImageValidationError {
  code: 'FILE_TOO_LARGE' | 'INVALID_FORMAT' | 'DIMENSIONS_TOO_LARGE' | 'CORRUPTED_FILE' | 'INVALID_CONTENT'
  message: string
  details?: Record<string, unknown>
}

export interface ImageValidationSettings {
  max_file_size: number // bytes
  max_width: number // pixels
  max_height: number // pixels
  allowed_formats: string[]
  allow_animated: boolean
  max_animation_frames: number
  scan_for_malicious_content: boolean
  require_alt_text: boolean
}

export interface ImageAIAnalysis {
  id: string
  image_id: string
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
  moderation_flags: string[]
  requires_human_review: boolean
  confidence: number
  analyzed_at: string
}

export interface ImageMetadata {
  exif?: Record<string, unknown>
  iptc?: Record<string, unknown>
  xmp?: Record<string, unknown>
  camera_info?: {
    make?: string
    model?: string
    lens?: string
    iso?: number
    aperture?: number
    shutter_speed?: number
    focal_length?: number
  }
  location?: {
    latitude?: number
    longitude?: number
    altitude?: number
    city?: string
    country?: string
  }
  creation_date?: string
  modification_date?: string
}

// Upload progress and session management
export interface ImageUploadSession {
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

export interface ImageUploadProgress {
  session_id: string
  file_index: number
  file_name: string
  bytes_uploaded: number
  total_bytes: number
  percentage: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error_message?: string
  estimated_time_remaining?: number
}

// Clipboard and drag-and-drop support
export interface ClipboardImageData {
  file: File
  source: 'clipboard' | 'drag_drop' | 'file_input'
  original_filename?: string
  mime_type: string
  size: number
  data_url?: string
}

export interface DragDropImageData {
  files: File[]
  drop_x: number
  drop_y: number
  source_element?: string
  insertion_point?: number
}

// Image optimization and compression
export interface ImageCompressionOptions {
  target_size_kb?: number
  max_width?: number
  max_height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  preserve_metadata?: boolean
  progressive_jpeg?: boolean
  lossless_webp?: boolean
  effort?: number // 1-6 for WebP
}

export interface ImageThumbnailConfig {
  sizes: Array<{
    name: string
    width: number
    height: number
    crop?: 'center' | 'smart' | 'entropy' | 'attention'
    quality?: number
  }>
  lazy_generate?: boolean
  placeholder_blur?: boolean
  cache_duration?: number
}

// Storage and CDN
export interface ImageStorageInfo {
  bucket: string
  path: string
  cdn_url?: string
  backup_urls?: string[]
  storage_class: 'standard' | 'infrequent' | 'archive'
  encryption_key?: string
  access_policy: 'public' | 'private' | 'authenticated'
  expiry_date?: string
  bandwidth_usage: number
  storage_cost: number
}

export interface ImageCDNOptions {
  auto_format?: boolean
  auto_compress?: boolean
  lazy_load?: boolean
  progressive_load?: boolean
  responsive_images?: boolean
  webp_fallback?: boolean
  blur_placeholder?: boolean
  resize_strategy?: 'fit' | 'fill' | 'crop' | 'scale'
}