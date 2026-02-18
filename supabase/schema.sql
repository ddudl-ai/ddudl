-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'flagged', 'removed');
CREATE TYPE vote_type AS ENUM ('upvote', 'downvote');
CREATE TYPE content_type AS ENUM ('post', 'comment', 'user');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- Users table (개인정보 최소화)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email_hash CHAR(64) UNIQUE NOT NULL, -- 이메일 해시만 저장
  phone_hash CHAR(64), -- 선택적, 해시만 저장
  karma_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_banned BOOLEAN DEFAULT FALSE,
  profile_image_url TEXT,
  age_verified BOOLEAN DEFAULT FALSE, -- 청소년보호법 대응
  preferences JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT karma_points_check CHECK (karma_points >= -1000)
);

-- Subreddits table
CREATE TABLE subreddits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  master_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  member_count INTEGER DEFAULT 0,
  is_nsfw BOOLEAN DEFAULT FALSE,
  moderation_settings JSONB DEFAULT '{}'::jsonb,
  rules JSONB DEFAULT '[]'::jsonb,
  
  CONSTRAINT subreddit_name_format CHECK (name ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT member_count_check CHECK (member_count >= 0)
);

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  content TEXT,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  flair VARCHAR(50),
  moderation_status moderation_status DEFAULT 'pending',
  ai_generated BOOLEAN DEFAULT FALSE,
  allow_guest_comments BOOLEAN DEFAULT TRUE,

  CONSTRAINT title_length CHECK (char_length(title) >= 5),
  CONSTRAINT vote_counts_check CHECK (upvotes >= 0 AND downvotes >= 0),
  CONSTRAINT comment_count_check CHECK (comment_count >= 0),
  
  -- 익명 사용자 정보
  author_name VARCHAR(100),
  guest_password VARCHAR(100)
);

-- Post images table
CREATE TABLE post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT order_index_check CHECK (order_index >= 0)
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  ai_generated BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT content_length CHECK (char_length(content) >= 1),
  CONSTRAINT vote_counts_check CHECK (upvotes >= 0 AND downvotes >= 0),
  
  -- 익명 사용자 정보
  author_name VARCHAR(100),
  guest_password VARCHAR(100)
);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NULL,
  vote_type vote_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT vote_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id)
);

-- Legal logs table (최소한의 기록, 3개월 후 자동 삭제)
CREATE TABLE legal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET, -- 최소한의 접속 기록
  action VARCHAR(50), -- 로그인, 글쓰기, 신고 등
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retention_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 months') -- 3개월 후 자동 삭제
);

-- AI moderation logs table (투명성 확보)
CREATE TABLE auto_mod_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type content_type NOT NULL,
  action VARCHAR(20) CHECK (action IN ('approved', 'flagged', 'removed')),
  ai_model VARCHAR(50) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  reason TEXT,
  human_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT confidence_range CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

-- Reports table (커뮤니티 자정 작용)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_content_id UUID NOT NULL,
  content_type content_type NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status report_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE NULL,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Subreddit memberships table
CREATE TABLE subreddit_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, subreddit_id)
);

-- Create indexes for performance
CREATE INDEX idx_posts_subreddit_created ON posts(subreddit_id, created_at DESC);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_moderation_status ON posts(moderation_status);
CREATE INDEX idx_comments_post ON comments(post_id, created_at);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_votes_user_post ON votes(user_id, post_id);
CREATE INDEX idx_votes_user_comment ON votes(user_id, comment_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email_hash ON users(email_hash);
CREATE INDEX idx_subreddits_name ON subreddits(name);
CREATE INDEX idx_legal_logs_retention ON legal_logs(retention_until);
CREATE INDEX idx_auto_mod_logs_content ON auto_mod_logs(content_id, content_type);
CREATE INDEX idx_reports_status ON reports(status, created_at);

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subreddits_updated_at BEFORE UPDATE ON subreddits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for comment count
CREATE TRIGGER update_post_comment_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Function to update subreddit member count
CREATE OR REPLACE FUNCTION update_subreddit_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE subreddits SET member_count = member_count + 1 WHERE id = NEW.subreddit_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE subreddits SET member_count = member_count - 1 WHERE id = OLD.subreddit_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for member count
CREATE TRIGGER update_subreddit_member_count_trigger
    AFTER INSERT OR DELETE ON subreddit_memberships
    FOR EACH ROW EXECUTE FUNCTION update_subreddit_member_count();

-- Function to clean up old legal logs (3개월 후 자동 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_legal_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM legal_logs WHERE retention_until < NOW();
END;
$$ language 'plpgsql';

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Posts are readable by everyone
CREATE POLICY "Posts are readable by everyone" ON posts
    FOR SELECT USING (NOT is_deleted AND moderation_status = 'approved');

-- Users can create posts
CREATE POLICY "Users can create posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid() = author_id);

-- Comments are readable by everyone
CREATE POLICY "Comments are readable by everyone" ON comments
    FOR SELECT USING (NOT is_deleted);

-- Users can create comments
CREATE POLICY "Users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments
    FOR UPDATE USING (auth.uid() = author_id);

-- Users can manage their own votes
CREATE POLICY "Users can manage own votes" ON votes
    FOR ALL USING (auth.uid() = user_id);

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Insert default subreddits
INSERT INTO subreddits (name, display_name, description, is_nsfw) VALUES
('general', '일반', '일반적인 주제에 대한 토론', false),
('news', '뉴스', '최신 뉴스와 시사 이슈', false),
('tech', '기술', '기술과 IT 관련 토론', false),
('gaming', '게임', '게임 관련 토론과 정보', false),
('entertainment', '엔터테인먼트', '영화, 드라마, 음악 등', false),
('sports', '스포츠', '스포츠 관련 토론', false),
('food', '음식', '음식과 요리 관련', false),
('travel', '여행', '여행 정보와 후기', false),
('lifestyle', '라이프스타일', '일상과 라이프스타일', false),
('study', '공부', '학습과 교육 관련', false);