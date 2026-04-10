-- Ensure every check-in has a timestamp. The column already defaults to now(),
-- but without NOT NULL a crafted insert could omit it. Backfill any NULLs first.

update public.check_ins set checked_in_at = now() where checked_in_at is null;
alter table public.check_ins alter column checked_in_at set not null;
