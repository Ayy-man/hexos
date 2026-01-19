-- Add delivery date override column to projects
-- Allows manual override of the calculated estimated delivery date

ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_date_override DATE;

COMMENT ON COLUMN projects.delivery_date_override IS 'Manual override for estimated delivery date. When set, this takes precedence over calculated estimate.';
