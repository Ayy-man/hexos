-- Add image_url to case_studies
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS image_url TEXT;
