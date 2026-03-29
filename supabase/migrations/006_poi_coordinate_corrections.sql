-- Verified coordinate corrections, removals, and multi-location chain expansion.
-- Applied after manual Google Maps verification pass on all 70 seed POIs.
--
-- Summary of changes:
--   - 11 POIs deleted (closed / removed / wrong)
--   - 3 single-entry chain POIs replaced by per-branch entries (6 + 3 + 4 = 13 new)
--   - ~38 POIs updated with verified coordinates
--   - BLOX Café renamed to BLOX EATS
--   - Frederiksberg Have moved from study_spots → culture

-- ============================================================
-- DELETIONS — closed / removed / wrong POIs (11)
-- ============================================================

DELETE FROM public.pois WHERE id IN (
  '1f7bce4f-ff19-50bc-aefe-50db829dcc01', -- Nørrebro Bryghus (temporarily closed)
  'ab9fb68c-0206-53d2-978f-75544f10c661', -- Blågårds Plads
  'ee146b78-d5b1-570f-95cb-eac5895dbac1', -- Mikkeller Bar
  '575fea65-1138-560d-b6f3-9c1519536293', -- BRUS
  'd40071fd-315c-5215-be97-b6b2b04f8df7', -- Gefährlich (permanently closed)
  '5d6ebd8a-d293-5bea-863e-08a078fdb687', -- Bakken
  'ecc49c62-7c34-5ad0-9754-d21fcc31f16a', -- Bæst
  'c3595efc-7755-5539-a010-d79d2152407f', -- The Corner Frederiksberg
  '5d821002-597f-5672-8162-4a0ead97c687', -- Høst
  '56dc62fb-d2c6-5c00-8ff1-c5b4bd648dbf', -- KB18 (closed)
  '97b0544d-9dd6-5b30-8e49-b4ea703e736e'  -- Café Norden (closed)
);

-- Remove single-entry chain POIs — replaced by per-branch entries below
DELETE FROM public.pois WHERE id IN (
  'c65de986-cf5e-5c75-aefc-0ca923582e3f', -- Gasoline Grill
  '629a1b09-a3a4-59ee-b0f5-ccfb5ac782b0', -- Ramen to Bíiru
  'a82e0642-313d-5d32-b422-b3223b22b12d'  -- Wulff & Konstali
);

-- ============================================================
-- COORDINATE UPDATES
-- ============================================================

-- food_drink
UPDATE public.pois SET lat = 55.6837848, lng = 12.5689280 WHERE id = '2720fc84-f690-5b93-bff8-dc4883cda4e1'; -- Torvehallerne
UPDATE public.pois SET lat = 55.6803712, lng = 12.5732603 WHERE id = 'b35796d8-a452-5176-a7bb-8b06526b6936'; -- Paludan Bog & Café
UPDATE public.pois SET lat = 55.7061815, lng = 12.5792403 WHERE id = 'e4076f99-c3d1-53d6-b1ab-d81d02343a69'; -- Juno the Bakery
UPDATE public.pois SET lat = 55.7005647, lng = 12.5707799 WHERE id = '712be2a9-3b09-57f4-9487-2a3a61196758'; -- Hart Bageri
UPDATE public.pois SET lat = 55.6685024, lng = 12.5599359 WHERE id = '9b905bdb-3ad4-53e4-af78-11eee702bbed'; -- Warpigs
UPDATE public.pois SET lat = 55.6689187, lng = 12.5585193 WHERE id = '0d734e56-4be6-5f4c-a394-3143ca3280cc'; -- Hija de Sanchez
UPDATE public.pois SET lat = 55.6720157, lng = 12.5213242 WHERE id = '83a23304-64e6-5d0a-8b32-bd9eb51dcd2d'; -- Grød
UPDATE public.pois SET lat = 55.6659225, lng = 12.5473387 WHERE id = '871a1350-c84d-5460-9da4-5e9058d51351'; -- Café Dyrehaven

-- BLOX Café → BLOX EATS (rename + coord update)
UPDATE public.pois SET name = 'BLOX EATS', lat = 55.6724588, lng = 12.5607290 WHERE id = 'ea944ac5-8917-5ee5-a617-97aeac73fd05';

-- nightlife
UPDATE public.pois SET lat = 55.6935198, lng = 12.5440928 WHERE id = '17696b38-b3dd-537a-b967-5c5635969778'; -- Rust
UPDATE public.pois SET lat = 55.6687202, lng = 12.5388697 WHERE id = 'f07f4dfa-82a1-587d-8135-84882e58597c'; -- VEGA
UPDATE public.pois SET lat = 55.6863855, lng = 12.5814179 WHERE id = '37e496c1-7579-5490-a23e-d9f8f49888ce'; -- Culture Box
UPDATE public.pois SET lat = 55.6728044, lng = 12.5516122 WHERE id = '13b22126-f096-5146-aa30-a7f32f991fb7'; -- Lidkoeb
UPDATE public.pois SET lat = 55.6800628, lng = 12.5758287 WHERE id = '038d42c6-48a6-5189-9b3f-a177148c2cd8'; -- The Jane
UPDATE public.pois SET lat = 55.6673056, lng = 12.5586417 WHERE id = '4dd38765-6d58-5f57-b45c-498500683f96'; -- Jolene Bar

-- culture
UPDATE public.pois SET lat = 55.6888127, lng = 12.5783303 WHERE id = 'f68be660-7e44-5a66-96dd-894afa177a09'; -- SMK – National Gallery of Denmark
UPDATE public.pois SET lat = 55.6858274, lng = 12.5772687 WHERE id = '7de7e799-5bf4-5e11-b7a3-041876802823'; -- Rosenborg Castle
UPDATE public.pois SET lat = 55.6813470, lng = 12.5757299 WHERE id = 'ab532da9-e475-5ba4-9919-4aacc86d1a87'; -- The Round Tower
UPDATE public.pois SET lat = 55.6779626, lng = 12.5948863 WHERE id = '6f93f603-864b-552e-aba4-7f3769d6cde2'; -- Freetown Christiania
UPDATE public.pois SET lat = 55.6866743, lng = 12.5914013 WHERE id = '12745095-b655-5973-98d5-fcd0ff205106'; -- Designmuseum Danmark
UPDATE public.pois SET lat = 55.6874652, lng = 12.5767806 WHERE id = '1bf00cf6-e6d6-5ec0-a90f-997b099e0f1b'; -- Natural History Museum of Denmark
UPDATE public.pois SET lat = 55.6849043, lng = 12.5733926 WHERE id = 'ef5963d1-117a-52ef-a888-301cf4f47741'; -- Botanical Garden Copenhagen
UPDATE public.pois SET lat = 55.6733994, lng = 12.5800839 WHERE id = '0544ad93-87aa-54a5-86d0-4949793eb3ff'; -- The Black Diamond
UPDATE public.pois SET lat = 55.6695374, lng = 12.5216282 WHERE id = '1847631d-318a-5210-b367-68a2e8ad6505'; -- Cisternerne

-- Frederiksberg Have: study_spots → culture + coord update
UPDATE public.pois SET category = 'culture', lat = 55.6719876, lng = 12.5146197 WHERE id = '1f9f3990-20ae-52d3-923f-70403b70ea49';

-- study_spots
UPDATE public.pois SET lat = 55.6809067, lng = 12.5736671 WHERE id = 'd20cddb1-c03d-5737-a180-b2ee63abd1b2'; -- Copenhagen Central Library
UPDATE public.pois SET lat = 55.6811862, lng = 12.5762561 WHERE id = 'effbceab-04c0-5d27-9ea5-9f502bd92d26'; -- Studenterhuset
UPDATE public.pois SET lat = 55.6653981, lng = 12.5502979 WHERE id = 'de1c936d-42ff-5635-88a5-37e7c3569216'; -- Absalon
UPDATE public.pois SET lat = 55.6675548, lng = 12.5482188 WHERE id = '661ebac4-1fc9-5412-8616-1fd9233376c6'; -- Riccos Kaffebar Istedgade
UPDATE public.pois SET lat = 55.6682905, lng = 12.5575308 WHERE id = '49bc569d-3013-5e47-bab7-a2fdb36c5d90'; -- Prolog Coffee Bar
UPDATE public.pois SET lat = 55.6810135, lng = 12.5669485 WHERE id = 'c9e2c754-3d5e-5910-9b89-87077f9dade0'; -- Ørstedsparken
UPDATE public.pois SET lat = 55.6788341, lng = 12.5742518 WHERE id = '008179de-5535-5f38-8b0c-375195944af8'; -- Jorcks Passage
UPDATE public.pois SET lat = 55.6842082, lng = 12.5706178 WHERE id = '7463d3e1-d358-5fd2-bd27-86f97be4c072'; -- Espresso House Nørreport

-- hidden_gems
UPDATE public.pois SET lat = 55.6913760, lng = 12.5943010 WHERE id = 'dacadbe0-c321-5e99-aa80-0455622e0291'; -- Kastellet
UPDATE public.pois SET lat = 55.6824450, lng = 12.5963859 WHERE id = '3f8db6f2-fdbe-5662-873c-0382cf50baae'; -- Ofelia Beach
UPDATE public.pois SET lat = 55.6959674, lng = 12.5407031 WHERE id = '0fcf23be-1d96-55bb-8362-5bfc3e09c77b'; -- Nørrebro Park
UPDATE public.pois SET lat = 55.7174179, lng = 12.5067223 WHERE id = 'e56a38f5-c707-5fe6-b26e-6a67ed07d807'; -- Utterslev Mose
UPDATE public.pois SET lat = 55.6791439, lng = 12.5689981 WHERE id = '7b16e8c0-f567-5dba-8f2b-df34200064c7'; -- Sankt Peders Stræde

-- ============================================================
-- NEW ENTRIES — Gasoline Grill (6 branches)
-- UUIDs: UUID v5, namespace 9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d
-- ============================================================

INSERT INTO public.pois (id, name, description, category, lat, lng) VALUES
(
  'ac9a60b2-8ce2-5797-b238-d018e6a390ab',
  'Gasoline Grill – Landgreven',
  'The original Gasoline Grill — a converted petrol station in Indre By. Copenhagen''s best smash burger. Simple menu, long queues, absolutely worth it.',
  'food_drink', 55.6832420, 12.5851505
),
(
  'c4282145-c2bd-535d-9c4b-4b5759943b42',
  'Gasoline Grill – Købmagergade',
  'The Latin Quarter branch of Copenhagen''s best smash burger. Convenient stop between Nørreport and Strøget.',
  'food_drink', 55.6801553, 12.5787120
),
(
  '846b9b25-f7b2-5afb-af58-8dfe935540cf',
  'Gasoline Grill – Carlsberg Byen',
  'The Carlsberg Byen branch. Great if you''re exploring the western end of the city or heading to Frederiksberg.',
  'food_drink', 55.6669411, 12.5327256
),
(
  '6bb25681-4622-5f15-95e1-4973a1197c89',
  'Gasoline Grill – Værnedamsvej',
  'The Vesterbro branch, right on the food street Værnedamsvej. Good spot after browsing the neighbourhood.',
  'food_drink', 55.6729988, 12.5501228
),
(
  '46ab1c00-fbf9-586d-a788-6fef65b3c5c7',
  'Gasoline Grill – Hellerup',
  'The Hellerup branch up on Strandvejen. Useful to know if you''re heading north toward Dyrehaven or the coast.',
  'food_drink', 55.7370735, 12.5751391
),
(
  '0691610f-7206-5a09-9c70-c9b7027239a8',
  'Gasoline Grill – Parken',
  'The Østerbro branch next to Parken stadium. Convenient after a game or a walk through Fælledparken.',
  'food_drink', 55.7027517, 12.5706942
);

-- ============================================================
-- NEW ENTRIES — Ramen to Bíiru (3 branches)
-- ============================================================

INSERT INTO public.pois (id, name, description, category, lat, lng) VALUES
(
  '9aced5d4-1e65-5eee-9984-bef68deb0fb1',
  'Ramen to Bíiru – Vesterbro',
  'The original Vesterbro location. Small, buzzy spot serving solid tonkotsu and shoyu ramen alongside Japanese craft beer.',
  'food_drink', 55.6656402, 12.5429552
),
(
  '2f3cc53b-40af-5ec6-9792-fa113538d59e',
  'Ramen to Bíiru – Østerbro',
  'The Østerbro branch — same great ramen and Japanese craft beer, in the calmer neighbourhood north of the centre.',
  'food_drink', 55.7017331, 12.5810013
),
(
  '4989abfe-153f-5a02-9244-65a38f1f8dc5',
  'Ramen to Bíiru – Frederiksberg',
  'The Frederiksberg branch of the beloved ramen spot. A reliable bowl on the quieter west side of the city.',
  'food_drink', 55.6852382, 12.5288152
);

-- ============================================================
-- NEW ENTRIES — Wulff & Konstali (4 branches)
-- ============================================================

INSERT INTO public.pois (id, name, description, category, lat, lng) VALUES
(
  '08ecf560-0c96-519a-8a36-95aa7b4b4b90',
  'Wulff & Konstali – Amager Ø',
  'The Amager Ø branch of the beloved deli chain. Great smørrebrød and a well-curated selection of cheese and charcuterie.',
  'food_drink', 55.6643377, 12.6260591
),
(
  '47d027b6-0fac-5889-b310-cf4bc72d514c',
  'Wulff & Konstali – Vesterbro',
  'The Vesterbro branch — excellent smørrebrød, great cheese counter, and a reliable lunch spot in the neighbourhood.',
  'food_drink', 55.6653934, 12.5480085
),
(
  '1ba30c5e-932f-5481-b304-905b497801b0',
  'Wulff & Konstali – Nordhavn',
  'The Nordhavn branch, out in the new harbour district. A good lunch stop if you''re exploring that part of the city.',
  'food_drink', 55.7075368, 12.5944392
),
(
  'a00d8e17-05f9-5a8c-bf04-12719bf4dec4',
  'Wulff & Konstali – Islands Brygge',
  'The Islands Brygge branch — great smørrebrød and charcuterie right by the harbour.',
  'food_drink', 55.6654434, 12.5781242
);
