-- claim_push_token: atomically bind an Expo push token to the current user,
-- evicting any stale binding the same token might have to a different user_id.
--
-- Problem (issue #50): the previous registration path used
--   INSERT ... ON CONFLICT (user_id) DO UPDATE
-- Conflict key was user_id only. On a shared device that signed out of
-- account A (via force-kill / no-network, so clearPushToken never ran) and
-- signed in as B, the row (A, token) stayed in the table. The send-push
-- edge function would then route A's notifications to B's device because
-- B's token lookup returned B's row, but the OS notification arrived at
-- the one device carrying that token. More importantly: pushes aimed at
-- A still hit that device until the row was manually cleaned.
--
-- Fix: a SECURITY DEFINER RPC that in one transaction:
--   1. DELETEs any row owning this token (bypassing RLS via DEFINER) —
--      clears the stale (A, token) binding.
--   2. INSERTs (auth.uid(), token), ON CONFLICT (user_id) UPDATE for the
--      normal same-user re-registration path (token rotation, reinstall).
--
-- RLS implications: the table's policies still protect direct SELECT/
-- DELETE/INSERT/UPDATE from the client. This RPC is the only sanctioned
-- write path; REVOKE from PUBLIC/anon + GRANT to authenticated + an
-- explicit auth.uid() null check form defense in depth.
--
-- search_path is pinned (public, pg_catalog) per Supabase security lint
-- rule for SECURITY DEFINER functions: prevents a caller from shadowing
-- `push_tokens` via a hostile schema and hijacking the definer privilege.

CREATE OR REPLACE FUNCTION public.claim_push_token(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Step 1: evict any row owning this token that belongs to a DIFFERENT user.
  -- Handles the account-swap case: device previously registered (userA, token);
  -- now userB claims the same token → userA's row must be gone before insert.
  -- The `user_id <> uid` guard skips the same-user re-registration path so it
  -- flows through the ON CONFLICT UPDATE below instead of needless churn.
  DELETE FROM public.push_tokens WHERE expo_push_token = token AND user_id <> uid;

  -- Step 2: bind the token to the caller. ON CONFLICT covers the standard
  -- same-user re-registration path (token rotation, reinstall, re-register
  -- on SIGNED_IN after TOKEN_REFRESHED).
  INSERT INTO public.push_tokens (user_id, expo_push_token)
  VALUES (uid, token)
  ON CONFLICT (user_id)
    DO UPDATE SET expo_push_token = EXCLUDED.expo_push_token,
                  updated_at = now();

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_push_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_push_token(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.claim_push_token(text) TO authenticated;
