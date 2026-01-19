-- Add missing indexes to foreign keys in project_files for performance
CREATE INDEX IF NOT EXISTS idx_project_files_deliverable_id ON public.project_files(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON public.project_files(uploaded_by);
