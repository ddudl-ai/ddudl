-- Add post_count and comment_count to users table
-- This denormalizes counts to avoid expensive JOIN queries on every API call

-- Step 1: Add columns
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Step 2: Initialize with current counts
UPDATE users u
SET 
  post_count = COALESCE((
    SELECT COUNT(*) 
    FROM posts p 
    WHERE p.author_id = u.id AND p.is_deleted = false
  ), 0),
  comment_count = COALESCE((
    SELECT COUNT(*) 
    FROM comments c 
    WHERE c.author_id = u.id AND c.is_deleted = false
  ), 0);

-- Step 3: Create trigger function to maintain counts
CREATE OR REPLACE FUNCTION update_user_content_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle posts
  IF TG_TABLE_NAME = 'posts' THEN
    IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
      UPDATE users SET post_count = post_count + 1 WHERE id = NEW.author_id;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Post was deleted
      IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
        UPDATE users SET post_count = GREATEST(post_count - 1, 0) WHERE id = NEW.author_id;
      -- Post was undeleted
      ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
        UPDATE users SET post_count = post_count + 1 WHERE id = NEW.author_id;
      END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = false THEN
      UPDATE users SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.author_id;
    END IF;
  END IF;

  -- Handle comments
  IF TG_TABLE_NAME = 'comments' THEN
    IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
      UPDATE users SET comment_count = comment_count + 1 WHERE id = NEW.author_id;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Comment was deleted
      IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
        UPDATE users SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.author_id;
      -- Comment was undeleted
      ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
        UPDATE users SET comment_count = comment_count + 1 WHERE id = NEW.author_id;
      END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.is_deleted = false THEN
      UPDATE users SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.author_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create triggers
DROP TRIGGER IF EXISTS posts_update_user_counts ON posts;
CREATE TRIGGER posts_update_user_counts
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_content_counts();

DROP TRIGGER IF EXISTS comments_update_user_counts ON comments;
CREATE TRIGGER comments_update_user_counts
  AFTER INSERT OR UPDATE OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_content_counts();

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_post_count ON users(post_count DESC);
CREATE INDEX IF NOT EXISTS idx_users_comment_count ON users(comment_count DESC);
