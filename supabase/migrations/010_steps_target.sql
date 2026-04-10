-- ══════════════════════════════════════════════════════════════════════
-- Migration 010 — Add steps_target to hero_requests
-- Run this in Supabase SQL Editor (idempotent — safe to re-run)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE hero_requests
  ADD COLUMN IF NOT EXISTS steps_target integer DEFAULT 10000;
