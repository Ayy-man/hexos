-- ============================================================================
-- GENERAL-PURPOSE BUCKET RLS POLICIES
-- ============================================================================
-- Fixes 403 errors for case study cover image uploads and suggestion box
-- screenshot uploads. The bucket exists and is public, but was missing RLS
-- policies on storage.objects.
--
-- Upload paths covered:
--   - case-studies/{timestamp}.{ext} (case study cover images)
--   - suggestions/{user_id}/{timestamp}.{ext} (suggestion screenshots)
--   - avatars/* (profile images)
--   - dfy-logos/* (DFY partner logos)
--   - editor-images/* (rich text editor uploads)
--   - project-files/* (project attachments)
-- ============================================================================

-- Policy 1: Authenticated users can upload files
-- No folder restriction since case studies use timestamp-only paths
DROP POLICY IF EXISTS "Authenticated users upload to general-purpose" ON storage.objects;
CREATE POLICY "Authenticated users upload to general-purpose" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'general-purpose');

-- Policy 2: Public read access (bucket is already public for URL access)
DROP POLICY IF EXISTS "Public read access for general-purpose" ON storage.objects;
CREATE POLICY "Public read access for general-purpose" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'general-purpose');

-- Policy 3: Authenticated users can update their uploads
DROP POLICY IF EXISTS "Authenticated users update in general-purpose" ON storage.objects;
CREATE POLICY "Authenticated users update in general-purpose" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'general-purpose');

-- Policy 4: Admin/Internal only can delete files
-- Uses profiles table lookup (safe - not querying storage.objects)
DROP POLICY IF EXISTS "Admins delete from general-purpose" ON storage.objects;
CREATE POLICY "Admins delete from general-purpose" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'general-purpose'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );
