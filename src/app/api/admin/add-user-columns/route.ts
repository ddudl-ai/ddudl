import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    message: 'To add additional columns to the users table, execute the following SQL in Supabase Dashboard:',
    sql: `
-- Add additional columns to users table for user management
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Update existing users to have default values
UPDATE public.users SET login_count = 0 WHERE login_count IS NULL;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_users_ban_reason ON public.users(ban_reason);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login);
    `,
    instructions: [
      `1. Go to Supabase Dashboard: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
      '2. SQL Editor 탭 클릭',
      '3. 위의 SQL 코드를 복사해서 붙여넣기',
      '4. Run 버튼 클릭하여 실행',
      '5. 완료 후 user 관리 기능 이용 가능'
    ]
  })
}