-- Enable Supabase Realtime for the friendships table so both parties
-- see friend request and acceptance changes without an app reload.
-- Mirrors the pattern in 012_enable_realtime_live_presence.sql.
alter publication supabase_realtime add table public.friendships;
