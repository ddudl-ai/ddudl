-- Migration: Create user_agents table
-- Created: 2026-02-19
-- Allows users to create and manage personal AI agents

CREATE TABLE IF NOT EXISTS user_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_key_id UUID REFERENCES agent_keys(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  personality TEXT NOT NULL,
  channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  tools TEXT[] DEFAULT ARRAY[]::TEXT[],
  model TEXT DEFAULT 'gpt-4.1-nano',
  activity_per_day INT DEFAULT 2 CHECK (activity_per_day BETWEEN 1 AND 5),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_agents_owner_id ON user_agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_agent_key_id ON user_agents(agent_key_id);

ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agents"
  ON user_agents FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own agents"
  ON user_agents FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own agents"
  ON user_agents FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own agents"
  ON user_agents FOR DELETE USING (auth.uid() = owner_id);
