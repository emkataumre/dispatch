-- Enforce a minimum display name length of 2 non-whitespace characters.
-- The signup flow already validates this client-side, and the handle_new_user trigger
-- falls back to the email username prefix. This constraint is the server-side safety net.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_min_length
  CHECK (char_length(trim(display_name)) >= 2);
