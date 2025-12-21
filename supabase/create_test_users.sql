-- Run this in Supabase SQL Editor to create test users
-- This uses Supabase's auth.users table directly

-- Create test users (password is 'test1234' for all)
-- The password hash below is for 'test1234'

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  role,
  aud
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'admin@test.hexos',
    crypt('test1234', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"name": "Test Admin", "role": "admin"}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'dev@test.hexos',
    crypt('test1234', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"name": "Test Dev", "role": "dev"}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    'dfy@test.hexos',
    crypt('test1234', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"name": "Test DFY", "role": "dfy"}'::jsonb,
    'authenticated',
    'authenticated'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    'client@test.hexos',
    crypt('test1234', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"name": "Test Client", "role": "client"}'::jsonb,
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- The profile trigger should auto-create profiles
-- If not, manually insert:
INSERT INTO public.profiles (id, email, name, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@test.hexos', 'Test Admin', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dev@test.hexos', 'Test Dev', 'dev'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dfy@test.hexos', 'Test DFY', 'dfy'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'client@test.hexos', 'Test Client', 'client')
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT * FROM profiles;
