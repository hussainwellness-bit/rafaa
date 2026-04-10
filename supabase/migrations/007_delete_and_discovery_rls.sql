-- ══════════════════════════════════════════════════════════════════════
-- Migration 007 — Fix coach discovery (anon read) + hero deletion (DELETE policy)
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Coach discovery: allow anyone (including anon) to read coach profiles ──
DROP POLICY IF EXISTS "coaches_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles: anon can read coach profiles" ON profiles;

CREATE POLICY "coaches_public_read" ON profiles
  FOR SELECT
  USING (role = 'coach' OR role = 'super_admin');

-- ── 2. Allow users to read their own profile (heroes/coaches reading themselves) ──
DROP POLICY IF EXISTS "users_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles: hero sees own" ON profiles;

CREATE POLICY "users_read_own" ON profiles
  FOR SELECT
  USING (auth.uid()::text = id);

-- ── 3. Allow coaches to DELETE their own heroes' profiles ─────────────────────
--    Simple policy: hero must have coach_id = authenticated user, and role = 'hero'
DROP POLICY IF EXISTS "profiles: coach delete own heroes" ON profiles;
DROP POLICY IF EXISTS "coach can delete own heroes" ON profiles;

CREATE POLICY "coach can delete own heroes" ON profiles
  FOR DELETE
  USING (
    coach_id = auth.uid()::text AND role = 'hero'
  );

-- ── 4. Allow super_admin to DELETE any profile ────────────────────────────────
DROP POLICY IF EXISTS "profiles: super_admin delete" ON profiles;

CREATE POLICY "profiles: super_admin delete" ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid()::text AND me.role = 'super_admin'
    )
  );
