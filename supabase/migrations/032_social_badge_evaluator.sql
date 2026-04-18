-- Badge evaluator for social badges (3 of 20).
-- Fires AFTER UPDATE on presence_joins when confirmed flips false → true.
--
-- Join counts are not semester-scoped (live_presence has no semester_id).
-- Counts are all-time; badge is awarded into the user's current profile.semester_id.
--
-- Thresholds:
--   social_butterfly  joiner's total confirmed joins (all time) >= 3
--   connector         distinct confirmed joiners across broadcaster's presences >= 3
--   come_join_me      >= 1 confirmed join on any of broadcaster's presences

CREATE OR REPLACE FUNCTION award_social_badges()
RETURNS trigger AS $$
DECLARE
  v_broadcaster_id       uuid;
  v_joiner_semester      uuid;
  v_broadcaster_semester uuid;
  v_joiner_joins         int;
  v_broadcaster_joins    int;
BEGIN
  -- Resolve broadcaster (may be NULL if presence was dismissed/expired and deleted)
  SELECT user_id INTO v_broadcaster_id
  FROM public.live_presence
  WHERE id = NEW.presence_id;

  IF v_broadcaster_id IS NULL THEN
    RAISE WARNING 'award_social_badges: live_presence % not found for join %. Broadcaster badges skipped.',
      NEW.presence_id, NEW.id;
  END IF;

  -- Resolve semesters from profiles
  SELECT semester_id INTO v_joiner_semester
  FROM public.profiles
  WHERE id = NEW.joiner_user_id;

  IF v_broadcaster_id IS NOT NULL THEN
    SELECT semester_id INTO v_broadcaster_semester
    FROM public.profiles
    WHERE id = v_broadcaster_id;
  END IF;

  -- ── social_butterfly (joiner) ────────────────────────────────────────────

  IF v_joiner_semester IS NOT NULL THEN
    -- AFTER UPDATE: triggering row is already confirmed=true, so count includes it.
    SELECT COUNT(*) INTO v_joiner_joins
    FROM public.presence_joins
    WHERE joiner_user_id = NEW.joiner_user_id
      AND confirmed = true;

    IF v_joiner_joins >= 3 THEN
      INSERT INTO public.user_badges (user_id, badge_id, semester_id)
      VALUES (NEW.joiner_user_id, 'social_butterfly', v_joiner_semester)
      ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
    END IF;
  END IF;

  -- ── connector + come_join_me (broadcaster) ───────────────────────────────

  IF v_broadcaster_id IS NOT NULL AND v_broadcaster_semester IS NOT NULL THEN
    -- AFTER UPDATE: triggering row's joiner is included in this count.
    SELECT COUNT(DISTINCT pj.joiner_user_id) INTO v_broadcaster_joins
    FROM public.presence_joins pj
    JOIN public.live_presence lp ON lp.id = pj.presence_id
    WHERE lp.user_id = v_broadcaster_id
      AND pj.confirmed = true;

    IF v_broadcaster_joins >= 1 THEN
      INSERT INTO public.user_badges (user_id, badge_id, semester_id)
      VALUES (v_broadcaster_id, 'come_join_me', v_broadcaster_semester)
      ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
    END IF;

    IF v_broadcaster_joins >= 3 THEN
      INSERT INTO public.user_badges (user_id, badge_id, semester_id)
      VALUES (v_broadcaster_id, 'connector', v_broadcaster_semester)
      ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

CREATE TRIGGER trg_award_social_badges
  AFTER UPDATE ON public.presence_joins
  FOR EACH ROW
  WHEN (OLD.confirmed = false AND NEW.confirmed = true)
  EXECUTE FUNCTION award_social_badges();
