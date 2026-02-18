-- Master System Database Schema

-- Note: subreddit_masters table already created in 003_master_system.sql
-- Adding additional columns to existing table if they don't exist
ALTER TABLE public.subreddit_masters
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
    "canEditPolicies": false,
    "canBanUsers": false,
    "canRemoveContent": false,
    "canAddModerators": false,
    "canViewAnalytics": false,
    "canManageAutomod": false,
    "canReviewAIDecisions": false
}';

-- Update permission level column to match new role structure
ALTER TABLE public.subreddit_masters
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('owner', 'moderator', 'assistant'));

-- Subreddit Policies table
CREATE TABLE public.subreddit_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subreddit_id UUID NOT NULL REFERENCES public.subreddits(id) ON DELETE CASCADE,
    master_id UUID NOT NULL REFERENCES public.subreddit_masters(id),
    policy_type TEXT NOT NULL,
    rules JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderation Settings table
CREATE TABLE public.moderation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subreddit_id UUID UNIQUE NOT NULL REFERENCES public.subreddits(id) ON DELETE CASCADE,
    profanity_level TEXT DEFAULT 'moderate' CHECK (profanity_level IN ('strict', 'moderate', 'relaxed')),
    spam_protection JSONB DEFAULT '{
        "enabled": true,
        "linkLimit": 3,
        "repetitionThreshold": 0.7,
        "newUserRestrictions": true
    }',
    banned_words TEXT[] DEFAULT '{}',
    automod_enabled BOOLEAN DEFAULT TRUE,
    ai_moderation_enabled BOOLEAN DEFAULT TRUE,
    ai_confidence_threshold FLOAT DEFAULT 0.85,
    karma_requirements JSONB DEFAULT '{
        "minToPost": 10,
        "minToComment": 1,
        "bypassForVerified": true
    }',
    new_user_restrictions JSONB DEFAULT '{
        "enabled": true,
        "accountAgeInDays": 7,
        "requireEmailVerification": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: moderation_queue table already created in 003_master_system.sql
-- Adding additional columns to existing table if they don't exist
ALTER TABLE public.moderation_queue
ADD COLUMN IF NOT EXISTS ai_score FLOAT,
ADD COLUMN IF NOT EXISTS ai_reasons JSONB,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.subreddit_masters(id),
ADD COLUMN IF NOT EXISTS resolution TEXT;

-- Note: master_actions table already created in 003_master_system.sql
-- Adding additional columns to existing table if they don't exist
ALTER TABLE public.master_actions
ADD COLUMN IF NOT EXISTS reversible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES public.subreddit_masters(id);

-- Note: master_notifications table already created in 003_master_system.sql
-- Adding additional columns to existing table if they don't exist
ALTER TABLE public.master_notifications
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Hierarchical Policies table
CREATE TABLE public.hierarchical_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level TEXT NOT NULL CHECK (level IN ('platform', 'category', 'subreddit')),
    scope TEXT, -- category name or subreddit id
    rules JSONB NOT NULL DEFAULT '[]',
    overrideable BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy Conflicts table
CREATE TABLE public.policy_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subreddit_id UUID NOT NULL REFERENCES public.subreddits(id),
    subreddit_policy_id UUID REFERENCES public.subreddit_policies(id),
    platform_policy_id UUID REFERENCES public.hierarchical_policies(id),
    conflict_type TEXT CHECK (conflict_type IN ('contradiction', 'overlap', 'insufficient')),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    resolution TEXT CHECK (resolution IN ('platform_override', 'subreddit_exception', 'manual_review')),
    resolved_by UUID REFERENCES public.subreddit_masters(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master Onboarding table
CREATE TABLE public.master_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    subreddit_id UUID NOT NULL REFERENCES public.subreddits(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    steps JSONB NOT NULL DEFAULT '[]',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subreddit_id)
);

-- Create indexes for performance
-- Note: Basic indexes already created in 003_master_system.sql
-- Adding only new indexes that don't conflict

CREATE INDEX IF NOT EXISTS idx_subreddit_policies_subreddit_id ON public.subreddit_policies(subreddit_id);
CREATE INDEX IF NOT EXISTS idx_subreddit_policies_enabled ON public.subreddit_policies(enabled);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status_priority ON public.moderation_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created_at_004 ON public.moderation_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_master_notifications_priority ON public.master_notifications(priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hierarchical_policies_level ON public.hierarchical_policies(level, enabled);
CREATE INDEX IF NOT EXISTS idx_policy_conflicts_subreddit_id ON public.policy_conflicts(subreddit_id, resolution);

-- Functions for master activity tracking
CREATE OR REPLACE FUNCTION update_master_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.subreddit_masters
    SET last_active_at = NOW()
    WHERE id = NEW.master_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity tracking
CREATE TRIGGER update_master_activity_on_action
    AFTER INSERT ON public.master_actions
    FOR EACH ROW EXECUTE FUNCTION update_master_activity();

-- Function to check policy conflicts
CREATE OR REPLACE FUNCTION check_policy_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    platform_policies RECORD;
    conflict_found BOOLEAN := FALSE;
BEGIN
    -- Check for conflicts with platform-level policies
    FOR platform_policies IN 
        SELECT * FROM public.hierarchical_policies 
        WHERE level = 'platform' AND enabled = TRUE
    LOOP
        -- Simple conflict detection logic (can be expanded)
        IF platform_policies.rules::text ILIKE '%' || NEW.policy_type || '%' THEN
            INSERT INTO public.policy_conflicts (
                subreddit_id,
                subreddit_policy_id,
                platform_policy_id,
                conflict_type,
                severity
            ) VALUES (
                NEW.subreddit_id,
                NEW.id,
                platform_policies.id,
                'overlap',
                'low'
            );
            conflict_found := TRUE;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for policy conflict detection
CREATE TRIGGER check_policy_conflicts_on_create
    AFTER INSERT OR UPDATE ON public.subreddit_policies
    FOR EACH ROW EXECUTE FUNCTION check_policy_conflicts();

-- Row Level Security (RLS) policies
ALTER TABLE public.subreddit_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subreddit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subreddit_masters
CREATE POLICY "Masters can view their own records" ON public.subreddit_masters
    FOR SELECT USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.subreddit_masters sm
        WHERE sm.user_id = auth.uid() 
        AND sm.subreddit_id = subreddit_masters.subreddit_id
        AND sm.role IN ('owner', 'moderator')
    ));

CREATE POLICY "Owners can manage masters" ON public.subreddit_masters
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.subreddit_masters sm
        WHERE sm.user_id = auth.uid() 
        AND sm.subreddit_id = subreddit_masters.subreddit_id
        AND sm.role = 'owner'
    ));

-- RLS Policies for moderation_queue
CREATE POLICY "Masters can view queue items" ON public.moderation_queue
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.subreddit_masters sm
        WHERE sm.user_id = auth.uid() 
        AND sm.subreddit_id = moderation_queue.subreddit_id
        AND sm.permissions->>'canReviewAIDecisions' = 'true'
    ));

CREATE POLICY "Masters can update queue items" ON public.moderation_queue
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.subreddit_masters sm
        WHERE sm.user_id = auth.uid() 
        AND sm.subreddit_id = moderation_queue.subreddit_id
        AND sm.permissions->>'canReviewAIDecisions' = 'true'
    ));

-- RLS Policies for master_notifications
CREATE POLICY "Users can view their own notifications" ON public.master_notifications
    FOR SELECT USING (master_id IN (
        SELECT id FROM public.subreddit_masters WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own notifications" ON public.master_notifications
    FOR UPDATE USING (master_id IN (
        SELECT id FROM public.subreddit_masters WHERE user_id = auth.uid()
    ));