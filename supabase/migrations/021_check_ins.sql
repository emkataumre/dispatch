-- Check-ins — immutable append-only log of passive geofence check-ins.
-- No UPDATE or DELETE policies defined — RLS implicitly denies these operations
-- for authenticated client requests. The service_role key bypasses RLS.

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poi_id uuid not null references public.pois(id),
  checked_in_at timestamptz default now(),
  semester_id uuid references public.semesters(id)
);

alter table public.check_ins enable row level security;

create policy "Users can view own check-ins"
  on check_ins for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own check-ins"
  on check_ins for insert to authenticated
  with check (auth.uid() = user_id);
