-- ══════════════════════════════════════════════════════════════════════
-- Migration 004 — Onboarding Flow, Notifications, Security, Availability
-- ══════════════════════════════════════════════════════════════════════

-- ── Coach availability & public profile fields ────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accepting_heroes boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_heroes integer,
  ADD COLUMN IF NOT EXISTS coach_bio text,
  ADD COLUMN IF NOT EXISTS coach_specialty text;

-- ── Hero Requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hero_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id text REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type text,
  plan_billing text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','approved','declined','payment_pending','active')),
  -- Identity
  full_name text,
  email text,
  phone text,
  age integer,
  gender text CHECK (gender IN ('male','female')),
  -- Health (pseudonymized — no name/email here)
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
  -- Consent (PDPL compliance)
  terms_accepted boolean DEFAULT false,
  privacy_accepted boolean DEFAULT false,
  health_consent boolean DEFAULT false,
  consent_timestamp timestamptz,
  -- Meta
  decline_reason text,
  linked_hero_id text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Notifications ─────────────────────────────────────────────────────
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

-- ── Hero Identity (PII, pseudonymized) ───────────────────────────────
CREATE TABLE IF NOT EXISTS hero_identity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hero_id text REFERENCES profiles(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- ── Hero Health (pseudonymized, no PII) ──────────────────────────────
CREATE TABLE IF NOT EXISTS hero_health (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hero_id text REFERENCES profiles(id) ON DELETE CASCADE,
  weight numeric,
  height numeric,
  injuries text,
  allergies text,
  medications text,
  goal text,
  experience_level text,
  training_days_per_week integer,
  sleep_average numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Audit Log (append-only) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,
  action text NOT NULL,
  table_name text,
  record_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE hero_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_identity  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_health    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;

-- Hero Requests --------------------------------------------------------

-- Anyone (including anon) can submit a request
CREATE POLICY "anyone_can_submit_request" ON hero_requests
  FOR INSERT WITH CHECK (true);

-- Coach sees and manages their own requests
CREATE POLICY "coach_manages_own_requests" ON hero_requests
  FOR ALL USING (coach_id = auth.uid()::text);

-- Hero can check status of their own request by email after account creation
CREATE POLICY "hero_views_own_request" ON hero_requests
  FOR SELECT USING (
    linked_hero_id = auth.uid()::text
  );

-- Notifications --------------------------------------------------------

CREATE POLICY "user_sees_own_notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "user_marks_own_read" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Coaches can insert notifications for their heroes
CREATE POLICY "coach_notifies_heroes" ON notifications
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE coach_id = auth.uid()::text
    )
    OR user_id = auth.uid()::text
  );

-- Super admins have full notification access
CREATE POLICY "super_admin_all_notifications" ON notifications
  FOR ALL USING (
    auth.uid()::text IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
  );

-- Hero Identity --------------------------------------------------------

CREATE POLICY "hero_own_identity" ON hero_identity
  FOR ALL USING (hero_id = auth.uid()::text);

CREATE POLICY "coach_reads_hero_identity" ON hero_identity
  FOR SELECT USING (
    hero_id IN (
      SELECT id FROM profiles WHERE coach_id = auth.uid()::text
    )
  );

CREATE POLICY "coach_writes_hero_identity" ON hero_identity
  FOR INSERT WITH CHECK (
    hero_id IN (
      SELECT id FROM profiles WHERE coach_id = auth.uid()::text
    )
  );

-- Hero Health ----------------------------------------------------------

CREATE POLICY "hero_own_health" ON hero_health
  FOR ALL USING (hero_id = auth.uid()::text);

CREATE POLICY "coach_reads_hero_health" ON hero_health
  FOR SELECT USING (
    hero_id IN (
      SELECT id FROM profiles WHERE coach_id = auth.uid()::text
    )
  );

CREATE POLICY "coach_writes_hero_health" ON hero_health
  FOR INSERT WITH CHECK (
    hero_id IN (
      SELECT id FROM profiles WHERE coach_id = auth.uid()::text
    )
  );

-- Audit Log ------------------------------------------------------------

-- Anyone can insert (triggers and application code write here)
CREATE POLICY "audit_log_insert_only" ON audit_log
  FOR INSERT WITH CHECK (true);

-- Only super admins can read audit logs
CREATE POLICY "super_admin_reads_audit" ON audit_log
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
  );

-- Explicitly deny all updates and deletes on audit_log
CREATE POLICY "audit_log_no_update" ON audit_log
  FOR UPDATE USING (false);

CREATE POLICY "audit_log_no_delete" ON audit_log
  FOR DELETE USING (false);

-- ══════════════════════════════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_hero_requests_coach_id ON hero_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_hero_requests_status ON hero_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_hero_identity_hero_id ON hero_identity(hero_id);
CREATE INDEX IF NOT EXISTS idx_hero_health_hero_id ON hero_health(hero_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ══════════════════════════════════════════════════════════════════════
-- SECURITY NOTE: Field-level encryption
-- ══════════════════════════════════════════════════════════════════════
-- Enable pgcrypto for field encryption when Supabase Vault is configured:
--   CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Then wrap sensitive fields in:
--   pgp_sym_encrypt(value::text, current_setting('app.encryption_key'))
-- And decrypt with:
--   pgp_sym_decrypt(column::bytea, current_setting('app.encryption_key'))
-- Configure the key via Supabase Vault (not in application code).
-- Fields to encrypt: phone, date_of_birth, weight, height, start_weight,
--   target_weight, injuries, allergies, medications, notes (health fields).
-- ══════════════════════════════════════════════════════════════════════
