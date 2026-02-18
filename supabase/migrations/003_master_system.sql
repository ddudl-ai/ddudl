-- Master System Migration
-- Add master-specific tables and enhance existing schema

-- Create master permission levels
CREATE TYPE master_permission_level AS ENUM ('owner', 'admin', 'moderator');

-- Create moderation action types
CREATE TYPE moderation_action AS ENUM ('approve', 'remove', 'flag', 'ban_user', 'warn_user');

-- Create content type enum
CREATE TYPE content_type AS ENUM ('post', 'comment', 'user');

-- Enhance subreddits table with detailed moderation settings
ALTER TABLE subreddits ADD COLUMN IF NOT EXISTS moderation_policy JSONB DEFAULT '{
  "profanity_level": "moderate",
  "spam_prevention": {
    "max_posts_per_hour": 5,
    "min_karma_required": 0,
    "account_age_required_days": 0,
    "duplicate_content_check": true
  },
  "image_policy": {
    "allow_nsfw": false,
    "require_moderation": true,
    "max_file_size_mb": 10,
    "allowed_formats": ["jpg", "jpeg", "png", "gif", "webp"]
  },
  "banned_keywords": [],
  "auto_remove_threshold": 0.9,
  "new_user_restrictions": {
    "require_approval": false,
    "min_karma_to_post": 0,
    "min_account_age_days": 0
  },
  "content_filters": {
    "block_external_links": false,
    "require_flair": false,
    "max_title_length": 300,
    "max_content_length": 10000
  }
}'::jsonb;

-- Create subreddit masters table for hierarchical permissions
CREATE TABLE subreddit_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level master_permission_level NOT NULL DEFAULT 'moderator',
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(subreddit_id, user_id)
);

-- Create master actions log for audit trail
CREATE TABLE master_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  action moderation_action NOT NULL,
  target_type content_type NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create banned users table for subreddit-specific bans
CREATE TABLE subreddit_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  ban_type VARCHAR(20) DEFAULT 'permanent' CHECK (ban_type IN ('temporary', 'permanent')),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(subreddit_id, user_id)
);

-- Create moderation queue for items requiring manual review
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id UUID NOT NULL,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  ai_confidence DECIMAL(3,2),
  ai_reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE NULL,
  resolution_action moderation_action NULL,
  resolution_reason TEXT NULL
);

-- Create master notifications for important events
CREATE TABLE master_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_subreddit_masters_subreddit ON subreddit_masters(subreddit_id);
CREATE INDEX idx_subreddit_masters_user ON subreddit_masters(user_id);
CREATE INDEX idx_subreddit_masters_active ON subreddit_masters(subreddit_id, is_active);
CREATE INDEX idx_master_actions_master ON master_actions(master_id, created_at DESC);
CREATE INDEX idx_master_actions_subreddit ON master_actions(subreddit_id, created_at DESC);
CREATE INDEX idx_subreddit_bans_subreddit ON subreddit_bans(subreddit_id, is_active);
CREATE INDEX idx_subreddit_bans_user ON subreddit_bans(user_id, is_active);
CREATE INDEX idx_moderation_queue_subreddit ON moderation_queue(subreddit_id, status);
CREATE INDEX idx_moderation_queue_assigned ON moderation_queue(assigned_to, status);
CREATE INDEX idx_master_notifications_master ON master_notifications(master_id, is_read);

-- Function to check if user is master of subreddit
CREATE OR REPLACE FUNCTION is_subreddit_master(user_uuid UUID, subreddit_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subreddit_masters 
    WHERE user_id = user_uuid 
    AND subreddit_id = subreddit_uuid 
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get master permission level
CREATE OR REPLACE FUNCTION get_master_permission_level(user_uuid UUID, subreddit_uuid UUID)
RETURNS master_permission_level AS $$
DECLARE
  permission master_permission_level;
BEGIN
  SELECT permission_level INTO permission
  FROM subreddit_masters 
  WHERE user_id = user_uuid 
  AND subreddit_id = subreddit_uuid 
  AND is_active = TRUE;
  
  RETURN permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update master last active time
CREATE OR REPLACE FUNCTION update_master_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE subreddit_masters 
  SET last_active_at = NOW() 
  WHERE user_id = NEW.master_id 
  AND subreddit_id = NEW.subreddit_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update master activity on actions
CREATE TRIGGER update_master_activity_trigger
  AFTER INSERT ON master_actions
  FOR EACH ROW EXECUTE FUNCTION update_master_last_active();

-- Function to check if user is banned from subreddit
CREATE OR REPLACE FUNCTION is_user_banned_from_subreddit(user_uuid UUID, subreddit_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subreddit_bans 
    WHERE user_id = user_uuid 
    AND subreddit_id = subreddit_uuid 
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for master system
ALTER TABLE subreddit_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddit_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_notifications ENABLE ROW LEVEL SECURITY;

-- Masters can read their own permissions
CREATE POLICY "Masters can read own permissions" ON subreddit_masters
  FOR SELECT USING (auth.uid() = user_id);

-- Masters can read actions in their subreddits
CREATE POLICY "Masters can read subreddit actions" ON master_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subreddit_masters 
      WHERE user_id = auth.uid() 
      AND subreddit_id = master_actions.subreddit_id 
      AND is_active = TRUE
    )
  );

-- Masters can create actions in their subreddits
CREATE POLICY "Masters can create actions" ON master_actions
  FOR INSERT WITH CHECK (
    auth.uid() = master_id AND
    EXISTS (
      SELECT 1 FROM subreddit_masters 
      WHERE user_id = auth.uid() 
      AND subreddit_id = master_actions.subreddit_id 
      AND is_active = TRUE
    )
  );

-- Masters can read bans in their subreddits
CREATE POLICY "Masters can read subreddit bans" ON subreddit_bans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subreddit_masters 
      WHERE user_id = auth.uid() 
      AND subreddit_id = subreddit_bans.subreddit_id 
      AND is_active = TRUE
    )
  );

-- Masters can create bans in their subreddits
CREATE POLICY "Masters can create bans" ON subreddit_bans
  FOR INSERT WITH CHECK (
    auth.uid() = banned_by AND
    EXISTS (
      SELECT 1 FROM subreddit_masters 
      WHERE user_id = auth.uid() 
      AND subreddit_id = subreddit_bans.subreddit_id 
      AND is_active = TRUE
      AND permission_level IN ('owner', 'admin')
    )
  );

-- Masters can read moderation queue for their subreddits
CREATE POLICY "Masters can read moderation queue" ON moderation_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subreddit_masters 
      WHERE user_id = auth.uid() 
      AND subreddit_id = moderation_queue.subreddit_id 
      AND is_active = TRUE
    )
  );

-- Masters can update moderation queue items
CREATE POLICY "Masters can update moderation queue" ON moderation_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM subreddit_masters 
      WHERE user_id = auth.uid() 
      AND subreddit_id = moderation_queue.subreddit_id 
      AND is_active = TRUE
    )
  );

-- Masters can read their notifications
CREATE POLICY "Masters can read own notifications" ON master_notifications
  FOR SELECT USING (auth.uid() = master_id);

-- Masters can update their notifications
CREATE POLICY "Masters can update own notifications" ON master_notifications
  FOR UPDATE USING (auth.uid() = master_id);