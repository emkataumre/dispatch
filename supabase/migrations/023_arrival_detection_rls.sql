-- Allow joiners to confirm their own joins (sets confirmed = true when they arrive)
CREATE POLICY "Joiner can confirm own join"
  ON public.presence_joins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = joiner_user_id)
  WITH CHECK (auth.uid() = joiner_user_id);
