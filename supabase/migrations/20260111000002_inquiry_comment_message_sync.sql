-- ============================================================================
-- Bidirectional Sync: inquiry_comments <-> messages
-- ============================================================================
-- This migration enables bidirectional sync between inquiry comments and
-- conversation messages so that:
-- 1. Comments added in inquiry detail appear in Conversations > Inquiries tab
-- 2. Messages sent from Conversations create inquiry_comments
-- ============================================================================

-- Add sync column to inquiry_comments (links to the synced message)
ALTER TABLE inquiry_comments
ADD COLUMN IF NOT EXISTS synced_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add sync column to messages (links to the synced inquiry_comment)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS synced_inquiry_comment_id UUID REFERENCES inquiry_comments(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_inquiry_comments_synced_message_id
ON inquiry_comments(synced_message_id) WHERE synced_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_synced_inquiry_comment_id
ON messages(synced_inquiry_comment_id) WHERE synced_inquiry_comment_id IS NOT NULL;

-- ============================================================================
-- Backfill: Create messages for all existing inquiry_comments
-- ============================================================================
-- This ensures historical comments appear in the Conversations > Inquiries tab

INSERT INTO messages (
  conversation_id,
  sender_id,
  content,
  created_at,
  synced_inquiry_comment_id
)
SELECT
  c.id AS conversation_id,
  ic.author_id AS sender_id,
  ic.content,
  ic.created_at,
  ic.id AS synced_inquiry_comment_id
FROM inquiry_comments ic
JOIN conversations c ON c.inquiry_id = ic.inquiry_id AND c.type = 'inquiry'
WHERE ic.synced_message_id IS NULL
  AND ic.anchor_id IS NULL  -- Skip inline anchor comments (those are document-specific)
ON CONFLICT DO NOTHING;

-- Update inquiry_comments with their synced message IDs
UPDATE inquiry_comments ic
SET synced_message_id = m.id
FROM messages m
WHERE m.synced_inquiry_comment_id = ic.id
  AND ic.synced_message_id IS NULL;

-- ============================================================================
-- Comments
-- ============================================================================
-- Note: Threading is NOT synced because messages table doesn't support parent_id.
-- inquiry_comments with parent_id will still sync as individual messages.
--
-- Inline anchor comments (anchor_id IS NOT NULL) are NOT synced because they
-- are document-specific annotations, not general discussion.
