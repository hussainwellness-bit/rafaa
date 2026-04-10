-- ══════════════════════════════════════════════════════════════════════
-- Migration 005 — Coach Plan Settings, Profile Completion, Anon Policies
-- ══════════════════════════════════════════════════════════════════════

-- Coach plan configuration (JSON per plan A/B/C)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plans_config jsonb,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS hero_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_profile_complete boolean DEFAULT false;

-- Index for fast coach discovery queries
CREATE INDEX IF NOT EXISTS idx_profiles_coach_discovery
  ON profiles(role, is_active, accepting_heroes)
  WHERE role = 'coach';

-- ── Anonymous insert policies (for public onboarding form) ─────────────

-- Allow anon users to insert notifications (e.g. notify coach when hero submits)
-- Notifications are SELECT-protected by user_id so this is safe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'anon_insert_notification'
  ) THEN
    EXECUTE 'CREATE POLICY "anon_insert_notification" ON notifications FOR INSERT WITH CHECK (true)';
  END IF;
END$$;

-- ── Function to auto-update hero_count on request approval ─────────────
CREATE OR REPLACE FUNCTION update_coach_hero_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate hero count for the coach
  UPDATE profiles
  SET hero_count = (
    SELECT COUNT(*) FROM profiles
    WHERE coach_id = NEW.id AND role = 'hero' AND is_active = true
  )
  WHERE id = NEW.id AND role = 'coach';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Function to check profile completeness ─────────────────────────────
CREATE OR REPLACE FUNCTION check_coach_profile_complete()
RETURNS TRIGGER AS $$
DECLARE
  has_plan boolean := false;
  plan_config jsonb;
BEGIN
  IF NEW.role = 'coach' THEN
    -- Check if at least one plan is enabled with a price
    IF NEW.plans_config IS NOT NULL THEN
      FOR plan_config IN SELECT jsonb_array_elements(
        jsonb_build_array(NEW.plans_config->'A', NEW.plans_config->'B', NEW.plans_config->'C')
      )
      LOOP
        IF (plan_config->>'enabled')::boolean = true
           AND (plan_config->>'monthly')::numeric > 0 THEN
          has_plan := true;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    NEW.is_profile_complete := (
      NEW.coach_bio IS NOT NULL AND NEW.coach_bio != '' AND
      NEW.coach_specialty IS NOT NULL AND NEW.coach_specialty != '' AND
      NEW.years_experience IS NOT NULL AND NEW.years_experience > 0 AND
      has_plan
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER coach_profile_complete_check
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_coach_profile_complete();
