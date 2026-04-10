-- ============================================================
-- RLS Policies for Hussain.Lift
-- Run this in your Supabase SQL editor
-- ============================================================

-- Helper: get current user's profile id (auth.uid maps to profiles.id)
-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()::text
$$;

CREATE OR REPLACE FUNCTION get_my_coach_id()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT coach_id FROM profiles WHERE id = auth.uid()::text
$$;

-- ─── profiles ────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: super_admin sees all"
  ON profiles FOR SELECT
  USING (get_my_role() = 'super_admin');

CREATE POLICY "profiles: coach sees own heroes"
  ON profiles FOR SELECT
  USING (
    get_my_role() = 'coach' AND (
      id = auth.uid()::text OR coach_id = auth.uid()::text
    )
  );

CREATE POLICY "profiles: hero sees own"
  ON profiles FOR SELECT
  USING (id = auth.uid()::text);

CREATE POLICY "profiles: super_admin insert"
  ON profiles FOR INSERT
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "profiles: coach insert hero"
  ON profiles FOR INSERT
  WITH CHECK (get_my_role() = 'coach' AND role = 'hero');

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (id = auth.uid()::text);

CREATE POLICY "profiles: coach update own heroes"
  ON profiles FOR UPDATE
  USING (get_my_role() = 'coach' AND coach_id = auth.uid()::text);

CREATE POLICY "profiles: super_admin update all"
  ON profiles FOR UPDATE
  USING (get_my_role() = 'super_admin');

-- ─── bundles ─────────────────────────────────────────────────
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundles: hero sees own"
  ON bundles FOR SELECT
  USING (client_id = auth.uid()::text);

CREATE POLICY "bundles: coach sees own heroes' bundles"
  ON bundles FOR SELECT
  USING (get_my_role() IN ('coach', 'super_admin'));

CREATE POLICY "bundles: coach insert/update/delete"
  ON bundles FOR ALL
  USING (get_my_role() IN ('coach', 'super_admin'));

-- ─── bundle_exercises ────────────────────────────────────────
ALTER TABLE bundle_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_exercises: read via bundle"
  ON bundle_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bundles b WHERE b.id = bundle_id AND (
        b.client_id = auth.uid()::text OR get_my_role() IN ('coach', 'super_admin')
      )
    )
  );

CREATE POLICY "bundle_exercises: coach manage"
  ON bundle_exercises FOR ALL
  USING (get_my_role() IN ('coach', 'super_admin'));

-- ─── plan_schedule ───────────────────────────────────────────
ALTER TABLE plan_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule: hero sees own"
  ON plan_schedule FOR SELECT
  USING (client_id = auth.uid()::text);

CREATE POLICY "schedule: coach manages"
  ON plan_schedule FOR ALL
  USING (get_my_role() IN ('coach', 'super_admin'));

-- ─── sessions ────────────────────────────────────────────────
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions: hero sees own"
  ON sessions FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "sessions: hero insert/update"
  ON sessions FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "sessions: hero update own"
  ON sessions FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "sessions: coach sees heroes' sessions"
  ON sessions FOR SELECT
  USING (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.coach_id = auth.uid()::text)
  );

-- ─── session_sets ────────────────────────────────────────────
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_sets: hero via session"
  ON session_sets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.user_id = auth.uid()::text)
  );

CREATE POLICY "session_sets: coach via hero session"
  ON session_sets FOR SELECT
  USING (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN profiles p ON p.id = s.user_id
      WHERE s.id = session_id AND p.coach_id = auth.uid()::text
    )
  );

-- ─── journal_logs ────────────────────────────────────────────
ALTER TABLE journal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal: hero owns"
  ON journal_logs FOR ALL
  USING (user_id = auth.uid()::text);

CREATE POLICY "journal: coach reads heroes'"
  ON journal_logs FOR SELECT
  USING (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.coach_id = auth.uid()::text)
  );

-- ─── nutrition_logs ──────────────────────────────────────────
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutrition: hero owns"
  ON nutrition_logs FOR ALL
  USING (user_id = auth.uid()::text);

CREATE POLICY "nutrition: coach reads"
  ON nutrition_logs FOR SELECT
  USING (
    get_my_role() IN ('coach', 'super_admin') AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.coach_id = auth.uid()::text)
  );

-- ─── exercises ───────────────────────────────────────────────
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises: all authenticated can read"
  ON exercises FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "exercises: super_admin manages"
  ON exercises FOR ALL
  USING (get_my_role() = 'super_admin');
