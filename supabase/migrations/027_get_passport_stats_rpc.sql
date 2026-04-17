-- Aggregates per-semester passport stats for the authenticated user.
-- Returns exactly one row regardless of check-in count (aggregate over empty set
-- yields 0s and NULLs rather than zero rows).
--
-- Uses auth.uid() directly so callers cannot query another user's data.
-- SECURITY INVOKER ensures RLS on check_ins and pois is enforced.
-- Returns integer (not bigint) so the JS client receives JS numbers, not strings.

CREATE OR REPLACE FUNCTION public.get_passport_stats(p_semester_id uuid)
RETURNS TABLE(
  total_check_ins integer,
  unique_pois integer,
  most_visited_name text,
  most_visited_count integer
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  WITH counts AS (
    SELECT
      ci.poi_id,
      p.name AS poi_name,
      COUNT(*) AS visit_count,
      MAX(ci.checked_in_at) AS last_visit
    FROM check_ins ci
    JOIN pois p ON p.id = ci.poi_id
    WHERE ci.user_id = auth.uid()
      AND ci.semester_id = p_semester_id
    GROUP BY ci.poi_id, p.name
  )
  SELECT
    COALESCE(SUM(visit_count), 0)::integer AS total_check_ins,
    COUNT(*)::integer AS unique_pois,
    (SELECT poi_name  FROM counts ORDER BY visit_count DESC, last_visit DESC LIMIT 1) AS most_visited_name,
    (SELECT visit_count::integer FROM counts ORDER BY visit_count DESC, last_visit DESC LIMIT 1) AS most_visited_count
  FROM counts;
$$;

-- Lock down execution to authenticated users only. PostgreSQL grants EXECUTE
-- to PUBLIC by default; anon callers get zeros (auth.uid() = NULL matches no
-- rows), but explicit restriction is cleaner and matches project conventions.
REVOKE EXECUTE ON FUNCTION public.get_passport_stats(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_passport_stats(uuid) TO   authenticated;
