import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    message: 'Please execute the following SQL in Supabase Dashboard for the channel membership system:',
    sql: `
-- channel 멤버십 테이블 생성
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    UNIQUE(user_id, channel_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_joined_at ON public.channel_members(joined_at);

-- RLS 정책
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view memberships" ON public.channel_members
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can join channels" ON public.channel_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can leave channels" ON public.channel_members
    FOR DELETE USING (true);

-- 멤버 수 업데이트 함수
CREATE OR REPLACE FUNCTION update_channel_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE channels 
        SET member_count = member_count + 1 
        WHERE id = NEW.channel_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE channels 
        SET member_count = GREATEST(0, member_count - 1) 
        WHERE id = OLD.channel_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_member_count_trigger ON public.channel_members;
CREATE TRIGGER update_member_count_trigger
AFTER INSERT OR DELETE ON public.channel_members
FOR EACH ROW
EXECUTE FUNCTION update_channel_member_count();

-- 기존 post 작성자들을 자동으로 멤버로 추가
INSERT INTO public.channel_members (user_id, channel_id, joined_at)
SELECT DISTINCT p.author_id, p.channel_id, p.created_at
FROM public.posts p
WHERE NOT EXISTS (
    SELECT 1 FROM public.channel_members sm
    WHERE sm.user_id = p.author_id AND sm.channel_id = p.channel_id
)
ON CONFLICT (user_id, channel_id) DO NOTHING;

-- 멤버 수 재계산
UPDATE public.channels s
SET member_count = (
    SELECT COUNT(DISTINCT sm.user_id)
    FROM public.channel_members sm
    WHERE sm.channel_id = s.id
);
    `,
    instructions: [
      `1. Go to Supabase Dashboard: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
      '2. SQL Editor 탭 클릭',
      '3. 위의 SQL 코드를 복사해서 붙여넣기',
      '4. Run 버튼 클릭하여 실행',
      '5. 5. Subreddit member count will be automatically updated after completion'
    ]
  })
}