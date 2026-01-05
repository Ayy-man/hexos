# hexOS Fresh Supabase Setup Guide

**Last Updated:** 2026-01-05
**Tested With:** Supabase project `aqlcflpukoqbdekgvzoj`

---

## Prerequisites

- Supabase account with a new project
- Vercel account with hexOS deployed
- Access to Supabase SQL Editor

---

## Step 1: Run Migrations

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/COMBINED_SAFE_MIGRATION_v3.sql`
3. Paste and run

**Note:** This script:
- Creates all tables, enums, functions, triggers
- Excludes the dangerous recursive RLS function
- Adds `DROP POLICY IF EXISTS` before each policy to handle re-runs

---

## Step 2: Fix Profiles RLS & Permissions

The profiles table has a chicken-and-egg problem with RLS (policies that check roles need to query profiles, causing recursion).

Run this after migrations:

```sql
-- Disable RLS on profiles (handle access in app layer)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

---

## Step 3: Create Admin Account

1. Supabase Dashboard → Authentication → Users → Add User
2. Enter your email and password
3. Check **"Auto Confirm User"**
4. Click Create

Then set your role:

```sql
-- Insert profile if trigger failed
INSERT INTO profiles (id, email, name, role)
SELECT id, email, split_part(email, '@', 1), 'admin'::user_role
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

---

## Step 4: Create Test Accounts (Optional)

For quick login buttons to work, create these users in Authentication → Add User:

| Email | Password |
|-------|----------|
| `admin@test.hexos` | `test1234` |
| `dev@test.hexos` | `test1234` |
| `dfy@test.hexos` | `test1234` |
| `client@test.hexos` | `test1234` |

Then set their roles:

```sql
INSERT INTO profiles (id, email, name, role)
SELECT id, email, split_part(email, '@', 1),
  CASE
    WHEN email = 'admin@test.hexos' THEN 'admin'::user_role
    WHEN email = 'dev@test.hexos' THEN 'dev'::user_role
    WHEN email = 'dfy@test.hexos' THEN 'dfy'::user_role
    WHEN email = 'client@test.hexos' THEN 'client'::user_role
  END
FROM auth.users
WHERE email IN ('admin@test.hexos', 'dev@test.hexos', 'dfy@test.hexos', 'client@test.hexos');
```

---

## Step 5: Update Environment Variables

### Local (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Vercel

1. Go to Vercel Dashboard → hexos → Settings → Environment Variables
2. Update/add for **Production** (and Preview if needed):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy

---

## Step 6: Verify

1. Go to your Vercel URL
2. Login with your admin account (or use Quick Login buttons)
3. Test navigation: Dashboard, Projects, Inquiries, Blueprints
4. Check all 4 roles work if test accounts were created

---

## Troubleshooting

### "permission denied for table profiles"
```sql
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
```

### "infinite recursion detected in policy"
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### "Auth check: fetch failed"
- Verify Supabase project URL is correct
- Check project isn't paused in Supabase dashboard

### "Invalid login credentials"
- User exists in auth.users but not profiles
- Run the profile insert SQL from Step 3

### Quick login buttons don't work
- Test accounts don't exist - follow Step 4

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/COMBINED_SAFE_MIGRATION_v3.sql` | All migrations combined (safe) |
| `supabase/FIX_PROFILES_RLS.sql` | Profiles RLS fix script |
| `supabase/SEED_TEST_ACCOUNTS.sql` | Test account setup instructions |
| `docs/INCIDENT_2026-01-03_RLS_CRASH.md` | RLS crisis incident report |
| `docs/DATABASE_RECOVERY_2026-01-05.md` | Recovery documentation |

---

## Current Supabase Project

**Project Ref:** `aqlcflpukoqbdekgvzoj`
**URL:** `https://aqlcflpukoqbdekgvzoj.supabase.co`
**Status:** Active ✓

---

*Document created: 2026-01-05*
