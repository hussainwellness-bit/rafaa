-- ══════════════════════════════════════════════════════════════════════
-- Migration 021 — Ensure session_sets hero policy references sessions_v2
-- Migration 020 may have partially failed on prior runs leaving the hero
-- policy pointing at the old sessions table. This migration idempotently
-- fixes it.
-- ══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "session_sets: hero via session" ON session_sets;

CREATE POLICY "session_sets: hero via session"
  ON session_sets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM sessions_v2 s WHERE s.id = session_id AND s.user_id = auth.uid()::text)
  );
