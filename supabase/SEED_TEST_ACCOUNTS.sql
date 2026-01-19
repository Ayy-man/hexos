-- ============================================================================
-- hexOS Test Account Seeding
-- Run AFTER running the combined migration
--
-- Creates test users in auth.users (which triggers profile creation)
-- ============================================================================

-- NOTE: For Supabase, you should create users via:
-- 1. Supabase Dashboard > Authentication > Users > Add user
-- 2. Or via the Supabase Auth API
--
-- The profile will be auto-created by the handle_new_user() trigger.
-- After creating users, update their roles here:

-- ============================================================================
-- AFTER creating users via Dashboard, run this to set their roles:
-- ============================================================================

-- Replace these UUIDs with the actual user IDs from auth.users after creation

-- Example (uncomment and modify after creating users):
/*
UPDATE profiles SET role = 'admin' WHERE email = 'admin@hexos.test';
UPDATE profiles SET role = 'internal' WHERE email = 'internal@hexos.test';
UPDATE profiles SET role = 'dev' WHERE email = 'dev@hexos.test';
UPDATE profiles SET role = 'dfy' WHERE email = 'dfy@hexos.test';
UPDATE profiles SET role = 'client' WHERE email = 'client@hexos.test';
*/

-- ============================================================================
-- ALTERNATIVE: Direct profile insert (if users already exist in auth.users)
-- ============================================================================

-- This only works if you have the UUID of users already in auth.users
-- The handle_new_user trigger should have already created profiles

-- To verify profiles exist:
-- SELECT id, email, role FROM profiles;

-- ============================================================================
-- QUICK ROLE UPDATE (run after creating users via Dashboard)
-- ============================================================================

-- Set the first created user as admin (usually your own account)
-- UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL_HERE';
