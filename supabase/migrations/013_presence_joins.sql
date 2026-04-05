-- presence_joins: records a user's intent to join a live presence broadcast.
-- The `confirmed` flag is set to true in Phase 5 when the joiner's geofence arrival is detected.

CREATE TABLE public.presence_joins (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  presence_id      uuid        NOT NULL REFERENCES public.live_presence(id) ON DELETE CASCADE,
  joiner_user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  confirmed        boolean     NOT NULL DEFAULT false,

  CONSTRAINT presence_joins_unique UNIQUE (presence_id, joiner_user_id)
);

CREATE INDEX idx_presence_joins_presence ON public.presence_joins (presence_id);
CREATE INDEX idx_presence_joins_joiner   ON public.presence_joins (joiner_user_id);

ALTER TABLE public.presence_joins ENABLE ROW LEVEL SECURITY;

-- Broadcaster and joiner can both read join records
CREATE POLICY "Broadcaster and joiner can view joins"
  ON public.presence_joins FOR SELECT
  TO authenticated
  USING (
    auth.uid() = joiner_user_id
    OR EXISTS (
      SELECT 1 FROM public.live_presence
      WHERE id = presence_joins.presence_id
        AND user_id = auth.uid()
    )
  );

-- Authenticated users can log a join intent
CREATE POLICY "Users can insert own join"
  ON public.presence_joins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = joiner_user_id);

-- Broadcaster can confirm arrival (used in Phase 5 geofence flow).
-- WITH CHECK mirrors USING so the broadcaster cannot reassign presence_id
-- or joiner_user_id to arbitrary values.
CREATE POLICY "Broadcaster can confirm join"
  ON public.presence_joins FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_presence
      WHERE id = presence_joins.presence_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_presence
      WHERE id = presence_joins.presence_id
        AND user_id = auth.uid()
    )
  );

-- Joiner can withdraw their join intent before it is confirmed
CREATE POLICY "Joiner can delete own join"
  ON public.presence_joins FOR DELETE
  TO authenticated
  USING (auth.uid() = joiner_user_id);

-- Enable Realtime for presence_joins so Phase 5 can subscribe to confirmation events
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence_joins;
