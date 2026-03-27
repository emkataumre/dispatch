-- Update handle_new_user trigger to auto-assign the currently active semester on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, semester_id)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'display_name',
    (SELECT id FROM public.semesters WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE LIMIT 1)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
