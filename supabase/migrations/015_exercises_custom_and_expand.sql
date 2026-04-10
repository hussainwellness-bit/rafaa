-- ══════════════════════════════════════════════════════════════════════
-- Migration 015 — Custom exercise columns + expanded exercise library
-- Run in Supabase SQL Editor (idempotent — safe to re-run)
-- ══════════════════════════════════════════════════════════════════════

-- 1. Add custom exercise columns to exercises table
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS created_by      text,
  ADD COLUMN IF NOT EXISTS created_by_name text,
  ADD COLUMN IF NOT EXISTS is_custom       boolean DEFAULT false;

-- 2. RLS: allow coaches to insert custom exercises
DROP POLICY IF EXISTS "coach_insert_custom_exercise" ON exercises;
CREATE POLICY "coach_insert_custom_exercise" ON exercises
  FOR INSERT
  WITH CHECK (
    auth.uid()::text IN (SELECT id FROM profiles WHERE role IN ('coach','super_admin'))
    AND is_custom = true
  );

-- 3. RLS: all authenticated users can read exercises
DROP POLICY IF EXISTS "all_read_exercises" ON exercises;
CREATE POLICY "all_read_exercises" ON exercises
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Expanded exercise library
INSERT INTO exercises (name, muscle_groups, kind) VALUES
-- CHEST
('Machine Chest Fly',            ARRAY['Chest', 'Front Delt'],                       'Isolation'),
('Cable Chest Fly',              ARRAY['Chest', 'Front Delt'],                       'Isolation'),
('Low Cable Fly',                ARRAY['Chest', 'Front Delt'],                       'Isolation'),
('High Cable Fly',               ARRAY['Chest', 'Front Delt'],                       'Isolation'),
('Incline Cable Fly',            ARRAY['Chest', 'Front Delt'],                       'Isolation'),
('Decline Bench Press',          ARRAY['Chest', 'Triceps'],                          'Compound'),
('Incline Dumbbell Press',       ARRAY['Chest', 'Front Delt', 'Triceps'],            'Compound'),
('Decline Dumbbell Press',       ARRAY['Chest', 'Triceps'],                          'Compound'),
('Close Grip Bench Press',       ARRAY['Chest', 'Triceps'],                          'Compound'),
('Smith Machine Bench Press',    ARRAY['Chest', 'Front Delt', 'Triceps'],            'Compound'),
('Smith Machine Incline Press',  ARRAY['Chest', 'Front Delt', 'Triceps'],            'Compound'),
('Chest Dips',                   ARRAY['Chest', 'Triceps', 'Front Delt'],            'Compound'),
('Landmine Press',               ARRAY['Chest', 'Front Delt', 'Triceps'],            'Compound'),
('Svend Press',                  ARRAY['Chest'],                                     'Isolation'),
('Around The World',             ARRAY['Chest'],                                     'Isolation'),
-- BACK
('Chest Supported Row',          ARRAY['Back', 'Biceps', 'Rear Delt'],               'Compound'),
('Meadows Row',                  ARRAY['Back', 'Biceps'],                            'Compound'),
('Pendlay Row',                  ARRAY['Back', 'Biceps'],                            'Compound'),
('Machine Row',                  ARRAY['Back', 'Biceps'],                            'Compound'),
('Cable Row Wide Grip',          ARRAY['Back', 'Rear Delt'],                         'Compound'),
('Cable Row Narrow Grip',        ARRAY['Back', 'Biceps'],                            'Compound'),
('Single Arm Cable Row',         ARRAY['Back', 'Biceps'],                            'Compound'),
('Straight Arm Pulldown',        ARRAY['Back', 'Lats'],                              'Isolation'),
('Reverse Grip Pulldown',        ARRAY['Lats', 'Biceps'],                            'Compound'),
('Close Grip Pulldown',          ARRAY['Lats', 'Biceps'],                            'Compound'),
('Machine Pullover',             ARRAY['Lats', 'Chest'],                             'Isolation'),
('Cable Pullover',               ARRAY['Lats', 'Chest'],                             'Isolation'),
('Single Arm Pulldown',          ARRAY['Lats'],                                      'Isolation'),
('Rack Pull',                    ARRAY['Back', 'Glutes', 'Hamstrings'],              'Compound'),
('Romanian Deadlift',            ARRAY['Hamstrings', 'Glutes', 'Back'],              'Compound'),
('Stiff Leg Deadlift',           ARRAY['Hamstrings', 'Glutes', 'Back'],              'Compound'),
-- SHOULDERS
('Cable Lateral Raise',          ARRAY['Shoulders', 'Side Delt'],                    'Isolation'),
('Machine Lateral Raise',        ARRAY['Shoulders', 'Side Delt'],                    'Isolation'),
('Leaning Cable Lateral Raise',  ARRAY['Shoulders', 'Side Delt'],                    'Isolation'),
('Cable Front Raise',            ARRAY['Front Delt'],                                'Isolation'),
('Plate Front Raise',            ARRAY['Front Delt'],                                'Isolation'),
('Reverse Pec Deck',             ARRAY['Rear Delt', 'Upper Back'],                   'Isolation'),
('Cable Rear Delt Fly',          ARRAY['Rear Delt', 'Upper Back'],                   'Isolation'),
('Face Pull',                    ARRAY['Rear Delt', 'Rotator Cuff', 'Traps'],        'Isolation'),
('Machine Shoulder Press',       ARRAY['Shoulders', 'Triceps'],                      'Compound'),
('Smith Machine Shoulder Press', ARRAY['Shoulders', 'Triceps'],                      'Compound'),
('Arnold Press',                 ARRAY['Shoulders', 'Front Delt', 'Side Delt'],      'Compound'),
('Behind The Neck Press',        ARRAY['Shoulders', 'Triceps'],                      'Compound'),
('Upright Row',                  ARRAY['Traps', 'Side Delt'],                        'Compound'),
('Cable Upright Row',            ARRAY['Traps', 'Side Delt'],                        'Compound'),
-- BICEPS
('Cable Curl',                   ARRAY['Biceps'],                                    'Isolation'),
('Cable Hammer Curl',            ARRAY['Biceps', 'Brachialis'],                      'Isolation'),
('Incline Dumbbell Curl',        ARRAY['Biceps'],                                    'Isolation'),
('Concentration Curl',           ARRAY['Biceps'],                                    'Isolation'),
('Spider Curl',                  ARRAY['Biceps'],                                    'Isolation'),
('Machine Curl',                 ARRAY['Biceps'],                                    'Isolation'),
('Reverse Curl',                 ARRAY['Biceps', 'Brachialis', 'Forearms'],          'Isolation'),
('Cross Body Curl',              ARRAY['Biceps', 'Brachialis'],                      'Isolation'),
('Drag Curl',                    ARRAY['Biceps'],                                    'Isolation'),
('Bayesian Curl',                ARRAY['Biceps'],                                    'Isolation'),
-- TRICEPS
('Cable Overhead Tricep Extension', ARRAY['Triceps'],                                'Isolation'),
('Single Arm Cable Pushdown',    ARRAY['Triceps'],                                   'Isolation'),
('Cable Kickback',               ARRAY['Triceps'],                                   'Isolation'),
('Machine Tricep Extension',     ARRAY['Triceps'],                                   'Isolation'),
('Incline Tricep Extension',     ARRAY['Triceps'],                                   'Isolation'),
('Tate Press',                   ARRAY['Triceps'],                                   'Isolation'),
('JM Press',                     ARRAY['Triceps'],                                   'Compound'),
('Smith Machine Close Grip Press', ARRAY['Triceps', 'Chest'],                        'Compound'),
-- LEGS
('Bulgarian Split Squat',        ARRAY['Quads', 'Glutes', 'Hamstrings'],             'Compound'),
('Sissy Squat',                  ARRAY['Quads'],                                     'Isolation'),
('Machine Squat',                ARRAY['Quads', 'Glutes'],                           'Compound'),
('Smith Machine Squat',          ARRAY['Quads', 'Glutes'],                           'Compound'),
('Smith Machine Romanian Deadlift', ARRAY['Hamstrings', 'Glutes'],                   'Compound'),
('Cable Pull Through',           ARRAY['Glutes', 'Hamstrings'],                      'Compound'),
('Hip Thrust',                   ARRAY['Glutes'],                                    'Compound'),
('Smith Machine Hip Thrust',     ARRAY['Glutes'],                                    'Compound'),
('Cable Hip Thrust',             ARRAY['Glutes'],                                    'Isolation'),
('Glute Kickback Machine',       ARRAY['Glutes'],                                    'Isolation'),
('Cable Glute Kickback',         ARRAY['Glutes'],                                    'Isolation'),
('Abductor Machine',             ARRAY['Glutes', 'Hip Abductors'],                   'Isolation'),
('Adductor Machine',             ARRAY['Inner Thigh', 'Hip Adductors'],              'Isolation'),
('Single Leg Press',             ARRAY['Quads', 'Glutes'],                           'Compound'),
('Single Leg Curl',              ARRAY['Hamstrings'],                                'Isolation'),
('Nordic Hamstring Curl',        ARRAY['Hamstrings'],                                'Isolation'),
('Seated Calf Raise',            ARRAY['Calves', 'Soleus'],                          'Isolation'),
('Donkey Calf Raise',            ARRAY['Calves'],                                    'Isolation'),
('Single Leg Calf Raise',        ARRAY['Calves'],                                    'Isolation'),
-- CORE
('Cable Crunch',                 ARRAY['Abs', 'Core'],                               'Isolation'),
('Hanging Leg Raise',            ARRAY['Abs', 'Core', 'Hip Flexors'],                'Isolation'),
('Ab Wheel Rollout',             ARRAY['Abs', 'Core'],                               'Isolation'),
('Dragon Flag',                  ARRAY['Abs', 'Core'],                               'Isolation'),
('Pallof Press',                 ARRAY['Core', 'Obliques'],                          'Isolation'),
('Dead Bug',                     ARRAY['Core', 'Abs'],                               'Isolation'),
('Landmine Twist',               ARRAY['Obliques', 'Core'],                          'Isolation'),
('Decline Crunch',               ARRAY['Abs'],                                       'Isolation'),
('Reverse Crunch',               ARRAY['Abs', 'Core'],                               'Isolation'),
('Toe Touch',                    ARRAY['Abs'],                                       'Isolation'),
('Bicycle Crunch',               ARRAY['Abs', 'Obliques'],                           'Isolation'),
('Side Plank',                   ARRAY['Obliques', 'Core'],                          'Isolation'),
-- FOREARMS & GRIP
('Wrist Roller',                 ARRAY['Forearms'],                                  'Isolation'),
('Plate Pinch',                  ARRAY['Forearms', 'Grip'],                          'Isolation'),
('Dead Hang',                    ARRAY['Forearms', 'Grip', 'Lats'],                  'Isolation'),
('Farmer Walk',                  ARRAY['Forearms', 'Grip', 'Traps'],                 'Compound'),
-- TRAPS
('Dumbbell Shrug',               ARRAY['Traps'],                                     'Isolation'),
('Cable Shrug',                  ARRAY['Traps'],                                     'Isolation'),
('Smith Machine Shrug',          ARRAY['Traps'],                                     'Isolation'),
('Behind Back Shrug',            ARRAY['Traps'],                                     'Isolation')
ON CONFLICT (name) DO NOTHING;
