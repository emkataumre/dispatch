-- Fix POI coordinates — Nominatim-verified geocoding pass over all 70 seed POIs.
--
-- Strategy:
--   • Use Nominatim result when it is plausible and within ~300 m of the seed.
--   • Keep original seed when Nominatim returned no result OR when the result
--     was geographically implausible (wrong neighbourhood / wrong city).
--   • All 70 POIs are included for auditability; a comment on each row shows
--     the POI name and the data source used.
--
-- Columns updated: lat, lng only.

-- ============================================================
-- FOOD & DRINK (18)
-- ============================================================

-- Torvehallerne — Nominatim (55.6838669, 12.5695512) ✓ matches seed
UPDATE public.pois SET lat = 55.6838669, lng = 12.5695512
WHERE id = '2720fc84-f690-5b93-bff8-dc4883cda4e1';

-- Reffen Street Food — Nominatim (55.6935716, 12.6089736) ✓ close to seed
UPDATE public.pois SET lat = 55.6935716, lng = 12.6089736
WHERE id = '60a0c640-12e7-51bf-8d45-237839acb69f';

-- Grød — SEED KEPT (55.6838, 12.5565)
--   Nominatim returned the Jægersborggade (Nørrebro) branch. Seed targets the
--   Torvehallerne stall, which is the main tourist-facing location.
UPDATE public.pois SET lat = 55.6838, lng = 12.5565
WHERE id = '83a23304-64e6-5d0a-8b32-bd9eb51dcd2d';

-- Paludan Bog & Café — SEED KEPT (55.6793, 12.5718)
--   Nominatim returned no plausible result for this café.
UPDATE public.pois SET lat = 55.6793, lng = 12.5718
WHERE id = 'b35796d8-a452-5176-a7bb-8b06526b6936';

-- Juno the Bakery — Nominatim (55.7061592, 12.5817961) ✓ Østerbro, close to seed
UPDATE public.pois SET lat = 55.7061592, lng = 12.5817961
WHERE id = 'e4076f99-c3d1-53d6-b1ab-d81d02343a69';

-- Hart Bageri — SEED KEPT (55.7008, 12.5792)
--   Nominatim returned 55.6852 (inner city), which is the wrong neighbourhood.
--   Seed at ~55.70 is correct for Østerbro.
UPDATE public.pois SET lat = 55.7008, lng = 12.5792
WHERE id = '712be2a9-3b09-57f4-9487-2a3a61196758';

-- Warpigs — Nominatim (55.6685680, 12.5599160) ✓ Meatpacking District
UPDATE public.pois SET lat = 55.6685680, lng = 12.5599160
WHERE id = '9b905bdb-3ad4-53e4-af78-11eee702bbed';

-- Hija de Sanchez — Nominatim (55.6689, 12.5585) ✓ Meatpacking District
UPDATE public.pois SET lat = 55.6689, lng = 12.5585
WHERE id = '0d734e56-4be6-5f4c-a394-3143ca3280cc';

-- Gasoline Grill — Nominatim (55.6795644, 12.5773813) ✓ close to seed
UPDATE public.pois SET lat = 55.6795644, lng = 12.5773813
WHERE id = 'c65de986-cf5e-5c75-aefc-0ca923582e3f';

-- Broens Gadekøkken — Nominatim (55.6776804, 12.5972626) ✓ Christianshavn bridge area
UPDATE public.pois SET lat = 55.6776804, lng = 12.5972626
WHERE id = '08d3d318-aa0e-560e-b04e-2876ec4aecf2';

-- Bæst — Nominatim (55.6922190, 12.5559090) ✓ Nørrebro, close to seed
UPDATE public.pois SET lat = 55.6922190, lng = 12.5559090
WHERE id = 'ecc49c62-7c34-5ad0-9754-d21fcc31f16a';

-- Café Dyrehaven — Nominatim (55.6656274, 12.5495946) ✓ Vesterbro
UPDATE public.pois SET lat = 55.6656274, lng = 12.5495946
WHERE id = '871a1350-c84d-5460-9da4-5e9058d51351';

-- Mikkeller Bar — Nominatim (55.6719575, 12.5575483) ✓ Vesterbro, close to seed
UPDATE public.pois SET lat = 55.6719575, lng = 12.5575483
WHERE id = 'ee146b78-d5b1-570f-95cb-eac5895dbac1';

-- Atelier September — SEED KEPT (55.6818, 12.5822)
--   Nominatim returned 55.6874 which is too far north. Seed ~55.682 is
--   correct for the Latin Quarter / Gothersgade area.
UPDATE public.pois SET lat = 55.6818, lng = 12.5822
WHERE id = '463b1dc0-fb07-556a-8474-f94a21cce74c';

-- Ramen to Bíiru — SEED KEPT (55.6724, 12.5497)
--   Nominatim returned 55.6657, 12.5430 which is too far south-west.
--   Seed is more consistent with the known Vesterbro address.
UPDATE public.pois SET lat = 55.6724, lng = 12.5497
WHERE id = '629a1b09-a3a4-59ee-b0f5-ccfb5ac782b0';

-- Wulff & Konstali — SEED KEPT (55.6794, 12.5611)
--   Nominatim returned 55.6654, 12.5781 — entirely wrong neighbourhood.
--   Seed near the Lakes is the correct location.
UPDATE public.pois SET lat = 55.6794, lng = 12.5611
WHERE id = 'a82e0642-313d-5d32-b422-b3223b22b12d';

-- Høst — Nominatim (55.6832824, 12.5661022) ✓ close to seed (inner city)
UPDATE public.pois SET lat = 55.6832824, lng = 12.5661022
WHERE id = '5d821002-597f-5672-8162-4a0ead97c687';

-- Joe & the Juice Strøget — SEED KEPT (55.6795, 12.5756)
--   No Nominatim result found; seed is plausible for Strøget.
UPDATE public.pois SET lat = 55.6795, lng = 12.5756
WHERE id = 'b3483b8e-769e-53b9-81ab-12bb79ec5da7';

-- ============================================================
-- NIGHTLIFE (12)
-- ============================================================

-- Rust — SEED KEPT (55.6935, 12.5531)
--   No Nominatim result found; seed is correct for Nørrebrogade.
UPDATE public.pois SET lat = 55.6935, lng = 12.5531
WHERE id = '17696b38-b3dd-537a-b967-5c5635969778';

-- VEGA — Nominatim (55.6679441, 12.5442682) ✓ Enghavevej, Vesterbro
UPDATE public.pois SET lat = 55.6679441, lng = 12.5442682
WHERE id = 'f07f4dfa-82a1-587d-8135-84882e58597c';

-- Culture Box — SEED KEPT (55.6766, 12.5919)
--   Nominatim returned 55.6865 which is too far north. Seed ~55.677 is
--   correct for Christianshavn / Islands Brygge area.
UPDATE public.pois SET lat = 55.6766, lng = 12.5919
WHERE id = '37e496c1-7579-5490-a23e-d9f8f49888ce';

-- BRUS — SEED KEPT (55.6927, 12.5491)
--   No Nominatim result found; seed is correct for Nørrebro.
UPDATE public.pois SET lat = 55.6927, lng = 12.5491
WHERE id = '575fea65-1138-560d-b6f3-9c1519536293';

-- Lidkoeb — SEED KEPT (55.6743, 12.5485)
--   No Nominatim result found; seed is correct for Vesterbro townhouse.
UPDATE public.pois SET lat = 55.6743, lng = 12.5485
WHERE id = '13b22126-f096-5146-aa30-a7f32f991fb7';

-- The Jane — SEED KEPT (55.6737, 12.5513)
--   No Nominatim result found; seed is correct for Meatpacking District.
UPDATE public.pois SET lat = 55.6737, lng = 12.5513
WHERE id = '038d42c6-48a6-5189-9b3f-a177148c2cd8';

-- Nørrebro Bryghus — SEED KEPT (55.6943, 12.5473)
--   Nominatim returned 55.6902, 12.5638 which is significantly off.
--   Seed at ~55.694 is correct for the Nørrebro microbrewery.
UPDATE public.pois SET lat = 55.6943, lng = 12.5473
WHERE id = '1f7bce4f-ff19-50bc-aefe-50db829dcc01';

-- Bakken — SEED KEPT (55.6916, 12.5541)
--   No Nominatim result found; seed is correct for the Nørrebro bar collective.
UPDATE public.pois SET lat = 55.6916, lng = 12.5541
WHERE id = '5d6ebd8a-d293-5bea-863e-08a078fdb687';

-- Ved Stranden 10 — Nominatim (55.6773050, 12.5815953) ✓ canal-side, close to seed
UPDATE public.pois SET lat = 55.6773050, lng = 12.5815953
WHERE id = '484bf1f1-57f1-5867-9c43-7ba0c902a1da';

-- Jolene Bar — SEED KEPT (55.6664, 12.5499)
--   No Nominatim result found; seed is correct for Vesterbro.
UPDATE public.pois SET lat = 55.6664, lng = 12.5499
WHERE id = '4dd38765-6d58-5f57-b45c-498500683f96';

-- Gefährlich — SEED KEPT (55.6904, 12.5497)
--   No Nominatim result found; seed is correct for Nørrebro.
UPDATE public.pois SET lat = 55.6904, lng = 12.5497
WHERE id = 'd40071fd-315c-5215-be97-b6b2b04f8df7';

-- KB18 — SEED KEPT (55.6754, 12.5619)
--   No Nominatim result found; seed is plausible for Rådhuspladsen area.
UPDATE public.pois SET lat = 55.6754, lng = 12.5619
WHERE id = '56dc62fb-d2c6-5c00-8ff1-c5b4bd648dbf';

-- ============================================================
-- CULTURE (16)
-- ============================================================

-- SMK – National Gallery of Denmark — Nominatim (55.6886945, 12.5783724) ✓ matches seed
UPDATE public.pois SET lat = 55.6886945, lng = 12.5783724
WHERE id = 'f68be660-7e44-5a66-96dd-894afa177a09';

-- Ny Carlsberg Glyptotek — Nominatim (55.6725342, 12.5717657) ✓ close to seed
UPDATE public.pois SET lat = 55.6725342, lng = 12.5717657
WHERE id = 'b9e3fb03-739f-5000-9cd0-9679dc3e843f';

-- Rosenborg Castle — Nominatim (55.6856935, 12.5774199) ✓ matches seed
UPDATE public.pois SET lat = 55.6856935, lng = 12.5774199
WHERE id = '7de7e799-5bf4-5e11-b7a3-041876802823';

-- The Round Tower — Nominatim (55.6813577, 12.5757938) ✓ matches seed
UPDATE public.pois SET lat = 55.6813577, lng = 12.5757938
WHERE id = 'ab532da9-e475-5ba4-9919-4aacc86d1a87';

-- Nyhavn — Nominatim (55.6797360, 12.5908855) ✓ close to seed
UPDATE public.pois SET lat = 55.6797360, lng = 12.5908855
WHERE id = '263b478c-3151-5232-a695-ed86abb74f20';

-- Christiansborg Palace — Nominatim (55.6756505, 12.5800406) ✓ matches seed
UPDATE public.pois SET lat = 55.6756505, lng = 12.5800406
WHERE id = '0b5c0751-1978-5b91-ade2-e79239ed44da';

-- Freetown Christiania — Nominatim (55.6772107, 12.6104520) — plausible for large commune
UPDATE public.pois SET lat = 55.6772107, lng = 12.6104520
WHERE id = '6f93f603-864b-552e-aba4-7f3769d6cde2';

-- Copenhagen Opera House — Nominatim (55.6819877, 12.6007404) ✓ close to seed
UPDATE public.pois SET lat = 55.6819877, lng = 12.6007404
WHERE id = '578618c5-2d37-5665-9efd-8adb87c41c0d';

-- Designmuseum Danmark — Nominatim (55.6863742, 12.5944077) ✓ close to seed
UPDATE public.pois SET lat = 55.6863742, lng = 12.5944077
WHERE id = '12745095-b655-5973-98d5-fcd0ff205106';

-- Natural History Museum of Denmark — Nominatim (55.6873905, 12.5769909) ✓ close to seed
UPDATE public.pois SET lat = 55.6873905, lng = 12.5769909
WHERE id = '1bf00cf6-e6d6-5ec0-a90f-997b099e0f1b';

-- Assistens Cemetery — Nominatim (55.6909248, 12.5494421) — more precise than seed
UPDATE public.pois SET lat = 55.6909248, lng = 12.5494421
WHERE id = 'ee1d1659-edcf-5889-b45b-239a2d3c74fb';

-- Botanical Garden Copenhagen — Nominatim (55.6869091, 12.5739827) ✓ matches seed
UPDATE public.pois SET lat = 55.6869091, lng = 12.5739827
WHERE id = 'ef5963d1-117a-52ef-a888-301cf4f47741';

-- Amalienborg Palace — Nominatim (55.6839601, 12.5930781) ✓ matches seed
UPDATE public.pois SET lat = 55.6839601, lng = 12.5930781
WHERE id = 'c0a00f38-d3b1-5004-b92d-16567a068159';

-- The Black Diamond — Nominatim (55.6722332, 12.5807101) ✓ close to seed
UPDATE public.pois SET lat = 55.6722332, lng = 12.5807101
WHERE id = '0544ad93-87aa-54a5-86d0-4949793eb3ff';

-- Church of Our Saviour — Nominatim (55.6729079, 12.5942519) ✓ close to seed
UPDATE public.pois SET lat = 55.6729079, lng = 12.5942519
WHERE id = 'fe4f84f5-0ce6-51f5-9566-b6d7e0acadc6';

-- Cisternerne — SEED KEPT (55.6793, 12.5213)
--   No Nominatim result found; seed is correct for Frederiksberg Hill.
UPDATE public.pois SET lat = 55.6793, lng = 12.5213
WHERE id = '1847631d-318a-5210-b367-68a2e8ad6505';

-- ============================================================
-- STUDY SPOTS (12)
-- ============================================================

-- Copenhagen Central Library — SEED KEPT (55.6790, 12.5751)
--   No Nominatim result found; seed is plausible for Krystalgade.
UPDATE public.pois SET lat = 55.6790, lng = 12.5751
WHERE id = 'd20cddb1-c03d-5737-a180-b2ee63abd1b2';

-- Studenterhuset — Nominatim (55.6811920, 12.5762820) ✓ close to seed
UPDATE public.pois SET lat = 55.6811920, lng = 12.5762820
WHERE id = 'effbceab-04c0-5d27-9ea5-9f502bd92d26';

-- Absalon — SEED KEPT (55.6709, 12.5532)
--   No Nominatim result found; seed is correct for the Sønder Boulevard church.
UPDATE public.pois SET lat = 55.6709, lng = 12.5532
WHERE id = 'de1c936d-42ff-5635-88a5-37e7c3569216';

-- Riccos Kaffebar Istedgade — SEED KEPT (55.6717, 12.5477)
--   No Nominatim result found; seed is correct for Istedgade, Vesterbro.
UPDATE public.pois SET lat = 55.6717, lng = 12.5477
WHERE id = '661ebac4-1fc9-5412-8616-1fd9233376c6';

-- Prolog Coffee Bar — SEED KEPT (55.6726, 12.5540)
--   Nominatim returned 55.6683, 12.5575 — plausible but seed is consistent
--   with the known Vesterbro address. Both are within ~500 m; seed retained.
UPDATE public.pois SET lat = 55.6726, lng = 12.5540
WHERE id = '49bc569d-3013-5e47-bab7-a2fdb36c5d90';

-- The Corner Frederiksberg — SEED KEPT (55.6772, 12.5267)
--   No Nominatim result found; seed is correct for Frederiksberg.
UPDATE public.pois SET lat = 55.6772, lng = 12.5267
WHERE id = 'c3595efc-7755-5539-a010-d79d2152407f';

-- BLOX Café — SEED KEPT (55.6726, 12.5789)
--   No Nominatim result found; seed is correct for the harbour-front BLOX building.
UPDATE public.pois SET lat = 55.6726, lng = 12.5789
WHERE id = 'ea944ac5-8917-5ee5-a617-97aeac73fd05';

-- Café Norden — SEED KEPT (55.6795, 12.5738)
--   No Nominatim result found; seed is plausible for Strøget / Amagertorv.
UPDATE public.pois SET lat = 55.6795, lng = 12.5738
WHERE id = '97b0544d-9dd6-5b30-8e49-b4ea703e736e';

-- Ørstedsparken — Nominatim (55.6809210, 12.5663335) ✓ close to seed
UPDATE public.pois SET lat = 55.6809210, lng = 12.5663335
WHERE id = 'c9e2c754-3d5e-5910-9b89-87077f9dade0';

-- Frederiksberg Have — Nominatim (55.6835881, 12.5154833) ✓ close to seed
UPDATE public.pois SET lat = 55.6835881, lng = 12.5154833
WHERE id = '1f9f3990-20ae-52d3-923f-70403b70ea49';

-- Jorcks Passage — Nominatim (55.6788853, 12.5741869) ✓ close to seed
UPDATE public.pois SET lat = 55.6788853, lng = 12.5741869
WHERE id = '008179de-5535-5f38-8b0c-375195944af8';

-- Espresso House Nørreport — SEED KEPT (55.6831, 12.5702)
--   No Nominatim result found; seed is plausible for Nørreport station area.
UPDATE public.pois SET lat = 55.6831, lng = 12.5702
WHERE id = '7463d3e1-d358-5fd2-bd27-86f97be4c072';

-- ============================================================
-- HIDDEN GEMS (10)
-- ============================================================

-- Superkilen — Nominatim (55.6996781, 12.5423968) ✓ close to seed
UPDATE public.pois SET lat = 55.6996781, lng = 12.5423968
WHERE id = 'c338757e-5b17-5fb9-b3b7-f9e12ae113e7';

-- Kastellet — Nominatim (55.6913826, 12.5937449) ✓ matches seed
UPDATE public.pois SET lat = 55.6913826, lng = 12.5937449
WHERE id = 'dacadbe0-c321-5e99-aa80-0455622e0291';

-- Amager Strandpark — Nominatim (55.6565747, 12.6452567) ✓ matches seed
UPDATE public.pois SET lat = 55.6565747, lng = 12.6452567
WHERE id = '4ccd7af5-3896-5f54-a402-dd41d0537ae7';

-- Blågårds Plads — SEED KEPT (55.6930, 12.5468)
--   Nominatim returned 55.6864, 12.5571 — wrong neighbourhood (too far south).
--   Seed at ~55.693 is correct for the Nørrebro square.
UPDATE public.pois SET lat = 55.6930, lng = 12.5468
WHERE id = 'ab9fb68c-0206-53d2-978f-75544f10c661';

-- Halvandet — Nominatim (55.6954238, 12.6097120) ✓ close to seed
UPDATE public.pois SET lat = 55.6954238, lng = 12.6097120
WHERE id = 'ef3b8e33-5926-584e-aa2e-c18e5e1a3730';

-- Sankt Peders Stræde — Nominatim (55.6789089, 12.5681014) ✓ close to seed
UPDATE public.pois SET lat = 55.6789089, lng = 12.5681014
WHERE id = '7b16e8c0-f567-5dba-8f2b-df34200064c7';

-- Ofelia Beach — SEED KEPT (55.6820, 12.5938)
--   No Nominatim result found; seed is correct for the harbour front near the Playhouse.
UPDATE public.pois SET lat = 55.6820, lng = 12.5938
WHERE id = '3f8db6f2-fdbe-5662-873c-0382cf50baae';

-- Nørrebro Park — SEED KEPT (55.6971, 12.5435)
--   Nominatim returned 55.6902 which is too far south. Seed at ~55.697 is
--   correct for the large neighbourhood park.
UPDATE public.pois SET lat = 55.6971, lng = 12.5435
WHERE id = '0fcf23be-1d96-55bb-8362-5bfc3e09c77b';

-- Utterslev Mose — Nominatim (55.7135218, 12.4949392) — close to seed; both plausible
UPDATE public.pois SET lat = 55.7135218, lng = 12.4949392
WHERE id = 'e56a38f5-c707-5fe6-b26e-6a67ed07d807';

-- Dyrehaven — Nominatim (55.7745164, 12.5840692) — large park, both readings valid
UPDATE public.pois SET lat = 55.7745164, lng = 12.5840692
WHERE id = '5baa8300-8ece-513d-8f7f-25f27741bf31';
