import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    message: 'Please execute the following SQL in Supabase Dashboard for the channel application system:',
    sql: `
-- Channel 개설 신청 테이블 생성
CREATE TABLE IF NOT EXISTS public.channel_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    reason TEXT NOT NULL,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_review', 'approved', 'rejected')),
    ai_review_result JSONB,
    admin_notes TEXT,
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    channel_id UUID REFERENCES public.channels(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_channel_requests_creator_id ON public.channel_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_channel_requests_status ON public.channel_requests(status);
CREATE INDEX IF NOT EXISTS idx_channel_requests_created_at ON public.channel_requests(created_at);

-- RLS 정책
ALTER TABLE public.channel_requests ENABLE ROW LEVEL SECURITY;

-- user는 자신의 신청만 볼 수 있음
CREATE POLICY IF NOT EXISTS "Users can view own requests" ON public.channel_requests
    FOR SELECT USING (creator_id = auth.uid());

-- 누구나 신청 가능
CREATE POLICY IF NOT EXISTS "Anyone can create requests" ON public.channel_requests
    FOR INSERT WITH CHECK (true);

-- Admin는 모든 신청 관리 가능 (Admin 체크는 애플리케이션에서)
CREATE POLICY IF NOT EXISTS "Allow full access for service role" ON public.channel_requests
    FOR ALL USING (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_channel_requests_updated_at 
    BEFORE UPDATE ON public.channel_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `,
    instructions: [
      '1. Supabase 대시보드로 이동',
      '2. SQL Editor 탭 클릭',
      '3. 위의 SQL 코드를 복사해서 붙여넣기',
      '4. Run 버튼 클릭하여 실행'
    ]
  })
}