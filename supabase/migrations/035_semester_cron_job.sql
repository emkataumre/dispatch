-- Enable pg_cron and schedule monthly auto-generation of DIS semester rows.
-- Ensures handle_new_user (migration 028) always finds a valid semester.

-- 1. Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 2. Function: generate semesters for current year + next year
CREATE OR REPLACE FUNCTION public.generate_upcoming_semesters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr int;
BEGIN
  FOR yr IN SELECT generate_series(
    EXTRACT(YEAR FROM CURRENT_DATE)::int,
    EXTRACT(YEAR FROM CURRENT_DATE)::int + 1
  ) LOOP
    INSERT INTO public.semesters (name, start_date, end_date) VALUES
      ('Spring ' || yr, make_date(yr, 1, 25), make_date(yr, 5, 15)),
      ('Summer ' || yr, make_date(yr, 5, 15), make_date(yr, 8, 15)),
      ('Fall '   || yr, make_date(yr, 8, 25), make_date(yr, 12, 20))
    ON CONFLICT (name) DO NOTHING;
  END LOOP;
END;
$$;

-- 3. Schedule: 1st of every month at midnight UTC
SELECT cron.schedule(
  'generate-semesters',
  '0 0 1 * *',
  $$SELECT public.generate_upcoming_semesters()$$
);

-- 4. Run immediately to fill any gaps
SELECT public.generate_upcoming_semesters();
