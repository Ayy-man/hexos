-- Fix conversation_read_status RLS policies
-- Addresses 406 errors on upsert operations
-- Self-contained: doesn't rely on helper functions that may be missing

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "conversation_read_status_select_own" ON conversation_read_status;
DROP POLICY IF EXISTS "conversation_read_status_insert" ON conversation_read_status;
DROP POLICY IF EXISTS "conversation_read_status_insert_own" ON conversation_read_status;
DROP POLICY IF EXISTS "conversation_read_status_update_own" ON conversation_read_status;
DROP POLICY IF EXISTS "conversation_read_status_delete_own" ON conversation_read_status;

-- ============================================================================
-- CREATE NEW POLICIES
-- ============================================================================

-- SELECT: Users can see their own read status
CREATE POLICY "conversation_read_status_select_own" ON conversation_read_status
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: Users can insert their own read status
-- Simplified check: if user can see the conversation (via conversations RLS), they can track read status
CREATE POLICY "conversation_read_status_insert_own" ON conversation_read_status
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c WHERE c.id = conversation_id
    )
  );

-- UPDATE: Users can update their own read status
CREATE POLICY "conversation_read_status_update_own" ON conversation_read_status
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own read status
CREATE POLICY "conversation_read_status_delete_own" ON conversation_read_status
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON TABLE conversation_read_status IS 'Tracks the last read message per user per conversation for unread count calculations';
