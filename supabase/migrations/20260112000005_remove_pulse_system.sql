-- Remove Pulse System
-- This migration removes all pulse-related tables and columns
-- The Pulse feature is being retired and will return later with a new design

-- 1. Remove pulse_task_id from time_entries and active_timers (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
    ALTER TABLE time_entries DROP COLUMN IF EXISTS pulse_task_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_timers') THEN
    ALTER TABLE active_timers DROP COLUMN IF EXISTS pulse_task_id;
  END IF;
END $$;

-- 2. Drop triggers that sync pulse task time (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
    DROP TRIGGER IF EXISTS sync_pulse_task_time_logged_trigger ON time_entries;
  END IF;
END $$;
DROP FUNCTION IF EXISTS sync_pulse_task_time_logged();

-- 3. Drop all pulse tables (order matters for foreign key constraints)
-- Drop tables that have FKs to other pulse tables first
DROP TABLE IF EXISTS pulse_quarterly_reviews CASCADE;
DROP TABLE IF EXISTS pulse_weekly_reviews CASCADE;
DROP TABLE IF EXISTS pulse_events CASCADE;
DROP TABLE IF EXISTS pulse_settings CASCADE;
DROP TABLE IF EXISTS pulse_daily_tasks CASCADE;
DROP TABLE IF EXISTS pulse_actions CASCADE;
DROP TABLE IF EXISTS pulse_target_owners CASCADE;
DROP TABLE IF EXISTS pulse_targets CASCADE;
DROP TABLE IF EXISTS pulse_goals CASCADE;
