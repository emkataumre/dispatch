-- Prevent duplicate check-ins at the same POI by the same user within a
-- 5-minute window. Catches the specific bug where duplicate geofence
-- notifications (from re-registration on cold start) both get confirmed
-- and insert separate rows. The 5-minute window is intentionally narrow —
-- legitimate revisits hours later are unaffected, and the 2h client-side
-- cooldown already covers the wider gap.
--
-- tstzrange() is STABLE in Postgres (timezone-dependent), but the stored
-- checked_in_at is already resolved to UTC, so the wrapper is safe to mark
-- IMMUTABLE for index use.

create extension if not exists btree_gist;

-- Remove existing rapid-fire duplicates before adding the constraint.
-- Keeps the earliest check-in in each (user, poi, 5-min window) group.
delete from public.check_ins
where id in (
  select id from (
    select id,
           row_number() over (
             partition by user_id, poi_id,
                          floor(extract(epoch from checked_in_at) / 300)
             order by checked_in_at asc
           ) as rn
    from public.check_ins
  ) dupes
  where rn > 1
);

create or replace function public.checkin_window(ts timestamptz)
returns tstzrange
language sql
immutable
as $$ select tstzrange(ts, ts + interval '5 minutes') $$;

alter table public.check_ins
  add constraint check_ins_no_rapid_duplicates
  exclude using gist (
    user_id gist_uuid_ops with =,
    poi_id gist_uuid_ops with =,
    checkin_window(checked_in_at) with &&
  );
