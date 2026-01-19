-- Disable RLS on project_documents
-- App handles permissions via getProfile() and role checks

-- Drop all existing policies
DROP POLICY IF EXISTS "project_documents_select" ON project_documents;
DROP POLICY IF EXISTS "project_documents_insert" ON project_documents;
DROP POLICY IF EXISTS "project_documents_update" ON project_documents;
DROP POLICY IF EXISTS "project_documents_delete" ON project_documents;

-- Disable RLS entirely
ALTER TABLE project_documents DISABLE ROW LEVEL SECURITY;

-- Same for document_versions
DROP POLICY IF EXISTS "document_versions_select" ON document_versions;
DROP POLICY IF EXISTS "document_versions_insert" ON document_versions;
DROP POLICY IF EXISTS "document_versions_update" ON document_versions;
DROP POLICY IF EXISTS "document_versions_delete" ON document_versions;

ALTER TABLE document_versions DISABLE ROW LEVEL SECURITY;
