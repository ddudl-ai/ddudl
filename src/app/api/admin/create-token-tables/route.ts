import { NextResponse } from 'next/server'

export async function POST() {
  try {
    
    return NextResponse.json({
      success: false,
      message: 'Please execute the following SQL directly in Supabase Dashboard:',
      sql: `
-- Token System Tables

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON public.token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON public.token_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_token_transactions_category ON public.token_transactions(category);

CREATE INDEX IF NOT EXISTS idx_premium_purchases_user_id ON public.premium_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_purchases_expires_at ON public.premium_purchases(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_date ON public.user_daily_activity(user_id, activity_date);

-- RLS
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY IF NOT EXISTS "token_transactions_select" ON public.token_transactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "token_transactions_insert" ON public.token_transactions FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "premium_purchases_select" ON public.premium_purchases FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "premium_purchases_insert" ON public.premium_purchases FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "user_daily_activity_select" ON public.user_daily_activity FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "user_daily_activity_all" ON public.user_daily_activity FOR ALL USING (true);
      `,
      instructions: [
        `1. Go to Supabase Dashboard: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
        '2. SQL Editor 탭 클릭',
        '3. 위의 SQL 코드를 복사해서 붙여넣기',
        '4. Run 버튼 클릭하여 실행',
        '5. 완료 후 일일 보상 다시 시도'
      ]
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}