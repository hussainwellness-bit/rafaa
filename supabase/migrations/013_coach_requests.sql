-- ══════════════════════════════════════════════════════════════════════
-- Migration 013 — Coach requests + subscription fields
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- 1. Coach registration requests table
CREATE TABLE IF NOT EXISTS coach_requests (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name          text NOT NULL,
  email              text NOT NULL,
  phone              text,
  specialty          text,
  years_experience   integer,
  bio                text,
  subscription_plan  text CHECK (subscription_plan IN ('3_months','6_months','1_year')),
  subscription_price numeric,
  status             text DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  rejection_reason   text,
  terms_accepted     boolean DEFAULT false,
  consent_timestamp  timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- 2. Add subscription fields to profiles (coaches)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_plan   text,
  ADD COLUMN IF NOT EXISTS subscription_start  date,
  ADD COLUMN IF NOT EXISTS subscription_end    date,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'pending'
    CHECK (subscription_status IN ('pending','active','expired'));

-- 3. RLS for coach_requests
ALTER TABLE coach_requests ENABLE ROW LEVEL SECURITY;

-- Super admin can read/update/delete all requests
DROP POLICY IF EXISTS "super_admin_manages_coach_requests" ON coach_requests;
CREATE POLICY "super_admin_manages_coach_requests"
  ON coach_requests FOR ALL
  USING (
    auth.uid()::text IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
  );

-- Anyone (unauthenticated included) can insert a request
DROP POLICY IF EXISTS "coach_request_insert" ON coach_requests;
CREATE POLICY "coach_request_insert"
  ON coach_requests FOR INSERT
  WITH CHECK (true);

-- 4. Clean up existing test data (keep super admin + exercises)
DELETE FROM session_sets;
DELETE FROM sessions_v2;
DELETE FROM journal_logs;
DELETE FROM nutrition_logs;
DELETE FROM bundle_exercises;
DELETE FROM bundles;
DELETE FROM plan_schedule;
DELETE FROM hero_requests;
DELETE FROM notifications;
DELETE FROM profiles WHERE role IN ('coach', 'hero', 'client');
DELETE FROM auth.users WHERE email NOT IN ('hussainmoh.wellness@gmail.com');
