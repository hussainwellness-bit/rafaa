-- Run AFTER creating the auth user for hussainmoh.wellness@gmail.com
-- Replace <AUTH_USER_ID> with the UUID from Supabase Auth > Users

INSERT INTO profiles (id, email, full_name, role, is_active, created_at)
VALUES (
  '<AUTH_USER_ID>',
  'hussainmoh.wellness@gmail.com',
  'Hussain',
  'super_admin',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
