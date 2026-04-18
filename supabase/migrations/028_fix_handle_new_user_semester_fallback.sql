-- Fix handle_new_user to handle gaps between semesters.
-- Previously, signups during gaps (e.g. pre-semester arrival window) left
-- profile.semester_id = NULL, which broke downstream check-in logic
-- (lib/checkIns.ts throws "No active semester for user").
--
-- New tiered lookup:
--   1. Active semester (covers today)
--   2. Next upcoming semester (students typically sign up 1-4 weeks before arrival)
--   3. Most recent past semester (graceful fallback)
--   4. If no semesters exist at all, warn and leave NULL.
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

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
