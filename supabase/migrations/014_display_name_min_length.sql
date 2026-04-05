-- Enforce a minimum display name length of 2 non-whitespace characters.
-- The signup flow validates this client-side; this constraint is the server-side safety net.
-- Note: the handle_new_user trigger inserts display_name directly from metadata with no fallback,
-- so client-side validation is the only guard against a null or too-short value reaching the DB.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_min_length
  CHECK (char_length(trim(display_name)) >= 2);
