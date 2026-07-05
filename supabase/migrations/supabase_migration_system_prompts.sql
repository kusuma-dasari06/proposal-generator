-- ============================================================
-- Supabase Migration — System Prompts Table
-- Stores editable collection and generation prompts
-- Safe to re-run: fully idempotent
-- ============================================================

-- System prompts table
CREATE TABLE IF NOT EXISTS system_prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key  TEXT NOT NULL UNIQUE,   -- 'collection' or 'generation'
  content     TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by key
CREATE INDEX IF NOT EXISTS idx_system_prompts_key ON system_prompts(prompt_key);

-- Enable Row-Level Security
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

-- Drop policies first so re-running doesn't error
DROP POLICY IF EXISTS "Allow anon read system_prompts" ON system_prompts;
DROP POLICY IF EXISTS "Allow anon insert system_prompts" ON system_prompts;
DROP POLICY IF EXISTS "Allow anon update system_prompts" ON system_prompts;

-- Allow anonymous read, insert, update (used by the app via anon key)
CREATE POLICY "Allow anon read system_prompts" ON system_prompts
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert system_prompts" ON system_prompts
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update system_prompts" ON system_prompts
  FOR UPDATE TO anon USING (true);

-- Auto-update updated_at on every row change
-- (Reuses the update_updated_at function if it already exists from the sessions migration)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_system_prompts ON system_prompts;

CREATE TRIGGER set_updated_at_system_prompts
  BEFORE UPDATE ON system_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
