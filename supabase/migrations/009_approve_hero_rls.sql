-- ══════════════════════════════════════════════════════════════════════
-- Migration 009 — Fix role constraint + hero approval RLS policies
-- Run this in Supabase SQL Editor (idempotent — safe to re-run)
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Ensure 'hero' is an allowed role ───────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'coach', 'hero', 'client'));

-- ── 2. Coach can INSERT a hero profile they own ───────────────────────
DROP POLICY IF EXISTS "profiles: coach insert hero" ON profiles;
DROP POLICY IF EXISTS "coach can insert heroes" ON profiles;

CREATE POLICY "coach can insert heroes" ON profiles
  FOR INSERT
  WITH CHECK (
    role = 'hero' AND
    coach_id = auth.uid()::text
  );

-- ── 3. Coach can DELETE their own heroes ──────────────────────────────
--    (Replaces the subquery version from migration 007)
DROP POLICY IF EXISTS "profiles: coach delete own heroes" ON profiles;
DROP POLICY IF EXISTS "coach can delete own heroes" ON profiles;

CREATE POLICY "coach can delete own heroes" ON profiles
  FOR DELETE
  USING (
    coach_id = auth.uid()::text AND role = 'hero'
  );
