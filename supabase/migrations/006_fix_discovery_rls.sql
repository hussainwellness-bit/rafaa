-- ══════════════════════════════════════════════════════════════════════
-- Migration 006 — Allow anonymous users to read coach profiles for discovery
-- ══════════════════════════════════════════════════════════════════════
--
-- The public onboarding page (/join) uses the anon Supabase key.
-- Without this policy, RLS blocks all reads on `profiles` for unauthenticated
-- users, so the coach discovery step returns 0 coaches.
-- This policy is intentionally scoped to role IN ('coach','super_admin') only.
-- ──────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'profiles: anon can read coach profiles'
  ) THEN
    EXECUTE '
      CREATE POLICY "profiles: anon can read coach profiles"
        ON profiles FOR SELECT
        USING (role IN (''coach'', ''super_admin''))
    ';
  END IF;
END$$;

-- Also allow anon to INSERT hero_requests (needed for onboarding form submit)
-- This may already exist from migration 004, the DO block guards against duplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hero_requests'
    AND policyname = 'anon_insert_hero_request'
  ) THEN
    EXECUTE 'CREATE POLICY "anon_insert_hero_request" ON hero_requests FOR INSERT WITH CHECK (true)';
  END IF;
END$$;
