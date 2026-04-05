-- Fix: prevent users from joining their own broadcast at the DB level.
-- The client already guards against this via isOwnPresence, but RLS should be authoritative.
-- Replaces the INSERT policy from migration 013 with one that adds a NOT EXISTS check.

DROP POLICY "Users can insert own join" ON public.presence_joins;

CREATE POLICY "Users can insert own join"
  ON public.presence_joins FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = joiner_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.live_presence
      WHERE id = presence_joins.presence_id
        AND user_id = auth.uid()
    )
  );
