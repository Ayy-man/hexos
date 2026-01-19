-- Add logo_url column to profiles for DFY partner branding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN profiles.logo_url IS 'URL to DFY partner logo for branded proposals';
