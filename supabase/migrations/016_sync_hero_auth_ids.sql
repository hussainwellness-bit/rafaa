-- ══════════════════════════════════════════════════════════════════════
-- Migration 016 — Sync hero profiles.id to auth UUID + fix RLS fallback
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Dynamically recreate ALL FK constraints on profiles(id) with ON UPDATE CASCADE
-- This finds every table that references profiles.id and adds CASCADE so the
-- one-time UPDATE below can propagate without FK violations.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.key_column_usage kcu2
      ON rc.unique_constraint_name = kcu2.constraint_name
      AND rc.unique_constraint_schema = kcu2.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu2.table_name  = 'profiles'
      AND kcu2.column_name = 'id'
      AND rc.update_rule  != 'CASCADE'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      r.table_name, r.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES profiles(id) ON DELETE %s ON UPDATE CASCADE',
      r.table_name,
      r.constraint_name,
      r.column_name,
      CASE r.delete_rule WHEN 'SET NULL' THEN 'SET NULL' ELSE 'CASCADE' END
    );
    RAISE NOTICE 'Updated constraint % on %.%', r.constraint_name, r.table_name, r.column_name;
  END LOOP;
END;
$$;

-- ── 2. One-time sync: profiles.id → auth.users.id ─────────────────────
-- For every hero profile whose email matches an auth user but UUID differs,
-- update profiles.id. ON UPDATE CASCADE propagates to all referencing tables.
UPDATE profiles
SET id = au.id::text
FROM auth.users au
WHERE profiles.email = au.email
  AND profiles.id   != au.id::text
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
