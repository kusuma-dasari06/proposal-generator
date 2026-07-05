-- ============================================================
-- Supabase Schema Migration — Chat History Support
-- Adds device_id column and new RLS policies
-- Safe to re-run: fully idempotent
-- ============================================================

-- Add device_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposal_sessions' AND column_name = 'device_id'
  ) THEN
    ALTER TABLE proposal_sessions ADD COLUMN device_id TEXT;
  END IF;
END $$;

-- Add is_refinement_mode column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposal_sessions' AND column_name = 'is_refinement_mode'
  ) THEN
    ALTER TABLE proposal_sessions ADD COLUMN is_refinement_mode BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Index for device_id lookups
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON proposal_sessions(device_id);

-- Drop and recreate policies to include SELECT and DELETE for anon
DROP POLICY IF EXISTS "Allow anon select own device" ON proposal_sessions;
DROP POLICY IF EXISTS "Allow anon delete own device" ON proposal_sessions;

CREATE POLICY "Allow anon select own device" ON proposal_sessions
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon delete own device" ON proposal_sessions
  FOR DELETE TO anon USING (true);
