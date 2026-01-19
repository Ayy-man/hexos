-- Remove Time Tracking System
-- This migration removes all time tracking tables
-- Time tracking was primarily used with Pulse and is being retired

-- 1. Drop triggers first (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
    DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_timers') THEN
    DROP TRIGGER IF EXISTS update_active_timers_updated_at ON active_timers;
  END IF;
END $$;

-- 2. Drop tables (order matters for foreign key constraints)
DROP TABLE IF EXISTS active_timers CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
