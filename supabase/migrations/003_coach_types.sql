-- Run in Supabase SQL editor
-- Adds coach type and physical hero support

-- Coach type: online (default) or physical
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coach_type text DEFAULT 'online'
  CHECK (coach_type IN ('online', 'physical'));

-- Physical hero flag: coach-managed, no login
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_physical boolean DEFAULT false;

-- ─── RLS: allow coaches to log sessions for their heroes ─────────────────────

CREATE POLICY "sessions: coach insert for own heroes"
  ON sessions FOR INSERT
  WITH CHECK (
    get_my_role() = 'coach' AND
    user_id IN (SELECT id FROM profiles WHERE coach_id = auth.uid()::text)
  );

CREATE POLICY "sessions: coach update for own heroes"
  ON sessions FOR UPDATE
  USING (
    get_my_role() = 'coach' AND
    user_id IN (SELECT id FROM profiles WHERE coach_id = auth.uid()::text)
  );

CREATE POLICY "sessions: coach delete for own heroes"
  ON sessions FOR DELETE
  USING (
    get_my_role() = 'coach' AND
    user_id IN (SELECT id FROM profiles WHERE coach_id = auth.uid()::text)
  );

CREATE POLICY "session_sets: coach insert for own heroes"
  ON session_sets FOR INSERT
  WITH CHECK (
    get_my_role() = 'coach' AND
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN profiles p ON p.id = s.user_id
      WHERE p.coach_id = auth.uid()::text
    )
  );

CREATE POLICY "session_sets: coach delete for own heroes"
  ON session_sets FOR DELETE
  USING (
    get_my_role() = 'coach' AND
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN profiles p ON p.id = s.user_id
      WHERE p.coach_id = auth.uid()::text
    )
  );

CREATE POLICY "journal_logs: coach insert for own heroes"
  ON journal_logs FOR INSERT
  WITH CHECK (
    get_my_role() = 'coach' AND
    user_id IN (SELECT id FROM profiles WHERE coach_id = auth.uid()::text)
  );

CREATE POLICY "journal_logs: coach update for own heroes"
  ON journal_logs FOR UPDATE
  USING (
    get_my_role() = 'coach' AND
    user_id IN (SELECT id FROM profiles WHERE coach_id = auth.uid()::text)
  );
