-- Extend handle_new_user to auto-award the Pioneer badge on signup.
-- Pioneer is awarded once, tied to the user's resolved semester.
-- Skipped silently when no semesters exist (resolved_semester_id IS NULL).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  resolved_semester_id uuid;
BEGIN
  -- 1. Active semester
  SELECT id INTO resolved_semester_id
  FROM public.semesters
  WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
  LIMIT 1;

  -- 2. Next upcoming semester
  IF resolved_semester_id IS NULL THEN
    SELECT id INTO resolved_semester_id
    FROM public.semesters
    WHERE start_date > CURRENT_DATE
    ORDER BY start_date ASC
    LIMIT 1;
  END IF;

  -- 3. Most recent past semester
  IF resolved_semester_id IS NULL THEN
    SELECT id INTO resolved_semester_id
    FROM public.semesters
    WHERE end_date < CURRENT_DATE
    ORDER BY end_date DESC
    LIMIT 1;
  END IF;

  -- 4. No semesters exist
  IF resolved_semester_id IS NULL THEN
    RAISE WARNING 'No semesters exist in database for new user %. semester_id will be null.', new.id;
  END IF;

  INSERT INTO public.profiles (id, display_name, semester_id)
  VALUES (new.id, new.raw_user_meta_data->>'display_name', resolved_semester_id);

  -- Award Pioneer badge on signup. Skipped when no semester resolved.
  -- ON CONFLICT DO NOTHING makes the insert idempotent.
  IF resolved_semester_id IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, semester_id)
    VALUES (new.id, 'pioneer', resolved_semester_id)
    ON CONFLICT ON CONSTRAINT uq_user_badges_user_badge_semester DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;
