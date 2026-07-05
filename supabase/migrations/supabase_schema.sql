-- ============================================================
-- Supabase Schema — Proposal Generator Sessions
-- Safe to re-run: fully idempotent
-- ============================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Main sessions table
CREATE TABLE IF NOT EXISTS proposal_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      TEXT NOT NULL UNIQUE,
  client_name     TEXT,
  client_type     TEXT CHECK (client_type IN ('Hospital', 'Doctor')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conversation_history  JSONB,
  proposal_json   JSONB,
  final_proposal  TEXT
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON proposal_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_type ON proposal_sessions(client_type);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON proposal_sessions(created_at DESC);

-- Enable Row-Level Security
ALTER TABLE proposal_sessions ENABLE ROW LEVEL SECURITY;

-- Drop policies first so re-running doesn't error
DROP POLICY IF EXISTS "Allow anon insert" ON proposal_sessions;
DROP POLICY IF EXISTS "Allow anon update own session" ON proposal_sessions;
DROP POLICY IF EXISTS "Allow authenticated read" ON proposal_sessions;

-- Allow anonymous inserts and updates (used by the app via anon key)
CREATE POLICY "Allow anon insert" ON proposal_sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update own session" ON proposal_sessions
  FOR UPDATE TO anon USING (true);

-- Optional: uncomment to let authenticated (logged-in) users read all sessions
-- CREATE POLICY "Allow authenticated read" ON proposal_sessions
--   FOR SELECT TO authenticated USING (true);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger before recreating (idempotent)
DROP TRIGGER IF EXISTS set_updated_at ON proposal_sessions;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON proposal_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
