-- Phase 4: Replace simplified live_presence SELECT policy with friends-aware version.
-- The policy in 011_live_presence.sql omitted the friends subquery because the
-- friendships table did not exist until Phase 4. It is safe to drop and recreate
-- because no other policies on this table reference it.

DROP POLICY IF EXISTS "Presence visible by audience" ON public.live_presence;

CREATE POLICY "Presence visible by audience"
  ON public.live_presence FOR SELECT
  TO authenticated
  USING (
    visible_to = 'community'
    OR auth.uid() = user_id
    OR (
      visible_to = 'friends'
      AND EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
          AND (
            (requester_id = auth.uid() AND addressee_id = live_presence.user_id)
            OR (addressee_id = auth.uid() AND requester_id = live_presence.user_id)
          )
      )
    )
  );

-- Composite index to accelerate the friends subquery (runs per-row during SELECT).
CREATE INDEX IF NOT EXISTS idx_friendships_lookup
  ON public.friendships (requester_id, addressee_id, status);
