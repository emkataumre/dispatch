-- Phase 3: Live Presence
-- Creates the visibility_type enum and live_presence table with RLS.
--
-- Note: The SELECT policy below is simplified — it omits the friends-only subquery
-- because the `friendships` table does not exist until Phase 4. Until then,
-- friends-only broadcasts are only visible to the broadcaster.
-- TODO (Phase 4): replace the SELECT policy with the full version from docs/rls-policy-sketch.md
-- once the friendships table is created.

CREATE TYPE visibility_type AS ENUM ('friends', 'community');

CREATE TABLE public.live_presence (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  poi_id       uuid        NOT NULL REFERENCES public.pois(id) ON DELETE CASCADE,
  message      text        CHECK (char_length(message) <= 140),
  visible_to   visibility_type NOT NULL DEFAULT 'friends',
  created_at   timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz
);

-- Partial indexes for active broadcast queries (dismissed_at IS NULL is the hot path)
CREATE INDEX idx_live_presence_active_user ON public.live_presence (user_id) WHERE dismissed_at IS NULL;
CREATE INDEX idx_live_presence_active_poi  ON public.live_presence (poi_id)  WHERE dismissed_at IS NULL;

ALTER TABLE public.live_presence ENABLE ROW LEVEL SECURITY;

-- Community broadcasts visible to all authenticated users.
-- Friends-only broadcasts visible only to the broadcaster (simplified — see note above).
CREATE POLICY "Presence visible by audience"
  ON public.live_presence FOR SELECT
  TO authenticated
  USING (
    visible_to = 'community'
    OR auth.uid() = user_id
  );

-- Users can broadcast their own presence
CREATE POLICY "Users can insert own presence"
  ON public.live_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own presence (e.g. dismiss)
CREATE POLICY "Users can update own presence"
  ON public.live_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own presence
CREATE POLICY "Users can delete own presence"
  ON public.live_presence FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
