-- Fix: service_role cannot INSERT into notifications table (error 42501)
-- The notifications table was created but missing explicit GRANTs.
-- DB triggers (SECURITY DEFINER) work because they run as postgres,
-- but the Supabase service_role client needs explicit table permissions.

GRANT ALL ON TABLE public.notifications TO service_role;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO anon;
