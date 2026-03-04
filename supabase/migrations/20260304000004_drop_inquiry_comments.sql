-- ============================================
-- Drop inquiry_comments system
-- Phase 26: Conversations System Overhaul
-- ============================================
-- The inquiry_comments feature is being removed entirely.
-- Comments now live exclusively in the conversations/messages system.
-- ============================================

-- Remove sync column from messages table
ALTER TABLE messages DROP COLUMN IF EXISTS synced_inquiry_comment_id;

-- Drop the inquiry_comments table and all dependent objects (RLS policies, indexes, triggers)
DROP TABLE IF EXISTS inquiry_comments CASCADE;

-- Drop the comment_type enum if it exists
DROP TYPE IF EXISTS comment_type;
