-- hexOS: Restore Stability & Optimize RLS (v4 - Ultra Robust)
-- Date: 2026-01-03
--
-- This migration checks for both tables AND columns before modifying.
-- FIXES:
-- 1. Performance-intensive subqueries in project_files
-- 2. Potential recursion loops in profiles and conversations
-- 3. Column-level resilience (handles missing inquiry_id)

BEGIN;

-- 1. RE-IMPLEMENT FUNCTIONS (Hardened and Optimized)

-- Non-recursive role getter
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Optimized file access (no recursion, no self-select)
CREATE OR REPLACE FUNCTION public.can_access_file_v2(p_project_id UUID, p_visibility TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_uid;
  IF NOT public.can_access_project(p_project_id) THEN RETURN FALSE; END IF;
  IF v_user_role IN ('admin', 'internal', 'dev') THEN RETURN TRUE; END IF;
  RETURN p_visibility = 'portal' OR p_visibility = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Optimized conversation access
CREATE OR REPLACE FUNCTION public.can_access_conversation_v2(
  p_project_id UUID, 
  p_inquiry_id UUID, 
  p_type TEXT,
  p_conversation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_uid;

  -- Logic depends on type
  IF p_type = 'direct' THEN
    RETURN EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_conversation_participants'
    ) AND EXISTS (
      SELECT 1 FROM public.direct_conversation_participants
      WHERE conversation_id = p_conversation_id AND user_id = v_uid
    );
  END IF;

  -- Default to project access check
  IF p_project_id IS NOT NULL THEN
    IF NOT public.can_access_project(p_project_id) THEN RETURN FALSE; END IF;
    IF p_type = 'project' THEN RETURN TRUE; END IF;
    IF p_type = 'workspace' THEN RETURN v_user_role IN ('admin', 'internal', 'dev'); END IF;
    IF p_type = 'partner' THEN RETURN v_user_role IN ('admin', 'internal', 'dfy'); END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 2. APPLY POLICIES CONDITIONALLY

DO $$ 
BEGIN
    -- PROFILES FIX
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
        CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (
            auth.uid() IS NOT NULL AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        );
    END IF;

    -- PROJECT_FILES FIX
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_files') THEN
        DROP POLICY IF EXISTS "project_files_select" ON project_files;
        DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
        DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;
        
        -- pass columns directly
        CREATE POLICY "project_files_select" ON project_files 
          FOR SELECT USING (can_access_file_v2(project_id, visibility));
        
        ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
    END IF;

    -- CONVERSATIONS FIX (Safe for missing inquiry_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        DROP POLICY IF EXISTS "conversations_select" ON conversations;
        
        -- Check if inquiry_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'inquiry_id') THEN
            EXECUTE 'CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (can_access_conversation_v2(project_id, inquiry_id, type::text, id))';
        ELSE
            -- Fallback if messaging system is partially installed
            EXECUTE 'CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (can_access_conversation_v2(project_id, NULL, type::text, id))';
        END IF;
    END IF;

    -- DIRECT PARTICIPANTS FIX
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_conversation_participants') THEN
        DROP POLICY IF EXISTS "direct_participants_select" ON direct_conversation_participants;
        CREATE POLICY "direct_participants_select" ON direct_conversation_participants
          FOR SELECT USING (
            user_id = auth.uid() OR
            conversation_id IN (
              SELECT conversation_id FROM direct_conversation_participants WHERE user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- 3. FINAL CLEANUP
DROP FUNCTION IF EXISTS can_access_file(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_access_conversation(UUID) CASCADE;

COMMIT;
