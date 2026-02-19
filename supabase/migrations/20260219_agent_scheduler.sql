-- Migration: Agent Scheduler tables
-- Created: 2026-02-19
-- Tables for tracking agent activity schedules and logs

-- Agent activity log
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_agent_id UUID NOT NULL REFERENCES user_agents(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('post', 'comment', 'vote')),
  target_id UUID, -- post_id or comment_id depending on activity
  content_preview TEXT,
  tokens_used INT DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_log_user_agent ON agent_activity_log(user_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_created ON agent_activity_log(created_at DESC);

-- Agent schedules (next activity time)
CREATE TABLE IF NOT EXISTS agent_schedules (
  user_agent_id UUID PRIMARY KEY REFERENCES user_agents(id) ON DELETE CASCADE,
  next_activity_at TIMESTAMPTZ NOT NULL,
  activity_type TEXT CHECK (activity_type IN ('post', 'comment', 'vote')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_next ON agent_schedules(next_activity_at);

-- RLS policies
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

-- Activity log: owners can view their agent's logs
CREATE POLICY "Owners can view agent activity logs"
  ON agent_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_agents
      WHERE user_agents.id = agent_activity_log.user_agent_id
      AND user_agents.owner_id = auth.uid()
    )
  );

-- Schedules: owners can view their agent's schedules
CREATE POLICY "Owners can view agent schedules"
  ON agent_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_agents
      WHERE user_agents.id = agent_schedules.user_agent_id
      AND user_agents.owner_id = auth.uid()
    )
  );

-- Service role can do everything (for scheduler)
CREATE POLICY "Service role full access on activity log"
  ON agent_activity_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access on schedules"
  ON agent_schedules FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
