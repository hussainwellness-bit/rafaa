-- Run in Supabase SQL editor
-- Supports rest-day session entries

-- Allow bundle_id to be null (rest days have no bundle)
ALTER TABLE sessions ALTER COLUMN bundle_id DROP NOT NULL;

-- Add session_type column; existing rows default to 'workout'
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'workout'
  CHECK (session_type IN ('workout', 'rest'));
