-- Add Loom video URL support to blueprints and case studies

ALTER TABLE blueprints
ADD COLUMN IF NOT EXISTS loom_video_url TEXT;

COMMENT ON COLUMN blueprints.loom_video_url IS 'Optional Loom video URL for blueprint walkthrough';

ALTER TABLE case_studies
ADD COLUMN IF NOT EXISTS loom_video_url TEXT;

COMMENT ON COLUMN case_studies.loom_video_url IS 'Optional Loom video URL for case study presentation';
