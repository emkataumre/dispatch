-- Tighten push_tokens.expo_push_token CHECK constraint.
--
-- The original (migration 033) regex only validated the prefix:
--   ^Expo(nent)?PushToken\[
-- This accepts malformed values like "ExpoPushToken[" or "ExpoPushToken[<injected>"
-- (no body, no closing bracket). While tokens are forwarded verbatim to Expo
-- and rejected there, the DB constraint is the last line of defense and
-- should validate the full shape.
--
-- New regex anchors both ends and requires a non-empty body of URL-safe
-- base64 characters (Expo tokens use the alphabet [A-Za-z0-9_-]):
--   ^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$
--
-- Verified pre-migration: SELECT count(*) FROM push_tokens WHERE token !~ new_regex → 0.

ALTER TABLE public.push_tokens
  DROP CONSTRAINT push_tokens_expo_push_token_check;

ALTER TABLE public.push_tokens
  ADD CONSTRAINT push_tokens_expo_push_token_check
  CHECK (expo_push_token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$');
