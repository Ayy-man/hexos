-- Fix missing table grants for activity_logs
-- The original migration created the table but didn't grant access

-- Grant table permissions
GRANT ALL ON activity_logs TO authenticated;
GRANT ALL ON activity_logs TO service_role;
GRANT SELECT, INSERT ON activity_logs TO anon;
