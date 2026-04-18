-- Badge evaluator for check-in-triggered badges (16 of 20).
-- Fires AFTER INSERT on check_ins; all counts include the new row.
-- Social badges (social_butterfly, connector, come_join_me) are in migration 032.
-- Pioneer is awarded at signup in handle_new_user (migration 030).
--
-- Thresholds:
--   first_step          total check-ins >= 1
--   getting_started     total check-ins >= 5
--   semester_regular    total check-ins >= 25
--   copenhagen_veteran  total check-ins >= 50
--   all_five            distinct POI categories this semester = 5
--   cartographer        unique POIs this semester >= 20
--   local_secret        total community check-ins at this POI (all time, post-insert) <= 10
--   regular             visits to this POI this semester >= 3
--   this_is_my_table    visits to this POI >= 5 AND no other user has more
--   night_owl           check-in hour (Copenhagen TZ) in [0, 4]
--   early_bird          check-in hour in [5, 7]
--   weekend_warrior     check-in day = Saturday or Sunday (Copenhagen TZ)
--   bookworm            check-ins in study_spots this semester >= 3
--   culture_vulture     check-ins in culture this semester >= 3
--   foodie              check-ins in food_drink this semester >= 3
--   nightlifer          check-ins in nightlife this semester >= 3

CREATE OR REPLACE FUNCTION award_check_in_badges()
RETURNS trigger AS $$
DECLARE
  v_total_checkins    int;
  v_unique_pois       int;
  v_distinct_cats     int;
  v_this_poi          int;
  v_study_spots       int;
  v_culture           int;
  v_food_drink        int;
  v_nightlife         int;
  v_community         int;
  v_checkin_hour      int;
  v_checkin_dow       int;
  v_top_visitor       bool;
BEGIN
  -- One pass: all user/semester aggregates (includes NEW row — AFTER INSERT)
  SELECT
    COUNT(*)                                               AS total,
    COUNT(DISTINCT ci.poi_id)                             AS unique_pois,
    COUNT(DISTINCT p.category)                            AS distinct_cats,
    COUNT(*) FILTER (WHERE ci.poi_id = NEW.poi_id)        AS this_poi,
    COUNT(*) FILTER (WHERE p.category = 'study_spots')   AS study_spots,
    COUNT(*) FILTER (WHERE p.category = 'culture')       AS culture,
    COUNT(*) FILTER (WHERE p.category = 'food_drink')    AS food_drink,
    COUNT(*) FILTER (WHERE p.category = 'nightlife')     AS nightlife
  INTO
    v_total_checkins, v_unique_pois, v_distinct_cats,
    v_this_poi, v_study_spots, v_culture, v_food_drink, v_nightlife
  FROM public.check_ins ci
  JOIN public.pois p ON p.id = ci.poi_id
  WHERE ci.user_id = NEW.user_id
    AND ci.semester_id = NEW.semester_id;

  -- Community check-ins at this POI across all users and semesters
  SELECT COUNT(*) INTO v_community
  FROM public.check_ins
  WHERE poi_id = NEW.poi_id;

  -- Time components in Copenhagen timezone
  v_checkin_hour := EXTRACT(HOUR FROM NEW.checked_in_at AT TIME ZONE 'Europe/Copenhagen')::int;
  v_checkin_dow  := EXTRACT(DOW  FROM NEW.checked_in_at AT TIME ZONE 'Europe/Copenhagen')::int;

  -- Top visitor: no other user has strictly more visits at this POI this semester
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.check_ins
    WHERE poi_id     = NEW.poi_id
      AND semester_id = NEW.semester_id
      AND user_id    != NEW.user_id
    GROUP BY user_id
    HAVING COUNT(*) > v_this_poi
  ) INTO v_top_visitor;

  -- ── Milestones ────────────────────────────────────────────────────────────

  IF v_total_checkins >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'first_step', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_total_checkins >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'getting_started', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_total_checkins >= 25 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'semester_regular', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_total_checkins >= 50 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'copenhagen_veteran', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  -- ── Exploration ───────────────────────────────────────────────────────────

  IF v_distinct_cats >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'all_five', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_unique_pois >= 20 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'cartographer', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_community <= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'local_secret', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  -- ── Loyalty ───────────────────────────────────────────────────────────────

  IF v_this_poi >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'regular', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_this_poi >= 5 AND v_top_visitor THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'this_is_my_table', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  -- ── Time & Rhythm ─────────────────────────────────────────────────────────

  IF v_checkin_hour < 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'night_owl', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_checkin_hour >= 5 AND v_checkin_hour < 8 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'early_bird', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  -- DOW: 0 = Sunday, 6 = Saturday
  IF v_checkin_dow IN (0, 6) THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'weekend_warrior', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  -- ── POI Category ──────────────────────────────────────────────────────────

  IF v_study_spots >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'bookworm', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_culture >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'culture_vulture', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_food_drink >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'foodie', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  IF v_nightlife >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (NEW.user_id, 'nightlifer', NEW.semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

CREATE TRIGGER trg_award_check_in_badges
  AFTER INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION award_check_in_badges();
