-- ══════════════════════════════════════════════════════════════════════
-- Migration 014 — Fix hero_requests RLS policies
-- Run in Supabase SQL Editor (idempotent — safe to re-run)
-- ══════════════════════════════════════════════════════════════════════

-- Drop all existing policies on hero_requests and recreate cleanly
DROP POLICY IF EXISTS "anyone_can_submit_request"    ON hero_requests;
DROP POLICY IF EXISTS "anyone can insert hero_requests" ON hero_requests;
DROP POLICY IF EXISTS "anon_insert_hero_request"     ON hero_requests;
DROP POLICY IF EXISTS "coach_manages_own_requests"   ON hero_requests;
DROP POLICY IF EXISTS "coach sees own requests"      ON hero_requests;
DROP POLICY IF EXISTS "coach reads own requests"     ON hero_requests;
DROP POLICY IF EXISTS "coach updates own requests"   ON hero_requests;
DROP POLICY IF EXISTS "hero_views_own_request"       ON hero_requests;
DROP POLICY IF EXISTS "super_admin sees all requests" ON hero_requests;
DROP POLICY IF EXISTS "super_admin_all_requests"     ON hero_requests;
DROP POLICY IF EXISTS "hero_request_insert"          ON hero_requests;

-- 1. Anyone (including anon) can submit a request
CREATE POLICY "hero_request_insert" ON hero_requests
  FOR INSERT WITH CHECK (true);

-- 2. Coach reads their own requests (coach_id stored as text = auth.uid()::text)
CREATE POLICY "coach reads own requests" ON hero_requests
  FOR SELECT
  USING (coach_id = auth.uid()::text);

-- 3. Coach updates their own requests (approve/decline)
CREATE POLICY "coach updates own requests" ON hero_requests
  FOR UPDATE
  USING (coach_id = auth.uid()::text);

-- 4. Hero can check their own request status after account creation
CREATE POLICY "hero_views_own_request" ON hero_requests
  FOR SELECT
  USING (linked_hero_id = auth.uid()::text);

-- 5. Super admin sees and manages all
CREATE POLICY "super_admin_all_requests" ON hero_requests
  FOR ALL
  USING (
    auth.uid()::text IN (SELECT id FROM profiles WHERE role = 'super_admin')
  );
