-- Seed known DIS semesters through Fall 2028 and add UNIQUE constraint
-- on name for idempotent future inserts (pg_cron job in next migration).
--
-- DIS semester calendar (approximate, stable year-to-year):
--   Spring: Jan 25 – May 15
--   Summer: May 15 – Aug 15
--   Fall:   Aug 25 – Dec 20

-- Idempotency key for ON CONFLICT
ALTER TABLE public.semesters
  ADD CONSTRAINT uq_semesters_name UNIQUE (name);

-- Seed through Fall 2028. Existing rows (Summer 2026, Fall 2026) skipped.
INSERT INTO public.semesters (name, start_date, end_date) VALUES
  ('Spring 2027', '2027-01-25', '2027-05-15'),
  ('Summer 2027', '2027-05-15', '2027-08-15'),
  ('Fall 2027',   '2027-08-25', '2027-12-20'),
  ('Spring 2028', '2028-01-25', '2028-05-15'),
  ('Summer 2028', '2028-05-15', '2028-08-15'),
  ('Fall 2028',   '2028-08-25', '2028-12-20')
ON CONFLICT (name) DO NOTHING;
