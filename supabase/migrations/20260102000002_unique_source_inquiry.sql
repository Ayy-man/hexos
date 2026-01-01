-- Migration: Prevent duplicate project creation from same inquiry
-- This migration:
-- 1. Cleans up any existing duplicate projects (keeps the one linked to inquiry)
-- 2. Adds UNIQUE constraint on source_inquiry_id to prevent future duplicates

-- Step 1: Delete orphan projects (projects that are NOT linked back from their source inquiry)
-- The ON DELETE CASCADE on related tables will clean up deliverables, requirements, etc.
DELETE FROM projects
WHERE source_inquiry_id IS NOT NULL
  AND id NOT IN (
    SELECT converted_to_project_id
    FROM inquiries
    WHERE converted_to_project_id IS NOT NULL
  );

-- Step 2: Add unique constraint to prevent future duplicates
-- This ensures only one project can be created per inquiry
ALTER TABLE projects
  ADD CONSTRAINT unique_source_inquiry_id UNIQUE (source_inquiry_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_source_inquiry_id ON projects IS
  'Ensures only one project can be created from each inquiry';
