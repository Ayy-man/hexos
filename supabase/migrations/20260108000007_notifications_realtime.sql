-- Enable Supabase Realtime for notifications table
-- This allows instant push of new notifications to subscribed clients

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
