import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    message: 'To add admin columns to the users table, execute the following SQL in Supabase Dashboard:',
    sql: `
-- Add admin columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Update existing users to have default role
UPDATE public.users SET role = 'user' WHERE role IS NULL;
UPDATE public.users SET is_admin = false WHERE is_admin IS NULL;

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);
    `,
    instructions: [
      `1. Go to Supabase Dashboard: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
      '2. SQL Editor 탭 클릭',
      '3. 위의 SQL 코드를 복사해서 붙여넣기',
      '4. Run 버튼 클릭하여 실행',
      '5. 완료 후 user를 admin으로 설정 가능'
    ]
  })
}