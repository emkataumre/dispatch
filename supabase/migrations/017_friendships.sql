-- Migration: 017_friendships
-- Creates the friendships table for Phase 4 friend requests and friends list.
-- Covers: send request, accept, decline, cancel, unfriend.
-- The live_presence friends-only SELECT policy will be updated in a separate
-- migration once this table is in place (see TODO in 011_live_presence.sql).

CREATE TABLE public.friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
);

-- Prevent A→B and B→A from coexisting simultaneously.
-- LEAST/GREATEST normalise the pair so (A,B) and (B,A) map to the same index entry.
CREATE UNIQUE INDEX friendships_pair_unique
  ON public.friendships (
    LEAST(requester_id::text, addressee_id::text),
    GREATEST(requester_id::text, addressee_id::text)
  );

CREATE INDEX friendships_requester_idx ON public.friendships(requester_id);
CREATE INDEX friendships_addressee_idx ON public.friendships(addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: each user sees only friendships they are party to.
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- INSERT: only the requester can insert; status must start as 'pending'.
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');

-- UPDATE: only the addressee may accept; only pending → accepted is allowed.
CREATE POLICY "Addressee can accept pending requests"
  ON public.friendships FOR UPDATE
  USING (addressee_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'accepted' AND addressee_id = auth.uid());

-- DELETE: either party may remove (cancel sent / decline received / unfriend).
CREATE POLICY "Either party can remove a friendship"
  ON public.friendships FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
