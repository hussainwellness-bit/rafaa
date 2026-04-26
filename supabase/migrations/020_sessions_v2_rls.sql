-- ══════════════════════════════════════════════════════════════════════
-- Migration 020 — RLS for sessions_v2 + fix session_sets to use sessions_v2
-- All workout saves now go to sessions_v2. This migration:
--   1. Enables RLS on sessions_v2 and adds hero/coach policies
--   2. Drops old session_sets policies (which join sessions, not sessions_v2)
--   3. Recreates session_sets policies joining sessions_v2
-- ══════════════════════════════════════════════════════════════════════

-- ─── sessions_v2 ─────────────────────────────────────────────────────────────
ALTER TABLE sessions_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_v2: hero sees own"
  ON sessions_v2 FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "sessions_v2: hero insert"
  ON sessions_v2 FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "sessions_v2: hero update own"
  ON sessions_v2 FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "sessions_v2: hero delete own"
  ON sessions_v2 FOR DELETE
  USING (user_id = auth.uid()::text);

CREATE POLICY "sessions_v2: coach sees heroes' sessions"
  ON sessions_v2 FOR SELECT
  USING (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.coach_id = auth.uid()::text)
  );

CREATE POLICY "sessions_v2: coach delete heroes' sessions"
  ON sessions_v2 FOR DELETE
  USING (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.coach_id = auth.uid()::text)
  );

CREATE POLICY "sessions_v2: super_admin all"
  ON sessions_v2 FOR ALL
  USING (get_my_role() = 'super_admin');

-- Coach can also insert sessions logged for heroes
CREATE POLICY "sessions_v2: coach insert for own heroes"
  ON sessions_v2 FOR INSERT
  WITH CHECK (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.coach_id = auth.uid()::text)
  );

CREATE POLICY "sessions_v2: coach update for own heroes"
  ON sessions_v2 FOR UPDATE
  USING (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.coach_id = auth.uid()::text)
  );

-- ─── session_sets — fix to join sessions_v2 instead of sessions ───────────────
DROP POLICY IF EXISTS "session_sets: hero via session" ON session_sets;
DROP POLICY IF EXISTS "session_sets: coach via hero session" ON session_sets;

CREATE POLICY "session_sets: hero via session"
  ON session_sets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM sessions_v2 s WHERE s.id = session_id AND s.user_id = auth.uid()::text)
  );

CREATE POLICY "session_sets: coach via hero session"
  ON session_sets FOR SELECT
  USING (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (
      SELECT 1 FROM sessions_v2 s
      JOIN profiles p ON p.id = s.user_id
      WHERE s.id = session_id AND p.coach_id = auth.uid()::text
    )
  );

CREATE POLICY "session_sets: coach delete via hero session"
  ON session_sets FOR DELETE
  USING (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (
      SELECT 1 FROM sessions_v2 s
      JOIN profiles p ON p.id = s.user_id
      WHERE s.id = session_id AND p.coach_id = auth.uid()::text
    )
  );
