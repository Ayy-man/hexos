-- Migration: Add Suggestion Conversations
-- Extends the conversations system to support per-suggestion conversation threads
-- Follows the established inquiry conversation pattern from 20260103000002

-- ============================================================================
-- UPDATE CONVERSATION TYPE ENUM
-- ============================================================================

-- Add suggestion conversation type
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'suggestion';

-- ============================================================================
-- MODIFY CONVERSATIONS TABLE
-- ============================================================================

-- Add suggestion_id for suggestion conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS suggestion_id UUID REFERENCES suggestions(id) ON DELETE CASCADE;

-- Create unique index for suggestion conversations (one conversation per suggestion)
CREATE UNIQUE INDEX IF NOT EXISTS conversations_suggestion_unique
  ON conversations(suggestion_id)
  WHERE suggestion_id IS NOT NULL;

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

  -- Suggestion conversation: check if user is involved with the suggestion
  IF v_conv_type = 'suggestion' THEN
    RETURN EXISTS (
      SELECT 1 FROM suggestions s
      WHERE s.id = (SELECT suggestion_id FROM conversations WHERE id = p_conversation_id)
        AND (
          -- Admin/internal can see all
          v_user_role IN ('admin', 'internal')
          -- Suggestion author
          OR s.user_id = v_user_id
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
-- TRIGGER: Auto-create conversation for suggestions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_suggestion_conversation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (suggestion_id, type)
  VALUES (NEW.id, 'suggestion')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS suggestions_create_conversation ON suggestions;
CREATE TRIGGER suggestions_create_conversation
  AFTER INSERT ON suggestions
  FOR EACH ROW EXECUTE FUNCTION create_suggestion_conversation();

-- ============================================================================
-- BACKFILL: Create conversations for existing suggestions
-- ============================================================================

INSERT INTO conversations (suggestion_id, type)
SELECT id, 'suggestion'::conversation_type
FROM suggestions
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c WHERE c.suggestion_id = suggestions.id
)
ON CONFLICT DO NOTHING;
