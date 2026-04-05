-- Drop and recreate the profiles UPDATE policy to add WITH CHECK (auth.uid() = id).
-- Without WITH CHECK, the USING clause only restricts which rows can be targeted,
-- but doesn't prevent a crafted request from writing a different id value into the row.

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
