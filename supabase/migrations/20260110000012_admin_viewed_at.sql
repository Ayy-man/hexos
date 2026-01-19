-- Add admin_viewed_at timestamp to inquiries table
-- This tracks when an admin first viewed the inquiry, shown to DFY partners as an eye icon

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS admin_viewed_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN inquiries.admin_viewed_at IS 'Timestamp of first admin view of this inquiry';

-- Create index for queries filtering by viewed status
CREATE INDEX IF NOT EXISTS idx_inquiries_admin_viewed_at ON inquiries(admin_viewed_at);
