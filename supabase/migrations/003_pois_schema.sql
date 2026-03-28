-- ============================================================
-- 1. Dispatch system account
--    UUID: 00000000-0000-0000-0000-000000000001
--    Used as the default created_by for all seeded POIs.
--    The handle_new_user trigger fires automatically and creates
--    the matching profiles row — no manual insert needed.
-- ============================================================

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'system@dispatch.local',
  '',
  now(),
  'authenticated',
  'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Dispatch"}',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 2. poi_category ENUM
-- ============================================================

CREATE TYPE public.poi_category AS ENUM (
  'food_drink',
  'nightlife',
  'culture',
  'study_spots',
  'hidden_gems'
);


-- ============================================================
-- 3. pois table
--    - id: hardcoded UUID v5 values in seed migration (004).
--      No gen_random_uuid() default — explicit IDs required so
--      geofence identifiers (poi.id::poi.name) are stable and
--      idempotent across re-registrations.
--    - created_by: defaults to Dispatch system account for seeded
--      POIs. User-created POIs (V2) pass the real user UUID.
-- ============================================================

CREATE TABLE public.pois (
  id          uuid PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL,
  category    public.poi_category NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL
              DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.pois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "POIs viewable by authenticated users"
  ON public.pois FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own POIs (V2 user-created POI feature).
-- WITH CHECK ensures they can only insert POIs attributed to themselves.
CREATE POLICY "Users can insert own POIs"
  ON public.pois FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE INDEX idx_pois_category ON public.pois (category);


-- ============================================================
-- 4. poi_ratings table
--    - No UPDATE policy: rating change = delete + reinsert.
--    - UNIQUE(user_id, poi_id) enforces one rating per user per POI.
-- ============================================================

CREATE TABLE public.poi_ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id     uuid NOT NULL REFERENCES public.pois(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_poi_ratings_user_poi UNIQUE (user_id, poi_id)
);

ALTER TABLE public.poi_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings viewable by authenticated users"
  ON public.poi_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own ratings"
  ON public.poi_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON public.poi_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_poi_ratings_poi_id ON public.poi_ratings (poi_id);
