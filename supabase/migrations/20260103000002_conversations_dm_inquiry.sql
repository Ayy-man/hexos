-- Migration: Add Direct Messages and Inquiry Conversations
-- Extends the conversations system to support:
-- 1. Direct messages between users (not tied to projects)
-- 2. Inquiry/proposal conversations

-- ============================================================================
-- UPDATE CONVERSATION TYPE ENUM
-- ============================================================================

-- Add new conversation types
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'direct';
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'inquiry';

-- ============================================================================
-- MODIFY CONVERSATIONS TABLE
-- ============================================================================

-- Make project_id nullable for direct conversations
ALTER TABLE conversations ALTER COLUMN project_id DROP NOT NULL;

-- Add inquiry_id for inquiry conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE;

-- Add title for direct conversations (e.g., group chat names)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title TEXT;

-- Update unique constraint to handle new types
-- First drop the constraint (not the index)
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_project_id_type_key;
CREATE UNIQUE INDEX conversations_project_type_unique
  ON conversations(project_id, type)
  WHERE project_id IS NOT NULL AND type IN ('project', 'workspace', 'partner');

CREATE UNIQUE INDEX conversations_inquiry_unique
  ON conversations(inquiry_id)
  WHERE inquiry_id IS NOT NULL;

-- ============================================================================
-- DIRECT CONVERSATION PARTICIPANTS
-- ============================================================================

-- For direct messages, track who is in each conversation
CREATE TABLE IF NOT EXISTS direct_conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_direct_participants_conversation ON direct_conversation_participants(conversation_id);
CREATE INDEX idx_direct_participants_user ON direct_conversation_participants(user_id);

-- ============================================================================
-- UPDATE RLS HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
  v_project_id UUID;
  v_inquiry_id UUID;
  v_conv_type conversation_type;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();

  -- Get conversation details
  SELECT project_id, inquiry_id, type INTO v_project_id, v_inquiry_id, v_conv_type
  FROM conversations WHERE id = p_conversation_id;

  -- Direct conversation: check if user is a participant
  IF v_conv_type = 'direct' THEN
    RETURN EXISTS (
      SELECT 1 FROM direct_conversation_participants
      WHERE conversation_id = p_conversation_id AND user_id = v_user_id
    );
  END IF;

  -- Inquiry conversation: check if user is involved with the inquiry
  IF v_conv_type = 'inquiry' THEN
    RETURN EXISTS (
      SELECT 1 FROM inquiries i
      WHERE i.id = v_inquiry_id
        AND (
          -- Admin/internal can see all
          v_user_role IN ('admin', 'internal')
          -- DFY partner who submitted
          OR i.submitted_by = v_user_id
          -- Assigned dev
          OR i.assigned_dev_id = v_user_id
        )
    );
  END IF;

  -- Project conversations: existing logic
  IF v_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT public.can_access_project(v_project_id) THEN
    RETURN FALSE;
  END IF;

  RETURN CASE v_conv_type
    WHEN 'project' THEN TRUE
    WHEN 'workspace' THEN v_user_role IN ('admin', 'internal', 'dev')
    WHEN 'partner' THEN v_user_role IN ('admin', 'internal', 'dfy')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- RLS FOR DIRECT PARTICIPANTS
-- ============================================================================

ALTER TABLE direct_conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "direct_participants_select" ON direct_conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM direct_conversation_participants dcp
      WHERE dcp.conversation_id = direct_conversation_participants.conversation_id
        AND dcp.user_id = auth.uid()
    )
  );

CREATE POLICY "direct_participants_insert" ON direct_conversation_participants
  FOR INSERT WITH CHECK (
    -- Can add participants to conversations you're in, or create new ones
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM direct_conversation_participants dcp
      WHERE dcp.conversation_id = direct_conversation_participants.conversation_id
        AND dcp.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGER: Auto-create conversation for inquiries
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_inquiry_conversation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (inquiry_id, type)
  VALUES (NEW.id, 'inquiry')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inquiries_create_conversation ON inquiries;
CREATE TRIGGER inquiries_create_conversation
  AFTER INSERT ON inquiries
  FOR EACH ROW EXECUTE FUNCTION create_inquiry_conversation();

-- ============================================================================
-- BACKFILL: Create conversations for existing inquiries
-- ============================================================================

INSERT INTO conversations (inquiry_id, type)
SELECT id, 'inquiry'::conversation_type
FROM inquiries
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c WHERE c.inquiry_id = inquiries.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ADD REALTIME FOR DIRECT PARTICIPANTS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE direct_conversation_participants;
