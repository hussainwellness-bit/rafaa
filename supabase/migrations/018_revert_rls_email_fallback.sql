-- ══════════════════════════════════════════════════════════════════════
-- Migration 018 — Revert auth.users subquery from RLS policies
-- The email = (SELECT email FROM auth.users WHERE id = auth.uid()) subquery
-- in profiles: hero sees own was evaluated for every row on every SELECT,
-- causing all profile reads to fail for all users.
-- ══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles: hero sees own" ON profiles;
CREATE POLICY "profiles: hero sees own"
  ON profiles FOR SELECT
  USING (id = auth.uid()::text);

DROP POLICY IF EXISTS "profiles: own update" ON profiles;
CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (id = auth.uid()::text);
