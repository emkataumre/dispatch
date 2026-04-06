-- Migration: 019_friendship_status_enum
-- Converts the friendships.status column from a TEXT + CHECK constraint to a
-- proper Postgres enum. This makes the Supabase type generator emit a union
-- type ('pending' | 'accepted') instead of plain string, matching the pattern
-- already used by poi_category and visibility_type.

-- Drop policies that reference the status column (required before ALTER TYPE)
DROP POLICY "Users can send friend requests" ON public.friendships;
DROP POLICY "Addressee can accept pending requests" ON public.friendships;

CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');

ALTER TABLE public.friendships
  DROP CONSTRAINT friendships_status_check,
  ALTER COLUMN status TYPE public.friendship_status USING status::public.friendship_status;

-- Recreate policies using the enum type
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');

CREATE POLICY "Addressee can accept pending requests"
  ON public.friendships FOR UPDATE
  USING (addressee_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'accepted' AND addressee_id = auth.uid());
