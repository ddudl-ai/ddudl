-- 기존 사용자 읽기 정책 삭제
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- 사용자 기본 정보(username)는 모든 사람이 읽을 수 있도록 설정
CREATE POLICY "Users basic info readable by everyone" ON users
  FOR SELECT USING (true);

-- 하지만 사용자는 자신의 상세 정보만 수정할 수 있음
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);