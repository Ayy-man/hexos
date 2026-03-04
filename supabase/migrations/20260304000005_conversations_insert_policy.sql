-- ============================================
-- Add missing INSERT/DELETE policies for conversations table
-- ============================================
-- The conversations table only had a SELECT policy. Direct conversations
-- are created via the client (not triggers), so they need INSERT access.
-- Project/inquiry conversations are created by SECURITY DEFINER triggers
-- and don't need client-side INSERT policies.
-- ============================================

-- Allow authenticated users to create direct conversations
CREATE POLICY "conversations_insert_direct" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND type = 'direct'
  );

-- Allow deleting conversations you created (cleanup on error)
CREATE POLICY "conversations_delete_own_direct" ON conversations
  FOR DELETE USING (
    type = 'direct' AND EXISTS (
      SELECT 1 FROM direct_conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );
