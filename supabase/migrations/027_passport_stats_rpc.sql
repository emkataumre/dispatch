-- Server-side aggregation for the passport stats screen.
--
-- SECURITY INVOKER means the function runs as the calling user so the
-- check_ins RLS policy (auth.uid() = user_id) is enforced automatically
-- without any additional filter.
--
-- Always returns exactly one row; most_visited_poi_id is NULL when the user
-- has zero check-ins in the active semester.
create or replace function public.get_passport_stats()
returns table (
  total_check_ins     bigint,
  unique_pois         bigint,
  most_visited_poi_id uuid
)
language sql
security invoker
stable
as $$
  with active_semester_id as (
    select semester_id
    from   public.profiles
    where  id = auth.uid()
  ),
  my_checkins as (
    select poi_id, checked_in_at
    from   public.check_ins
    where  user_id    = auth.uid()
      and  semester_id = (select semester_id from active_semester_id)
  ),
  poi_visit_counts as (
    select
      poi_id,
      count(*)           as visit_count,
      max(checked_in_at) as last_visit
    from   my_checkins
    group  by poi_id
  ),
  top_poi as (
    select poi_id
    from   poi_visit_counts
    order  by visit_count desc, last_visit desc
    limit  1
  )
  select
    (select count(*)              from my_checkins) as total_check_ins,
    (select count(distinct poi_id) from my_checkins) as unique_pois,
    (select poi_id                from top_poi)      as most_visited_poi_id
$$;

grant execute on function public.get_passport_stats() to authenticated;
