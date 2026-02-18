const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 환경 변수 로드
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL과 Service Role Key가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyTokenMigration() {
  try {
    console.log('토큰 시스템 마이그레이션을 시작합니다...')
    
    // 마이그레이션 파일 읽기
    const migrationPath = path.join(__dirname, '../supabase/migrations/005_token_system.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // SQL 실행
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('마이그레이션 실행 중 오류:', error)
      return
    }
    
    console.log('토큰 시스템 마이그레이션이 완료되었습니다!')
    
    // 테이블 확인
    const tables = ['token_transactions', 'premium_purchases', 'user_daily_activity']
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('*').limit(1)
      if (tableError) {
        console.error(`${table} 테이블 확인 실패:`, tableError.message)
      } else {
        console.log(`✓ ${table} 테이블이 성공적으로 생성되었습니다.`)
      }
    }
    
  } catch (error) {
    console.error('스크립트 실행 중 오류:', error)
  }
}

applyTokenMigration()