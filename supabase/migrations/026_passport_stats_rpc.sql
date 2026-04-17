-- Aggregate passport stats server-side to avoid unbounded check_ins fetches.
-- Returns total_check_ins, unique_pois, and most_visited_poi_id for the
-- caller's active semester. Runs as SECURITY INVOKER so RLS on check_ins
-- is enforced automatically — no explicit user_id filter needed.
--
-- Tiebreak: when two POIs share the same visit count, the one with the
-- most recent check-in wins (max(checked_in_at) desc).

create or replace function public.get_passport_stats()
returns table (
  total_check_ins int,
  unique_pois      int,
  most_visited_poi_id uuid
)
language sql
security invoker
stable
as $$
  with user_semester as (
    select semester_id from public.profiles where id = auth.uid()
  ),
  semester_check_ins as (
    select poi_id, checked_in_at
    from public.check_ins
    where semester_id = (select semester_id from user_semester)
  ),
  totals as (
    select
      count(*)::int          as total_check_ins,
      count(distinct poi_id)::int as unique_pois
    from semester_check_ins
  ),
  top_poi as (
    select poi_id
    from semester_check_ins
    group by poi_id
    order by count(*) desc, max(checked_in_at) desc
    limit 1
  )
  select
    t.total_check_ins,
    t.unique_pois,
    p.poi_id as most_visited_poi_id
  from totals t
  left join top_poi p on true
$$;
