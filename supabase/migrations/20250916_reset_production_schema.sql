-- Production database reset migration
-- Created: 2025-09-16
-- Purpose: Reset tables (except admin-related) and apply correct schema

-- Drop existing tables (preserve admin tables)
DROP TABLE IF EXISTS subreddit_members CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS subreddits CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS moderation_status CASCADE;

-- Create moderation_status enum
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');

-- Create users table with correct schema
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(50) NOT NULL UNIQUE,
  email_hash char(64) NOT NULL UNIQUE,
  phone_hash char(64),
  karma_points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_banned boolean DEFAULT false,
  profile_image_url text,
  age_verified boolean DEFAULT false,
  preferences jsonb DEFAULT '{}',
  role text DEFAULT 'user',
  is_admin boolean DEFAULT false
);

-- Create subreddits table
CREATE TABLE subreddits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL UNIQUE,
  display_name varchar(100) NOT NULL,
  description text,
  master_id uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  member_count integer DEFAULT 0,
  is_nsfw boolean DEFAULT false,
  moderation_settings jsonb DEFAULT '{}',
  rules jsonb DEFAULT '[]'
);

-- Create posts table with both old and new column structures
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(300) NOT NULL,
  content text,
  author_id uuid REFERENCES users(id),
  subreddit_id uuid REFERENCES subreddits(id),

  -- Old column names (for backward compatibility)
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  moderation_status moderation_status DEFAULT 'approved',
  is_deleted boolean DEFAULT false,

  -- New column names (for code compatibility)
  upvote_count integer DEFAULT 0,
  downvote_count integer DEFAULT 0,
  vote_score integer DEFAULT 0,
  status text DEFAULT 'published',
  deleted_at timestamp with time zone,

  comment_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  flair varchar(50),
  ai_generated boolean DEFAULT false,
  allow_guest_comments boolean DEFAULT true
);

-- Create comments table with both old and new column structures
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid REFERENCES users(id),
  post_id uuid REFERENCES posts(id),
  parent_id uuid REFERENCES comments(id),

  -- Old column names
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  is_deleted boolean DEFAULT false,

  -- New column names
  upvote_count integer DEFAULT 0,
  downvote_count integer DEFAULT 0,
  vote_score integer DEFAULT 0,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  ai_generated boolean DEFAULT false
);

-- Create subreddit_members table
CREATE TABLE subreddit_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  subreddit_id uuid REFERENCES subreddits(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, subreddit_id)
);

-- Create indexes
CREATE INDEX posts_status_idx ON posts(status);
CREATE INDEX posts_deleted_at_idx ON posts(deleted_at);
CREATE INDEX posts_vote_score_idx ON posts(vote_score);
CREATE INDEX posts_subreddit_id_idx ON posts(subreddit_id);
CREATE INDEX posts_author_id_idx ON posts(author_id);

CREATE INDEX comments_post_id_idx ON comments(post_id);
CREATE INDEX comments_parent_id_idx ON comments(parent_id);
CREATE INDEX comments_author_id_idx ON comments(author_id);
CREATE INDEX comments_vote_score_idx ON comments(vote_score);

CREATE INDEX subreddit_members_user_id_idx ON subreddit_members(user_id);
CREATE INDEX subreddit_members_subreddit_id_idx ON subreddit_members(subreddit_id);

CREATE INDEX users_username_idx ON users(username);
CREATE INDEX users_email_hash_idx ON users(email_hash);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddits ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddit_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "Users can insert posts" ON posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid()::text = author_id::text);

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid()::text = author_id::text);

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Users can insert comments" ON comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid()::text = author_id::text);

-- RLS Policies for subreddits
CREATE POLICY "Subreddits are viewable by everyone" ON subreddits
  FOR SELECT USING (true);

CREATE POLICY "Users can create subreddits" ON subreddits
  FOR INSERT WITH CHECK (true);

-- RLS Policies for users
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for subreddit_members
CREATE POLICY "Memberships are viewable by everyone" ON subreddit_members
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own memberships" ON subreddit_members
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Insert default subreddits
INSERT INTO subreddits (name, display_name, description) VALUES
  ('general', '자유게시판', '자유롭게 이야기를 나누는 공간입니다.'),
  ('tech', '기술', '기술 관련 이야기를 나누는 공간입니다.'),
  ('daily', '일상', '일상적인 이야기를 공유하는 공간입니다.'),
  ('questions', '질문', '궁금한 것들을 물어보는 공간입니다.');

-- Functions to sync old/new column values
CREATE OR REPLACE FUNCTION sync_post_vote_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- When old columns are updated, sync to new columns
  IF NEW.upvotes IS DISTINCT FROM OLD.upvotes OR NEW.downvotes IS DISTINCT FROM OLD.downvotes THEN
    NEW.upvote_count := COALESCE(NEW.upvotes, 0);
    NEW.downvote_count := COALESCE(NEW.downvotes, 0);
    NEW.vote_score := COALESCE(NEW.upvotes, 0) - COALESCE(NEW.downvotes, 0);
  END IF;

  -- When new columns are updated, sync to old columns
  IF NEW.upvote_count IS DISTINCT FROM OLD.upvote_count OR NEW.downvote_count IS DISTINCT FROM OLD.downvote_count THEN
    NEW.upvotes := COALESCE(NEW.upvote_count, 0);
    NEW.downvotes := COALESCE(NEW.downvote_count, 0);
    NEW.vote_score := COALESCE(NEW.upvote_count, 0) - COALESCE(NEW.downvote_count, 0);
  END IF;

  -- Sync status fields
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    NEW.status := CASE
      WHEN NEW.moderation_status = 'approved' THEN 'published'
      WHEN NEW.moderation_status = 'rejected' THEN 'draft'
      ELSE 'draft'
    END;
  END IF;

  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted AND NEW.is_deleted = true THEN
    NEW.deleted_at := now();
  ELSIF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted AND NEW.is_deleted = false THEN
    NEW.deleted_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_sync_columns
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_vote_columns();

-- Similar function for comments
CREATE OR REPLACE FUNCTION sync_comment_vote_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- When old columns are updated, sync to new columns
  IF NEW.upvotes IS DISTINCT FROM OLD.upvotes OR NEW.downvotes IS DISTINCT FROM OLD.downvotes THEN
    NEW.upvote_count := COALESCE(NEW.upvotes, 0);
    NEW.downvote_count := COALESCE(NEW.downvotes, 0);
    NEW.vote_score := COALESCE(NEW.upvotes, 0) - COALESCE(NEW.downvotes, 0);
  END IF;

  -- When new columns are updated, sync to old columns
  IF NEW.upvote_count IS DISTINCT FROM OLD.upvote_count OR NEW.downvote_count IS DISTINCT FROM OLD.downvote_count THEN
    NEW.upvotes := COALESCE(NEW.upvote_count, 0);
    NEW.downvotes := COALESCE(NEW.downvote_count, 0);
    NEW.vote_score := COALESCE(NEW.upvote_count, 0) - COALESCE(NEW.downvote_count, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_sync_columns
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION sync_comment_vote_columns();