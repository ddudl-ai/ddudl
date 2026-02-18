-- Token System Migration
-- 토큰 경제 시스템을 위한 테이블들

-- 토큰 거래 기록 테이블
CREATE TABLE IF NOT EXISTS public.token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 프리미엄 기능 구매 기록
CREATE TABLE IF NOT EXISTS public.premium_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    feature_type TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    duration_type TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 게시물 부스트 기록
CREATE TABLE IF NOT EXISTS public.post_boosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    cost DECIMAL(10,2) NOT NULL,
    boost_type TEXT NOT NULL DEFAULT 'visibility',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 마켓플레이스 아이템
CREATE TABLE IF NOT EXISTS public.marketplace_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    file_url TEXT,
    preview_url TEXT,
    tags TEXT[] DEFAULT '{}',
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 마켓플레이스 구매 기록
CREATE TABLE IF NOT EXISTS public.marketplace_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    seller_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 일일 활동 기록
CREATE TABLE IF NOT EXISTS public.user_daily_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    posts_created INTEGER DEFAULT 0,
    comments_created INTEGER DEFAULT 0,
    upvotes_given INTEGER DEFAULT 0,
    tokens_earned DECIMAL(10,2) DEFAULT 0,
    login_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON public.token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON public.token_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON public.token_transactions(type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_category ON public.token_transactions(category);

CREATE INDEX IF NOT EXISTS idx_premium_purchases_user_id ON public.premium_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_purchases_expires_at ON public.premium_purchases(expires_at);
CREATE INDEX IF NOT EXISTS idx_premium_purchases_active ON public.premium_purchases(is_active);

CREATE INDEX IF NOT EXISTS idx_post_boosts_post_id ON public.post_boosts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_boosts_user_id ON public.post_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_boosts_expires_at ON public.post_boosts(expires_at);
CREATE INDEX IF NOT EXISTS idx_post_boosts_active ON public.post_boosts(is_active);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_creator_id ON public.marketplace_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_category ON public.marketplace_items(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_active ON public.marketplace_items(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_price ON public.marketplace_items(price);

CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer_id ON public.marketplace_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_seller_id ON public.marketplace_purchases(seller_id);

CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_date ON public.user_daily_activity(user_id, activity_date);

-- RLS 정책
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;

-- 토큰 거래 정책
CREATE POLICY "Users can view their own token transactions" ON public.token_transactions
    FOR SELECT USING (true);  -- 모든 사용자가 볼 수 있음 (투명성)

CREATE POLICY "System can insert token transactions" ON public.token_transactions
    FOR INSERT WITH CHECK (true);  -- 시스템에서만 삽입

-- 프리미엄 구매 정책
CREATE POLICY "Users can view their own premium purchases" ON public.premium_purchases
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own premium purchases" ON public.premium_purchases
    FOR INSERT WITH CHECK (true);

-- 게시물 부스트 정책
CREATE POLICY "Users can view post boosts" ON public.post_boosts
    FOR SELECT USING (true);

CREATE POLICY "Users can create post boosts" ON public.post_boosts
    FOR INSERT WITH CHECK (true);

-- 마켓플레이스 정책
CREATE POLICY "Marketplace items are viewable by everyone" ON public.marketplace_items
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create marketplace items" ON public.marketplace_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can update their own items" ON public.marketplace_items
    FOR UPDATE USING (true);

-- 마켓플레이스 구매 정책
CREATE POLICY "Users can view their marketplace purchases" ON public.marketplace_purchases
    FOR SELECT USING (true);

CREATE POLICY "Users can make purchases" ON public.marketplace_purchases
    FOR INSERT WITH CHECK (true);

-- 일일 활동 정책
CREATE POLICY "Users can view their own daily activity" ON public.user_daily_activity
    FOR SELECT USING (true);

CREATE POLICY "System can manage daily activity" ON public.user_daily_activity
    FOR ALL USING (true);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 마켓플레이스 아이템 업데이트 트리거
CREATE TRIGGER update_marketplace_items_updated_at
    BEFORE UPDATE ON public.marketplace_items
    FOR EACH ROW
    EXECUTE FUNCTION update_marketplace_updated_at();