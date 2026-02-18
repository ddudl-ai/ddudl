-- Migration: Post Writing System with Image Upload Support
-- Date: 2025-01-14
-- Description: Creates tables and storage for the post writing system

-- Note: posts table already created in 001_initial_schema.sql
-- Adding additional columns to existing table if they don't exist
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS author_name TEXT,
ADD COLUMN IF NOT EXISTS flair TEXT,
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS link_preview_id UUID,
ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vote_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
ADD COLUMN IF NOT EXISTS ai_analysis_id UUID;

-- Create images table for uploaded images
CREATE TABLE IF NOT EXISTS images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('webp', 'jpeg', 'png', 'gif')),
  quality INTEGER DEFAULT 85,
  is_optimized BOOLEAN DEFAULT FALSE,
  upload_session_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  ai_analysis_id UUID
);

-- Create link_previews table
CREATE TABLE IF NOT EXISTS link_previews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  site_name TEXT,
  type TEXT CHECK (type IN ('website', 'video', 'article', 'tweet')),
  author TEXT,
  published_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_valid BOOLEAN DEFAULT TRUE,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_flairs table
CREATE TABLE IF NOT EXISTS post_flairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subreddit_id UUID NOT NULL,
  name TEXT NOT NULL,
  display_text TEXT NOT NULL,
  css_class TEXT,
  background_color TEXT,
  text_color TEXT,
  is_moderator_only BOOLEAN DEFAULT FALSE,
  max_emojis INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subreddit_id, name)
);

-- Create ai_analyses table for AI content analysis
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'image', 'comment')),
  content_rating JSONB NOT NULL,
  sentiment JSONB,
  topics TEXT[],
  language TEXT,
  readability_score DECIMAL(3,2),
  engagement_prediction DECIMAL(3,2),
  viral_potential DECIMAL(3,2),
  moderation_flags TEXT[],
  requires_human_review BOOLEAN DEFAULT FALSE,
  confidence DECIMAL(3,2) NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create upload_sessions table for tracking file uploads
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  total_files INTEGER DEFAULT 0,
  completed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  uploaded_size BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
  upload_context TEXT NOT NULL CHECK (upload_context IN ('post', 'profile', 'comment', 'general')),
  max_concurrent_uploads INTEGER DEFAULT 3
);

-- Create subreddits table if not exists
CREATE TABLE IF NOT EXISTS subreddits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  rules JSONB,
  allow_images BOOLEAN DEFAULT TRUE,
  allow_videos BOOLEAN DEFAULT TRUE,
  allow_links BOOLEAN DEFAULT TRUE,
  allow_text_posts BOOLEAN DEFAULT TRUE,
  require_flair BOOLEAN DEFAULT FALSE,
  moderation_mode TEXT DEFAULT 'auto' CHECK (moderation_mode IN ('auto', 'manual', 'disabled')),
  auto_nsfw_detection BOOLEAN DEFAULT TRUE,
  link_preview_enabled BOOLEAN DEFAULT TRUE,
  max_daily_posts_per_user INTEGER DEFAULT 10,
  min_account_age_days INTEGER DEFAULT 0,
  min_karma_required INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_subreddit_created ON posts(subreddit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_moderation_status ON posts(moderation_status);
CREATE INDEX IF NOT EXISTS idx_posts_vote_score ON posts(vote_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_flair ON posts(flair) WHERE flair IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_images_uploaded_by ON images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_images_session ON images(upload_session_id);
CREATE INDEX IF NOT EXISTS idx_images_moderation ON images(moderation_status);
CREATE INDEX IF NOT EXISTS idx_images_format ON images(format);

CREATE INDEX IF NOT EXISTS idx_link_previews_url ON link_previews(url);
CREATE INDEX IF NOT EXISTS idx_link_previews_cached_at ON link_previews(cached_at);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_target ON ai_analyses(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_flags ON ai_analyses USING GIN(moderation_flags);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires ON upload_sessions(expires_at);

-- Create foreign key relationships
-- Note: Using DO blocks to add constraints conditionally

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_posts_link_preview') THEN
        ALTER TABLE posts ADD CONSTRAINT fk_posts_link_preview
        FOREIGN KEY (link_preview_id) REFERENCES link_previews(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_posts_ai_analysis') THEN
        ALTER TABLE posts ADD CONSTRAINT fk_posts_ai_analysis
        FOREIGN KEY (ai_analysis_id) REFERENCES ai_analyses(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_images_ai_analysis') THEN
        ALTER TABLE images ADD CONSTRAINT fk_images_ai_analysis
        FOREIGN KEY (ai_analysis_id) REFERENCES ai_analyses(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_images_upload_session') THEN
        ALTER TABLE images ADD CONSTRAINT fk_images_upload_session
        FOREIGN KEY (upload_session_id) REFERENCES upload_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers conditionally
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_posts_updated_at_007') THEN
        CREATE TRIGGER update_posts_updated_at_007
        BEFORE UPDATE ON posts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subreddits_updated_at_007') THEN
        CREATE TRIGGER update_subreddits_updated_at_007
        BEFORE UPDATE ON subreddits
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_post_flairs_updated_at') THEN
        CREATE TRIGGER update_post_flairs_updated_at
        BEFORE UPDATE ON post_flairs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create Storage Buckets and Policies
-- Note: These need to be run separately through Supabase dashboard or supabase CLI

-- Storage bucket creation (run this via Supabase CLI or dashboard)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'images',
--   'images',
--   true,
--   10485760, -- 10MB limit
--   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
-- );

-- RLS Policies for posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (moderation_status = 'approved' OR moderation_status = 'pending');

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid()::text = author_id::text);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid()::text = author_id::text)
  WITH CHECK (auth.uid()::text = author_id::text);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid()::text = author_id::text);

-- RLS Policies for images table
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Images are viewable by everyone if public"
  ON images FOR SELECT
  USING (is_public = true AND moderation_status IN ('approved', 'pending'));

CREATE POLICY "Users can insert their own images"
  ON images FOR INSERT
  WITH CHECK (auth.uid()::text = uploaded_by::text);

CREATE POLICY "Users can update their own images"
  ON images FOR UPDATE
  USING (auth.uid()::text = uploaded_by::text);

CREATE POLICY "Users can delete their own images"
  ON images FOR DELETE
  USING (auth.uid()::text = uploaded_by::text);

-- RLS Policies for link_previews table
ALTER TABLE link_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Link previews are viewable by everyone"
  ON link_previews FOR SELECT
  USING (is_valid = true);

CREATE POLICY "Authenticated users can insert link previews"
  ON link_previews FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "System can update link previews"
  ON link_previews FOR UPDATE
  USING (true); -- Allow system updates for cache management

-- RLS Policies for upload_sessions table
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own upload sessions"
  ON upload_sessions FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own upload sessions"
  ON upload_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own upload sessions"
  ON upload_sessions FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for subreddits table
ALTER TABLE subreddits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subreddits are viewable by everyone"
  ON subreddits FOR SELECT
  USING (true);

-- RLS Policies for post_flairs table
ALTER TABLE post_flairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flairs are viewable by everyone"
  ON post_flairs FOR SELECT
  USING (true);

-- RLS Policies for ai_analyses table
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI analyses are viewable with content"
  ON ai_analyses FOR SELECT
  USING (
    target_type = 'post' AND EXISTS (
      SELECT 1 FROM posts
      WHERE id = target_id::uuid
      AND (moderation_status = 'approved' OR auth.uid()::text = author_id::text)
    )
  );

-- Helper functions for common operations
CREATE OR REPLACE FUNCTION get_post_with_details(post_id UUID)
RETURNS TABLE (
  post_data JSON,
  link_preview_data JSON,
  ai_analysis_data JSON,
  images_data JSON[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_json(p.*) as post_data,
    to_json(lp.*) as link_preview_data,
    to_json(ai.*) as ai_analysis_data,
    ARRAY(
      SELECT to_json(i.*)
      FROM images i
      WHERE i.public_url = ANY(p.image_urls)
    ) as images_data
  FROM posts p
  LEFT JOIN link_previews lp ON p.link_preview_id = lp.id
  LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
  WHERE p.id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post stats
CREATE OR REPLACE FUNCTION update_post_stats(
  post_id UUID,
  increment_views BOOLEAN DEFAULT FALSE,
  increment_comments BOOLEAN DEFAULT FALSE,
  vote_change INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE posts
  SET
    view_count = CASE WHEN increment_views THEN view_count + 1 ELSE view_count END,
    comment_count = CASE WHEN increment_comments THEN comment_count + 1 ELSE comment_count END,
    vote_score = vote_score + vote_change,
    updated_at = NOW()
  WHERE id = post_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired upload sessions
CREATE OR REPLACE FUNCTION cleanup_expired_upload_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Mark expired sessions
  UPDATE upload_sessions
  SET status = 'expired'
  WHERE expires_at < NOW() AND status = 'active';

  GET DIAGNOSTICS cleaned_count = ROW_COUNT;

  -- Clean up orphaned images from expired sessions
  DELETE FROM images
  WHERE upload_session_id IN (
    SELECT id FROM upload_sessions
    WHERE status = 'expired' AND expires_at < NOW() - INTERVAL '24 hours'
  );

  -- Clean up old expired sessions
  DELETE FROM upload_sessions
  WHERE status = 'expired' AND expires_at < NOW() - INTERVAL '7 days';

  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some default subreddits and flairs
INSERT INTO subreddits (name, display_name, description) VALUES
  ('general', '일반', '자유로운 주제로 이야기하는 공간입니다'),
  ('tech', '기술', '기술 관련 토론과 정보 공유'),
  ('news', '뉴스', '최신 뉴스와 시사 토론'),
  ('humor', '유머', '재미있는 콘텐츠와 농담'),
  ('question', '질문', '궁금한 것들을 질문하고 답변받는 공간')
ON CONFLICT (name) DO NOTHING;

-- Insert default flairs
INSERT INTO post_flairs (subreddit_id, name, display_text, background_color, text_color)
SELECT s.id, flair_name, flair_display, flair_bg, flair_text
FROM subreddits s
CROSS JOIN (
  VALUES
    ('질문', '질문', '#3B82F6', '#FFFFFF'),
    ('토론', '토론', '#10B981', '#FFFFFF'),
    ('정보', '정보', '#F59E0B', '#FFFFFF'),
    ('유머', '유머', '#EF4444', '#FFFFFF'),
    ('공지', '공지', '#8B5CF6', '#FFFFFF')
) AS flairs(flair_name, flair_display, flair_bg, flair_text)
WHERE s.name IN ('general', 'tech', 'news', 'humor', 'question')
ON CONFLICT (subreddit_id, name) DO NOTHING;

-- Create scheduled function to clean up expired sessions (if pg_cron is available)
-- SELECT cron.schedule('cleanup-upload-sessions', '0 */6 * * *', 'SELECT cleanup_expired_upload_sessions();');

COMMENT ON TABLE posts IS 'Main posts table with support for text, images, and link previews';
COMMENT ON TABLE images IS 'Uploaded images with optimization and moderation support';
COMMENT ON TABLE link_previews IS 'Cached link preview data with metadata';
COMMENT ON TABLE upload_sessions IS 'File upload session tracking for progress and cleanup';
COMMENT ON TABLE ai_analyses IS 'AI analysis results for content moderation and enhancement';
COMMENT ON TABLE post_flairs IS 'Post categorization tags with styling';
COMMENT ON TABLE subreddits IS 'Community configuration and settings';