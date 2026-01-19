-- hexOS Conversations System Migration
-- Creates tables for project chat rooms with real-time messaging, attachments, reactions, and mentions

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE conversation_type AS ENUM ('project', 'workspace', 'partner');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Conversations - One record per chat room per project
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type conversation_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, type)
);

-- Messages - Individual chat messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Attachments - Files attached to messages
CREATE TABLE public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Reactions - Emoji reactions on messages
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Message Mentions - @mentions for notifications
CREATE TABLE public.message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id)
);

-- Conversation Read Status - Track unread messages per user
CREATE TABLE public.conversation_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  UNIQUE(conversation_id, user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_mentions_message_id ON message_mentions(message_id);
CREATE INDEX idx_message_mentions_user_id ON message_mentions(mentioned_user_id);
CREATE INDEX idx_conversation_read_status_user_id ON conversation_read_status(user_id);
CREATE INDEX idx_conversation_read_status_conversation_id ON conversation_read_status(conversation_id);

-- ============================================================================
-- HELPER FUNCTION: can_access_conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
  v_project_id UUID;
  v_conv_type conversation_type;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();

  -- Get conversation details
  SELECT project_id, type INTO v_project_id, v_conv_type
  FROM conversations WHERE id = p_conversation_id;

  IF v_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check project access first
  IF NOT public.can_access_project(v_project_id) THEN
    RETURN FALSE;
  END IF;

  -- Check conversation type access based on role
  RETURN CASE v_conv_type
    -- Project chat: everyone with project access
    WHEN 'project' THEN TRUE
    -- Workspace chat: admin, internal, dev only
    WHEN 'workspace' THEN v_user_role IN ('admin', 'internal', 'dev')
    -- Partner chat: admin, internal, dfy only
    WHEN 'partner' THEN v_user_role IN ('admin', 'internal', 'dfy')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.can_access_conversation IS
  'Check if current user can access a conversation based on project access and conversation type';

-- ============================================================================
-- TRIGGER: Auto-create conversations when project is created
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_project_conversations()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (project_id, type)
  VALUES
    (NEW.id, 'project'),
    (NEW.id, 'workspace'),
    (NEW.id, 'partner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER projects_create_conversations
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION create_project_conversations();

COMMENT ON TRIGGER projects_create_conversations ON projects IS
  'Automatically create three conversation rooms (project, workspace, partner) when a project is created';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_read_status ENABLE ROW LEVEL SECURITY;

-- CONVERSATIONS POLICIES
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (can_access_conversation(id));

-- MESSAGES POLICIES
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (can_access_conversation(conversation_id));

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    can_access_conversation(conversation_id) AND
    sender_id = auth.uid()
  );

-- Update own messages only (for edit)
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- MESSAGE ATTACHMENTS POLICIES
CREATE POLICY "message_attachments_select" ON message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_access_conversation(m.conversation_id)
    )
  );

CREATE POLICY "message_attachments_insert" ON message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
        AND m.sender_id = auth.uid()
        AND can_access_conversation(m.conversation_id)
    )
  );

CREATE POLICY "message_attachments_delete_own" ON message_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND m.sender_id = auth.uid()
    )
  );

-- MESSAGE REACTIONS POLICIES
CREATE POLICY "message_reactions_select" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_access_conversation(m.conversation_id)
    )
  );

CREATE POLICY "message_reactions_insert" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_access_conversation(m.conversation_id)
    )
  );

CREATE POLICY "message_reactions_delete_own" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- MESSAGE MENTIONS POLICIES
CREATE POLICY "message_mentions_select" ON message_mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND can_access_conversation(m.conversation_id)
    )
  );

CREATE POLICY "message_mentions_insert" ON message_mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id
        AND m.sender_id = auth.uid()
        AND can_access_conversation(m.conversation_id)
    )
  );

-- CONVERSATION READ STATUS POLICIES
CREATE POLICY "conversation_read_status_select_own" ON conversation_read_status
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "conversation_read_status_insert" ON conversation_read_status
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND can_access_conversation(conversation_id)
  );

CREATE POLICY "conversation_read_status_update_own" ON conversation_read_status
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- ============================================================================
-- STORAGE BUCKET (run manually in Supabase dashboard if needed)
-- ============================================================================

-- Note: Storage bucket creation may need to be done via Supabase dashboard
-- Bucket name: message-attachments
-- Public: false (use signed URLs)

-- CREATE POLICY storage policies via dashboard:
-- INSERT: auth.role() = 'authenticated'
-- SELECT: auth.role() = 'authenticated'
-- DELETE: auth.role() = 'authenticated'

-- ============================================================================
-- BACKFILL: Create conversations for existing projects
-- ============================================================================

INSERT INTO conversations (project_id, type)
SELECT p.id, t.type
FROM projects p
CROSS JOIN (VALUES ('project'::conversation_type), ('workspace'::conversation_type), ('partner'::conversation_type)) AS t(type)
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.project_id = p.id AND c.type = t.type
)
ON CONFLICT (project_id, type) DO NOTHING;
