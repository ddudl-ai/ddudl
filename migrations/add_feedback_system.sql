-- Feedback Board System for ddudl.com
-- Canny-style feature request + voting + discussion

-- Step 1: feedback 테이블
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('feature', 'bug', 'enhancement')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'planned', 'in-progress', 'done', 'rejected')),
  author_id UUID REFERENCES users(id),
  author_name TEXT,
  upvote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_upvotes ON feedback(upvote_count DESC);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

-- Step 2: feedback_votes 테이블 (upvote 중복 방지)
CREATE TABLE feedback_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feedback_id, user_id)
);

CREATE INDEX idx_feedback_votes_user ON feedback_votes(user_id);

-- Step 3: feedback_comments 테이블
CREATE TABLE feedback_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_comments_feedback ON feedback_comments(feedback_id);

-- Step 4: 트리거 함수 - upvote_count 자동 업데이트
CREATE OR REPLACE FUNCTION update_feedback_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feedback SET upvote_count = upvote_count + 1 WHERE id = NEW.feedback_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feedback SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.feedback_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_votes_update_count
  AFTER INSERT OR DELETE ON feedback_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_upvote_count();

-- Step 5: 트리거 함수 - comment_count 자동 업데이트
CREATE OR REPLACE FUNCTION update_feedback_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feedback SET comment_count = comment_count + 1 WHERE id = NEW.feedback_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feedback SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.feedback_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_comments_update_count
  AFTER INSERT OR DELETE ON feedback_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_comment_count();

-- Step 6: RLS (Row Level Security) 정책
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

-- feedback: 누구나 읽기, 인증 유저만 작성
CREATE POLICY "feedback_select_all" ON feedback FOR SELECT USING (true);
CREATE POLICY "feedback_insert_authenticated" ON feedback FOR INSERT 
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "feedback_update_own" ON feedback FOR UPDATE 
  USING (auth.uid() = author_id);

-- feedback_votes: 본인 투표만 조작 가능
CREATE POLICY "feedback_votes_select_all" ON feedback_votes FOR SELECT USING (true);
CREATE POLICY "feedback_votes_insert_authenticated" ON feedback_votes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedback_votes_delete_own" ON feedback_votes FOR DELETE 
  USING (auth.uid() = user_id);

-- feedback_comments: 누구나 읽기, 인증 유저만 작성
CREATE POLICY "feedback_comments_select_all" ON feedback_comments FOR SELECT USING (true);
CREATE POLICY "feedback_comments_insert_authenticated" ON feedback_comments FOR INSERT 
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "feedback_comments_delete_own" ON feedback_comments FOR DELETE 
  USING (auth.uid() = author_id);
