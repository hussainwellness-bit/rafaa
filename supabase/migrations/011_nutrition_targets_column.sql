-- ══════════════════════════════════════════════════════════════════════
-- Migration 011 — Ensure nutrition_targets + ghost_preference exist on profiles
-- Run this in Supabase SQL Editor (idempotent — safe to re-run)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nutrition_targets  jsonb,
  ADD COLUMN IF NOT EXISTS journal_config     jsonb,
  ADD COLUMN IF NOT EXISTS ghost_preference   text DEFAULT 'last'
    CHECK (ghost_preference IN ('last', 'best')),
  ADD COLUMN IF NOT EXISTS steps_target       integer DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS goal               text,
  ADD COLUMN IF NOT EXISTS start_weight       numeric,
  ADD COLUMN IF NOT EXISTS target_weight      numeric,
  ADD COLUMN IF NOT EXISTS height             numeric,
  ADD COLUMN IF NOT EXISTS plan_type          text,
  ADD COLUMN IF NOT EXISTS plan_billing       text,
  ADD COLUMN IF NOT EXISTS plan_start         date,
  ADD COLUMN IF NOT EXISTS plan_end           date,
  ADD COLUMN IF NOT EXISTS is_active          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone              text,
  ADD COLUMN IF NOT EXISTS gender             text,
  ADD COLUMN IF NOT EXISTS date_of_birth      date,
  ADD COLUMN IF NOT EXISTS notes              text,
  ADD COLUMN IF NOT EXISTS coach_id           text REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auth_id            uuid;
