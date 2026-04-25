-- ══════════════════════════════════════════════════════════════════════
-- Migration 016 — Sync hero profiles.id to auth UUID + fix RLS fallback
-- Problem: hero profiles are created with crypto.randomUUID() on approval,
--          but Supabase RLS uses auth.uid() which differs → heroes can't
--          read their own profile or insert sessions/journals.
-- Fix:
--   1. Re-add FK constraints with ON UPDATE CASCADE so profiles.id can be
--      changed without violating referential integrity
--   2. One-time sync: update profiles.id to match auth.users.id for heroes
--      where the email matches but the UUID differs
--   3. Update get_my_role() and RLS policies to also accept email fallback
--      as a safety net for any edge cases
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Recreate FK constraints with ON UPDATE CASCADE ──────────────────

-- hero_requests.coach_id
ALTER TABLE hero_requests
  DROP CONSTRAINT IF EXISTS hero_requests_coach_id_fkey;
ALTER TABLE hero_requests
  ADD CONSTRAINT hero_requests_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- hero_requests.linked_hero_id
ALTER TABLE hero_requests
  DROP CONSTRAINT IF EXISTS hero_requests_linked_hero_id_fkey;
ALTER TABLE hero_requests
  ADD CONSTRAINT hero_requests_linked_hero_id_fkey
  FOREIGN KEY (linked_hero_id) REFERENCES profiles(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- notifications.user_id
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

--── 2. One-time sync: profiles.id → auth.users.id ─────────────────────
-- For every hero profile whose email matches an auth user but the UUID
-- differs, update profiles.id to the auth UUID.
-- ON UPDATE CASCADE handles all referencing tables automatically.
UPDATE profiles
SET id = au.id::text
FROM auth.users au
WHERE profiles.email = au.email
  AND profiles.id    != au.id::text
  AND profiles.role  = 'hero';

-- ── 3. Fix get_my_role() helper — email fallback ───────────────────────
CREATE OR REPLACE FUNCTION get_my_role() RETURNS text
  LANGUAGE sql SECURITY DEFINER STABLE
  AS $$
    SELECT role FROM profiles
    WHERE id = auth.uid()::text
       OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    LIMIT 1
  $$;

-- ── 4. Fix profiles: hero sees own — email fallback ────────────────────
DROP POLICY IF EXISTS "profiles: hero sees own" ON profiles;
CREATE POLICY "profiles: hero sees own"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()::text
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ── 5. Fix profiles: own update — email fallback ──────────────────────
DROP POLICY IF EXISTS "profiles: own update" ON profiles;
CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (
    id = auth.uid()::text
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
