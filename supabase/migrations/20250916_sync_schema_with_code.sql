-- Migration to sync database schema with current code expectations
-- Created: 2025-09-16
-- Purpose: Align database structure with application code

-- Posts table updates - add new columns if they don't exist
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS upvote_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvote_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Copy data from old columns to new ones only if old columns exist and new data is empty
DO $$
BEGIN
  -- Check if upvotes column exists and copy data
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'upvotes') THEN
    UPDATE posts SET
      upvote_count = COALESCE(upvotes, 0),
      downvote_count = COALESCE(downvotes, 0),
      vote_score = COALESCE(upvotes, 0) - COALESCE(downvotes, 0)
    WHERE upvote_count = 0 AND downvote_count = 0 AND vote_score = 0;
  END IF;

  -- Set status based on moderation_status
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'moderation_status') THEN
    UPDATE posts SET
      status = CASE
        WHEN moderation_status::text = 'approved' THEN 'published'
        WHEN moderation_status::text = 'rejected' THEN 'draft'
        ELSE 'published'
      END
    WHERE status = 'published' OR status IS NULL;
  END IF;

  -- Set deleted_at for deleted posts
  UPDATE posts SET
    deleted_at = updated_at
    WHERE is_deleted = true AND deleted_at IS NULL;
END $$;

-- Comments table updates
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS upvote_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvote_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_score integer DEFAULT 0;

-- Copy data from old columns to new ones for comments
DO $$
BEGIN
  -- Check if upvotes column exists and copy data
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'upvotes') THEN
    UPDATE comments SET
      upvote_count = COALESCE(upvotes, 0),
      downvote_count = COALESCE(downvotes, 0),
      vote_score = COALESCE(upvotes, 0) - COALESCE(downvotes, 0)
    WHERE upvote_count = 0 AND downvote_count = 0 AND vote_score = 0;
  END IF;
END $$;

-- Create subreddit_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS subreddit_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  subreddit_id uuid REFERENCES subreddits(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, subreddit_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);
CREATE INDEX IF NOT EXISTS posts_deleted_at_idx ON posts(deleted_at);
CREATE INDEX IF NOT EXISTS posts_vote_score_idx ON posts(vote_score);
CREATE INDEX IF NOT EXISTS comments_vote_score_idx ON comments(vote_score);
CREATE INDEX IF NOT EXISTS subreddit_members_user_id_idx ON subreddit_members(user_id);
CREATE INDEX IF NOT EXISTS subreddit_members_subreddit_id_idx ON subreddit_members(subreddit_id);

-- Update RLS policies if needed
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

-- Enable RLS on new table
ALTER TABLE subreddit_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for subreddit_members
DROP POLICY IF EXISTS "Subreddit members are viewable by everyone" ON subreddit_members;
CREATE POLICY "Subreddit members are viewable by everyone" ON subreddit_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own memberships" ON subreddit_members;
CREATE POLICY "Users can manage their own memberships" ON subreddit_members
  FOR ALL USING (auth.uid()::text = user_id::text);