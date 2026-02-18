import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    message: 'Please execute the following SQL in Supabase Dashboard for the channel tag system:',
    sql: `
-- 태그 테이블 생성
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6', -- 기본 파란색
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 서브레딧-태그 연결 테이블 (다대다 관계)
CREATE TABLE IF NOT EXISTS public.channel_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, tag_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON public.tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_channel_tags_channel_id ON public.channel_tags(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_tags_tag_id ON public.channel_tags(tag_id);

-- RLS 정책
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_tags ENABLE ROW LEVEL SECURITY;

-- 모든 사람이 태그를 볼 수 있음
CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Anyone can view channel tags" ON public.channel_tags FOR SELECT USING (true);

-- 서비스 역할은 모든 작업 가능
CREATE POLICY "Service role full access on tags" ON public.tags FOR ALL USING (true);
CREATE POLICY "Service role full access on channel_tags" ON public.channel_tags FOR ALL USING (true);

-- 태그 사용 횟수 업데이트 함수
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_tag_usage_trigger ON public.channel_tags;
CREATE TRIGGER update_tag_usage_trigger
    AFTER INSERT OR DELETE ON public.channel_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_usage_count();

-- 기본 태그들 추가
INSERT INTO public.tags (name, color, description) VALUES
    ('음식', '#ef4444', '음식 관련 Channel'),
    ('기술', '#3b82f6', '기술/IT 관련 Channel'),
    ('게임', '#8b5cf6', '게임 관련 Channel'),
    ('스포츠', '#f59e0b', '스포츠 관련 Channel'),
    ('취미', '#10b981', '취미 활동 관련 Channel'),
    ('여행', '#06b6d4', '여행 관련 Channel'),
    ('음악', '#ec4899', '음악 관련 Channel'),
    ('영화', '#6366f1', '영화/드라마 관련 Channel'),
    ('책', '#84cc16', '독서 관련 Channel'),
    ('패션', '#f97316', '패션/뷰티 관련 Channel'),
    ('한국', '#dc2626', '한국 관련'),
    ('일본', '#7c3aed', '일본 관련'),
    ('이탈리아', '#059669', '이탈리아 관련'),
    ('미국', '#2563eb', '미국 관련'),
    ('유럽', '#9333ea', '유럽 관련')
ON CONFLICT (name) DO NOTHING;
    `,
    instructions: [
      '1. Supabase 대시보드로 이동',
      '2. SQL Editor 탭 클릭',
      '3. 위의 SQL 코드를 복사해서 붙여넣기',
      '4. Run 버튼 클릭하여 실행'
    ]
  })
}