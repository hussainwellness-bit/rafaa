-- ══════════════════════════════════════════════════════════════════════
-- Migration 017 — Fix get_my_role() broken by STABLE keyword
-- STABLE caused PostgreSQL to cache the result at plan time when
-- auth.uid() is NULL, breaking every RLS policy that calls this function.
-- Revert to VOLATILE (default) which re-evaluates per row.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_my_role() RETURNS text
  LANGUAGE sql SECURITY DEFINER
  AS $$
    SELECT role FROM profiles
    WHERE id = auth.uid()::text
    LIMIT 1
  $$;
