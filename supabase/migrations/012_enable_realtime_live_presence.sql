-- Enable Supabase Realtime for the live_presence table.
-- Without this, postgres_changes subscriptions connect successfully
-- but never receive INSERT/UPDATE events.
alter publication supabase_realtime add table public.live_presence;
