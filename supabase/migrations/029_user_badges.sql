-- user_badges: immutable log of badges awarded to users, scoped per semester.
-- No authenticated INSERT policy — only SECURITY DEFINER triggers can award badges.
-- Triggers use ON CONFLICT DO NOTHING for idempotent re-evaluation.

CREATE TABLE public.user_badges (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id    text        NOT NULL CHECK (badge_id ~ '^[a-z_]+$'),
  semester_id uuid        NOT NULL REFERENCES public.semesters(id),
  awarded_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_badges_user_badge_semester UNIQUE (user_id, badge_id, semester_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_badges_user_semester ON public.user_badges (user_id, semester_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
