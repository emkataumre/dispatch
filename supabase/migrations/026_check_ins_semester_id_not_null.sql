-- Enforce semester_id NOT NULL on check_ins.
-- Every check-in must belong to a semester; the column was nullable in 021.
--
-- Backfill strategy (two passes):
--   1. Date-window match: assign the semester whose [start_date, end_date]
--      contains the check-in's checked_in_at date.
--   2. Profile fallback: for any rows that fell in a gap between semesters
--      (e.g. test data), use the owning user's current profile.semester_id.
--   3. Delete any rows that still have no resolvable semester
--      (should be empty in practice — captures orphaned rows with no profile).

-- 1. Backfill via semester date window.
UPDATE public.check_ins ci
SET semester_id = s.id
FROM public.semesters s
WHERE ci.semester_id IS NULL
  AND ci.checked_in_at::date BETWEEN s.start_date AND s.end_date;

-- 2. Fallback: use the owning user's profile semester for rows not in any window.
UPDATE public.check_ins ci
SET semester_id = p.semester_id
FROM public.profiles p
WHERE ci.semester_id IS NULL
  AND ci.user_id = p.id
  AND p.semester_id IS NOT NULL;

-- 3. Drop any remaining unresolvable rows.
DELETE FROM public.check_ins WHERE semester_id IS NULL;

-- 4. Enforce NOT NULL now that every row has a value.
ALTER TABLE public.check_ins ALTER COLUMN semester_id SET NOT NULL;
