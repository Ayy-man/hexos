-- Migration: Add toast tracking column to notifications table
-- Purpose: Track which notifications have been shown as pop-up toasts to prevent
-- the same notification from appearing as a toast multiple times across page loads/navigation.
-- The shown_as_toast_at column being NULL means the notification has never been shown as a toast.

-- Add the shown_as_toast_at column (nullable - NULL means never shown as toast)
ALTER TABLE notifications
ADD COLUMN shown_as_toast_at TIMESTAMPTZ;

-- Comment explaining the column's purpose
COMMENT ON COLUMN notifications.shown_as_toast_at IS 'Timestamp when notification was displayed as a pop-up toast. NULL means never shown as toast. Used for deduplication.';

-- Create a partial index for efficient querying of notifications that haven't been shown as toast
-- This index is used by getUnshownToastNotifications() to quickly find recent unread notifications
-- that need to be displayed as toasts on page load
CREATE INDEX idx_notifications_unshown_toast
ON notifications(user_id, created_at DESC)
WHERE shown_as_toast_at IS NULL AND read_at IS NULL;
