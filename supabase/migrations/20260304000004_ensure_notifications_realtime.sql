-- Ensure notifications table is in the supabase_realtime publication
-- Without this, Realtime subscriptions won't receive INSERT/UPDATE events
-- and toasts/sounds won't fire in the browser.
-- Safe to re-run: IF NOT EXISTS prevents duplicate errors.

DO $$
BEGIN
  -- Check if notifications is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL so Realtime can filter on all columns (e.g. user_id)
-- Default replica identity only includes PK for UPDATE/DELETE events
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
