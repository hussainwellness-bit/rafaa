-- ══════════════════════════════════════════════════════════════════════
-- Migration 008 — Ensure hero_requests table exists + fix anon notification
-- Run this in Supabase SQL Editor (idempotent — safe to re-run)
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. hero_requests table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hero_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id text REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type text,
  plan_billing text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','approved','declined','payment_pending','active')),
  full_name text,
  email text,
  phone text,
  age integer,
  gender text CHECK (gender IN ('male','female')),
  weight numeric,
  height numeric,
  goal text,
  experience_level text,
  training_days_per_week integer,
  injuries text,
  allergies text,
  medications text,
  sleep_average numeric,
  notes text,
  terms_accepted boolean DEFAULT false,
  privacy_accepted boolean DEFAULT false,
  health_consent boolean DEFAULT false,
  consent_timestamp timestamptz,
  decline_reason text,
  linked_hero_id text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hero_requests ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (idempotent)
DROP POLICY IF EXISTS "anyone_can_submit_request" ON hero_requests;
DROP POLICY IF EXISTS "anyone can insert hero_requests" ON hero_requests;
DROP POLICY IF EXISTS "coach_manages_own_requests" ON hero_requests;
DROP POLICY IF EXISTS "coach sees own requests" ON hero_requests;
DROP POLICY IF EXISTS "hero_views_own_request" ON hero_requests;
DROP POLICY IF EXISTS "super_admin sees all requests" ON hero_requests;

-- Anyone (including anon) can submit a request
CREATE POLICY "anyone_can_submit_request" ON hero_requests
  FOR INSERT WITH CHECK (true);

-- Coach sees and manages their own requests
CREATE POLICY "coach_manages_own_requests" ON hero_requests
  FOR ALL USING (coach_id = auth.uid()::text);

-- Hero can check status after account creation
CREATE POLICY "hero_views_own_request" ON hero_requests
  FOR SELECT USING (linked_hero_id = auth.uid()::text);

-- Super admin sees all
CREATE POLICY "super_admin_all_requests" ON hero_requests
  FOR ALL USING (
    auth.uid()::text IN (SELECT id FROM profiles WHERE role = 'super_admin')
  );

-- ── 2. notifications table (create if missing) ────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text CHECK (type IN (
    'hero_request_received',
    'request_approved',
    'request_declined',
    'payment_pending',
    'plan_activated',
    'system'
  )),
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "user_sees_own_notifications" ON notifications;
DROP POLICY IF EXISTS "user_marks_own_read" ON notifications;
DROP POLICY IF EXISTS "coach_notifies_heroes" ON notifications;
DROP POLICY IF EXISTS "super_admin_all_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_can_notify_coach" ON notifications;

-- Recreate all notification policies
CREATE POLICY "user_sees_own_notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "user_marks_own_read" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Allow coaches to send notifications to their heroes
CREATE POLICY "coach_notifies_heroes" ON notifications
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE coach_id = auth.uid()::text)
    OR user_id = auth.uid()::text
  );

-- FIX: Allow anon users to insert notifications targeting a coach profile.
-- This is needed because onboarding submitters are unauthenticated.
-- Only allows inserting for users who have role = 'coach' or 'super_admin'.
CREATE POLICY "anon_can_notify_coach" ON notifications
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE role IN ('coach', 'super_admin'))
  );

CREATE POLICY "super_admin_all_notifications" ON notifications
  FOR ALL USING (
    auth.uid()::text IN (SELECT id FROM profiles WHERE role = 'super_admin')
  );

-- ── 3. Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hero_requests_coach_id ON hero_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_hero_requests_status ON hero_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
