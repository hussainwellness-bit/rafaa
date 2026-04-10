-- ══════════════════════════════════════════════════════════════════════
-- Migration 012 — Fix handle_new_user trigger
--
-- When a hero registers with the same email their coach used to create
-- their profile, this trigger links their new auth account to the
-- existing profile row (rather than creating a duplicate).
--
-- Run this in Supabase SQL Editor (safe to re-run — CREATE OR REPLACE)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE email = NEW.email) THEN
    -- Profile pre-exists (hero approved by coach) — link auth account to it
    UPDATE profiles
    SET id     = NEW.id,
        auth_id = NEW.id
    WHERE email = NEW.email;
  ELSE
    -- Brand new user — create a profile
    INSERT INTO profiles (id, email, role, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      CASE WHEN NEW.email = 'hussainmoh.wellness@gmail.com'
           THEN 'super_admin' ELSE 'hero' END,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth — log and continue
  RAISE WARNING '[handle_new_user] error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is attached (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
