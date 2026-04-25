-- ══════════════════════════════════════════════════════════════════════
-- Migration 019 — Restore get_my_role() and get_my_coach_id() to original
-- Migration 017 removed STABLE which broke the coach RLS policy:
--   "profiles: coach sees own heroes" uses get_my_role() = 'coach'
-- Without STABLE, this policy misbehaves, blocking coach logins.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()::text
$$;

CREATE OR REPLACE FUNCTION get_my_coach_id()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT coach_id FROM profiles WHERE id = auth.uid()::text
$$;
