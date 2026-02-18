-- Enhanced Token System Migration
-- Version: 1.1.0
-- Date: 2025-09-16
-- Description: Adds achievements, gift transactions, rate limiting, and enhanced marketplace features

-- =====================================================
-- ACHIEVEMENTS SYSTEM
-- =====================================================

-- Achievements master table
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('content', 'social', 'tokens', 'special')),
    threshold INTEGER NOT NULL CHECK (threshold > 0),
    icon_url TEXT,
    reward_tokens INTEGER NOT NULL DEFAULT 0 CHECK (reward_tokens >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User achievements junction table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    claimed BOOLEAN DEFAULT false,
    CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- =====================================================
-- GIFT TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.gift_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0 AND amount <= 1000),
    message TEXT CHECK (LENGTH(message) <= 500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

-- =====================================================
-- TOKEN EVENTS (Special Events/Multipliers)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.token_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    multiplier DECIMAL(3,2) NOT NULL CHECK (multiplier > 0 AND multiplier <= 10),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    rules JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_event_dates CHECK (start_date < end_date)
);

-- =====================================================
-- RATE LIMITING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.token_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('post', 'comment', 'gift')),
    tokens_remaining INTEGER NOT NULL CHECK (tokens_remaining >= 0),
    last_refill TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    max_tokens INTEGER NOT NULL CHECK (max_tokens > 0),
    refill_rate INTEGER NOT NULL CHECK (refill_rate > 0),
    CONSTRAINT unique_user_action UNIQUE (user_id, action_type)
);

-- =====================================================
-- ENHANCED MARKETPLACE
-- =====================================================

-- Add new columns to existing marketplace_items table if they don't exist
ALTER TABLE public.marketplace_items
ADD COLUMN IF NOT EXISTS duration VARCHAR(20) CHECK (duration IN ('permanent', '7_days', '30_days', '90_days')),
ADD COLUMN IF NOT EXISTS stock_limit INTEGER,
ADD COLUMN IF NOT EXISTS available_from TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS available_until TIMESTAMP WITH TIME ZONE;
-- Note: Will add constraint separately below using DO block

-- User marketplace items (owned items)
CREATE TABLE IF NOT EXISTS public.user_marketplace_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.token_transactions(id),
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- ENHANCED TOKEN TRANSACTIONS
-- =====================================================

-- Add new columns to existing token_transactions table
ALTER TABLE public.token_transactions
ADD COLUMN IF NOT EXISTS reference_id UUID,
ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);

-- Update type constraint to include new transaction types
ALTER TABLE public.token_transactions
DROP CONSTRAINT IF EXISTS token_transactions_type_check;

ALTER TABLE public.token_transactions
ADD CONSTRAINT token_transactions_type_check
CHECK (type IN ('earn', 'spend', 'gift_sent', 'gift_received', 'bonus', 'refund'));

-- =====================================================
-- USER ENHANCEMENTS
-- =====================================================

-- Add token-related columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_earned_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_spent_total INTEGER DEFAULT 0;

-- Migrate existing karma_points to token_balance if needed
UPDATE public.users
SET token_balance = COALESCE(karma_points, 0)
WHERE token_balance = 0 AND karma_points > 0;

-- =====================================================
-- LEADERBOARD MATERIALIZED VIEW
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.token_leaderboard AS
SELECT
    u.id as user_id,
    u.username,
    p.avatar_url,
    COALESCE(SUM(CASE WHEN tt.amount > 0 THEN tt.amount ELSE 0 END), 0)::INTEGER as total_earned,
    COALESCE(SUM(CASE WHEN tt.amount < 0 THEN ABS(tt.amount) ELSE 0 END), 0)::INTEGER as total_spent,
    COALESCE(SUM(tt.amount), 0)::INTEGER as current_balance,
    RANK() OVER (ORDER BY COALESCE(SUM(tt.amount), 0) DESC) as rank
FROM public.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.token_transactions tt ON u.id = tt.user_id
GROUP BY u.id, u.username, p.avatar_url;

-- =====================================================
-- INDEXES
-- =====================================================

-- Achievement indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(active, sort_order) WHERE active = true;

-- Gift transaction indexes
CREATE INDEX IF NOT EXISTS idx_gifts_from_user ON public.gift_transactions(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gifts_to_user ON public.gift_transactions(to_user_id, created_at DESC);

-- Token event indexes
CREATE INDEX IF NOT EXISTS idx_token_events_active ON public.token_events(active, start_date, end_date) WHERE active = true;

-- Rate limit indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.token_rate_limits(user_id, action_type);

-- User marketplace items indexes
CREATE INDEX IF NOT EXISTS idx_user_items_user ON public.user_marketplace_items(user_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_items_expires ON public.user_marketplace_items(expires_at) WHERE expires_at IS NOT NULL;

-- Enhanced token transaction indexes
CREATE INDEX IF NOT EXISTS idx_token_tx_reference ON public.token_transactions(reference_id, reference_type) WHERE reference_id IS NOT NULL;

-- Leaderboard indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_user ON public.token_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON public.token_leaderboard(rank);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update user token balance
CREATE OR REPLACE FUNCTION update_user_token_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's token balance
    UPDATE public.users
    SET
        token_balance = token_balance + NEW.amount,
        tokens_earned_total = CASE
            WHEN NEW.amount > 0 THEN tokens_earned_total + NEW.amount
            ELSE tokens_earned_total
        END,
        tokens_spent_total = CASE
            WHEN NEW.amount < 0 THEN tokens_spent_total + ABS(NEW.amount)
            ELSE tokens_spent_total
        END
    WHERE id = NEW.user_id;

    -- Check for negative balance (should not happen with proper validation)
    IF (SELECT token_balance FROM public.users WHERE id = NEW.user_id) < 0 THEN
        RAISE EXCEPTION 'Insufficient token balance';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action_type VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_tokens_remaining INTEGER;
    v_last_refill TIMESTAMP;
    v_max_tokens INTEGER;
    v_refill_rate INTEGER;
    v_hours_passed INTEGER;
    v_tokens_to_add INTEGER;
BEGIN
    -- Get current rate limit
    SELECT tokens_remaining, last_refill, max_tokens, refill_rate
    INTO v_tokens_remaining, v_last_refill, v_max_tokens, v_refill_rate
    FROM public.token_rate_limits
    WHERE user_id = p_user_id AND action_type = p_action_type;

    -- If no record, create one with full tokens
    IF NOT FOUND THEN
        INSERT INTO public.token_rate_limits (user_id, action_type, tokens_remaining, max_tokens, refill_rate)
        VALUES (p_user_id, p_action_type,
            CASE p_action_type
                WHEN 'post' THEN 10
                WHEN 'comment' THEN 50
                WHEN 'gift' THEN 10
            END - 1,
            CASE p_action_type
                WHEN 'post' THEN 10
                WHEN 'comment' THEN 50
                WHEN 'gift' THEN 10
            END,
            CASE p_action_type
                WHEN 'post' THEN 10
                WHEN 'comment' THEN 50
                WHEN 'gift' THEN 10
            END
        );
        RETURN TRUE;
    END IF;

    -- Calculate tokens to refill
    v_hours_passed := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_last_refill)) / 3600;
    v_tokens_to_add := v_hours_passed * v_refill_rate;

    -- Update tokens
    IF v_tokens_to_add > 0 THEN
        v_tokens_remaining := LEAST(v_max_tokens, v_tokens_remaining + v_tokens_to_add);
        UPDATE public.token_rate_limits
        SET tokens_remaining = v_tokens_remaining - 1,
            last_refill = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id AND action_type = p_action_type;
    ELSE
        -- Just decrement if we have tokens
        IF v_tokens_remaining > 0 THEN
            UPDATE public.token_rate_limits
            SET tokens_remaining = v_tokens_remaining - 1
            WHERE user_id = p_user_id AND action_type = p_action_type;
        ELSE
            RETURN FALSE; -- Rate limit exceeded
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE(achievement_id UUID, reward_tokens INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.reward_tokens
    FROM public.achievements a
    WHERE a.active = true
    AND NOT EXISTS (
        SELECT 1 FROM public.user_achievements ua
        WHERE ua.user_id = p_user_id
        AND ua.achievement_id = a.id
    )
    AND (
        -- Check different achievement conditions based on category
        (a.category = 'tokens' AND
         (SELECT token_balance FROM public.users WHERE id = p_user_id) >= a.threshold)
        OR
        (a.category = 'content' AND
         (SELECT COUNT(*) FROM public.posts WHERE author_id = p_user_id) >= a.threshold)
        OR
        (a.category = 'social' AND
         (SELECT COUNT(*) FROM public.comments WHERE author_id = p_user_id) >= a.threshold)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_token_leaderboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.token_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update balance on transaction
DROP TRIGGER IF EXISTS trigger_update_token_balance ON public.token_transactions;
CREATE TRIGGER trigger_update_token_balance
AFTER INSERT ON public.token_transactions
FOR EACH ROW
EXECUTE FUNCTION update_user_token_balance();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_marketplace_items ENABLE ROW LEVEL SECURITY;

-- Achievements policies
CREATE POLICY "Achievements are viewable by everyone" ON public.achievements
    FOR SELECT USING (active = true);

CREATE POLICY "User achievements viewable by owner" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user achievements" ON public.user_achievements
    FOR ALL USING (true);

-- Gift transactions policies
CREATE POLICY "Users can view gifts they sent or received" ON public.gift_transactions
    FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send gifts" ON public.gift_transactions
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Token events policies
CREATE POLICY "Active events viewable by everyone" ON public.token_events
    FOR SELECT USING (active = true AND start_date <= CURRENT_TIMESTAMP AND end_date >= CURRENT_TIMESTAMP);

-- Rate limits policies
CREATE POLICY "Users can view their own rate limits" ON public.token_rate_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" ON public.token_rate_limits
    FOR ALL USING (true);

-- User marketplace items policies
CREATE POLICY "Users can view their own items" ON public.user_marketplace_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase items" ON public.user_marketplace_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert initial achievements
INSERT INTO public.achievements (name, description, category, threshold, reward_tokens, sort_order) VALUES
('첫 게시물', '첫 번째 게시물을 작성하세요', 'content', 1, 50, 1),
('다작 작가', '게시물 10개 작성', 'content', 10, 100, 2),
('콘텐츠 크리에이터', '게시물 50개 작성', 'content', 50, 500, 3),
('첫 댓글', '첫 번째 댓글을 작성하세요', 'social', 1, 20, 4),
('대화의 달인', '댓글 50개 작성', 'social', 50, 200, 5),
('토큰 수집가', '1000 토큰 획득', 'tokens', 1000, 100, 6),
('토큰 부자', '10000 토큰 획득', 'tokens', 10000, 1000, 7),
('나눔의 미덕', '5명에게 토큰 선물', 'social', 5, 200, 8),
('얼리 어답터', '첫 달 가입 특별 보상', 'special', 1, 500, 9)
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT ON public.token_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements TO authenticated;

-- =====================================================
-- ADDITIONAL CONSTRAINTS
-- =====================================================

-- Add availability constraint to marketplace_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'valid_availability') THEN
        ALTER TABLE public.marketplace_items
        ADD CONSTRAINT valid_availability CHECK (
            (available_from IS NULL AND available_until IS NULL) OR
            (available_from IS NOT NULL AND available_until IS NOT NULL AND available_from < available_until)
        );
    END IF;
END $$;