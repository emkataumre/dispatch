-- Copenhagen POI seed data — ~70 DIS-student-relevant locations.
--
-- UUIDs are deterministic UUID v5 values generated with:
--   namespace: 9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d  (DISPATCH_GEOFENCE_NS)
--   name input: exact poi.name string
--
-- This makes geofence identifiers (`${poi.id}::${poi.name}`) stable and
-- idempotent across app restarts — the background check-in task can split
-- on '::' to get the POI name (notification copy) and id (check_in insert)
-- without a network call.
--
-- created_by is omitted — defaults to the Dispatch system account
-- (00000000-0000-0000-0000-000000000001).

INSERT INTO public.pois (id, name, description, category, lat, lng) VALUES

-- ============================================================
-- FOOD & DRINK (18)
-- ============================================================
(
  '2720fc84-f690-5b93-bff8-dc4883cda4e1',
  'Torvehallerne',
  'Copenhagen''s beloved covered food market with two glass halls packed with fresh produce, smørrebrød, coffee, and some of the best food stalls in the city.',
  'food_drink', 55.6835, 12.5694
),
(
  '60a0c640-12e7-51bf-8d45-237839acb69f',
  'Reffen Street Food',
  'Huge outdoor street food market on the waterfront in Refshaleøen — over 50 stalls, craft beer, and a great atmosphere on summer evenings.',
  'food_drink', 55.6923, 12.6038
),
(
  '83a23304-64e6-5d0a-8b32-bd9eb51dcd2d',
  'Grød',
  'The original porridge restaurant. Don''t knock it — their rye porridge with toppings and their risotto-style bowls are genuinely great.',
  'food_drink', 55.6838, 12.5565
),
(
  'b35796d8-a452-5176-a7bb-8b06526b6936',
  'Paludan Bog & Café',
  'A secondhand bookshop and café in one. Great wifi, long opening hours, and a loyal student following. A DIS classic.',
  'food_drink', 55.6793, 12.5718
),
(
  'e4076f99-c3d1-53d6-b1ab-d81d02343a69',
  'Juno the Bakery',
  'Tiny Østerbro bakery famous for its cardamom buns. Get there early — they sell out fast.',
  'food_drink', 55.7043, 12.5770
),
(
  '712be2a9-3b09-57f4-9487-2a3a61196758',
  'Hart Bageri',
  'Richard Hart''s sourdough bakery in Østerbro. Beautiful loaves, pastries, and one of the best croissants in Copenhagen.',
  'food_drink', 55.7008, 12.5792
),
(
  '9b905bdb-3ad4-53e4-af78-11eee702bbed',
  'Warpigs',
  'American-style BBQ brewpub in the Meatpacking District, run in collaboration with 3 Floyds. Excellent brisket and a huge tap list.',
  'food_drink', 55.6657, 12.5507
),
(
  '0d734e56-4be6-5f4c-a394-3143ca3280cc',
  'Hija de Sanchez',
  'Rosio Sanchez''s taqueria in the Meatpacking District. Some of the best tacos in Northern Europe.',
  'food_drink', 55.6651, 12.5504
),
(
  'c65de986-cf5e-5c75-aefc-0ca923582e3f',
  'Gasoline Grill',
  'A converted petrol station serving what many consider Copenhagen''s best smash burger. Simple menu, long queues, worth it.',
  'food_drink', 55.6847, 12.5756
),
(
  '08d3d318-aa0e-560e-b04e-2876ec4aecf2',
  'Broens Gadekøkken',
  'Outdoor street food market under the bridge between Christianshavn and the city. Good vibes and diverse food options.',
  'food_drink', 55.6758, 12.5904
),
(
  'ecc49c62-7c34-5ad0-9754-d21fcc31f16a',
  'Bæst',
  'Nørrebro restaurant known for wood-fired pizza and house-cured charcuterie. The dough is made with organic grains milled on-site.',
  'food_drink', 55.6908, 12.5536
),
(
  '871a1350-c84d-5460-9da4-5e9058d51351',
  'Café Dyrehaven',
  'Laid-back Vesterbro café with a dark, cosy interior. Good for a late afternoon beer or a cheap lunch.',
  'food_drink', 55.6718, 12.5395
),
(
  'ee146b78-d5b1-570f-95cb-eac5895dbac1',
  'Mikkeller Bar',
  'The original Mikkeller bar in Vesterbro. 20 taps of rotating craft beer in a small, always-lively space.',
  'food_drink', 55.6766, 12.5591
),
(
  '463b1dc0-fb07-556a-8474-f94a21cce74c',
  'Atelier September',
  'Minimalist all-day café in the Latin Quarter. Excellent avocado toast and coffee in a bright, Instagram-worthy room.',
  'food_drink', 55.6818, 12.5822
),
(
  '629a1b09-a3a4-59ee-b0f5-ccfb5ac782b0',
  'Ramen to Bíiru',
  'Small Vesterbro spot serving solid tonkotsu and shoyu ramen alongside Japanese craft beer.',
  'food_drink', 55.6724, 12.5497
),
(
  'a82e0642-313d-5d32-b422-b3223b22b12d',
  'Wulff & Konstali',
  'Deli and lunch spot near the lakes. Great smørrebrød and a well-curated selection of cheese and charcuterie.',
  'food_drink', 55.6794, 12.5611
),
(
  '5d821002-597f-5672-8162-4a0ead97c687',
  'Høst',
  'New Nordic restaurant with a beautiful interior made from reclaimed wood. Seasonal tasting menu worth the splurge.',
  'food_drink', 55.6808, 12.5699
),
(
  'b3483b8e-769e-53b9-81ab-12bb79ec5da7',
  'Joe & the Juice Strøget',
  'Reliable quick-stop on Strøget for a juice or coffee between classes. The Tunacado sandwich has a cult following.',
  'food_drink', 55.6795, 12.5756
),

-- ============================================================
-- NIGHTLIFE (12)
-- ============================================================
(
  '17696b38-b3dd-537a-b967-5c5635969778',
  'Rust',
  'Nørrebro''s iconic student venue — live music downstairs, club upstairs. One of the best places to go out on a budget.',
  'nightlife', 55.6935, 12.5531
),
(
  'f07f4dfa-82a1-587d-8135-84882e58597c',
  'VEGA',
  'Copenhagen''s premier live music venue in Vesterbro. Catches major international acts and has a great nightclub on non-concert nights.',
  'nightlife', 55.6699, 12.5510
),
(
  '37e496c1-7579-5490-a23e-d9f8f49888ce',
  'Culture Box',
  'The city''s top dedicated electronic music club. World-class DJs, serious sound system, and a discerning crowd.',
  'nightlife', 55.6766, 12.5919
),
(
  '575fea65-1138-560d-b6f3-9c1519536293',
  'BRUS',
  'To Øl''s taproom and restaurant in Nørrebro. 30+ taps of house-brewed and guest beers in a beautiful converted factory.',
  'nightlife', 55.6927, 12.5491
),
(
  '13b22126-f096-5146-aa30-a7f32f991fb7',
  'Lidkoeb',
  'Sophisticated whisky bar spread across three floors of a Vesterbro townhouse. The rooftop is worth fighting for in summer.',
  'nightlife', 55.6743, 12.5485
),
(
  '038d42c6-48a6-5189-9b3f-a177148c2cd8',
  'The Jane',
  'Stylish cocktail bar in the Meatpacking District. Inventive drinks and a buzzy crowd from Thursday to Saturday.',
  'nightlife', 55.6737, 12.5513
),
(
  '1f7bce4f-ff19-50bc-aefe-50db829dcc01',
  'Nørrebro Bryghus',
  'Nørrebro''s neighbourhood microbrewery. Relaxed vibe, good food, and beer brewed on the premises.',
  'nightlife', 55.6943, 12.5473
),
(
  '5d6ebd8a-d293-5bea-863e-08a078fdb687',
  'Bakken',
  'Nørrebro bar collective housed in an old mechanic''s workshop. Multiple bars and a great courtyard in summer.',
  'nightlife', 55.6916, 12.5541
),
(
  '484bf1f1-57f1-5867-9c43-7ba0c902a1da',
  'Ved Stranden 10',
  'Wine bar right on the canal, steps from Højbro Plads. One of the best spots in the city for a glass of natural wine.',
  'nightlife', 55.6776, 12.5809
),
(
  '4dd38765-6d58-5f57-b45c-498500683f96',
  'Jolene Bar',
  'Divey Vesterbro bar with a great jukebox and cheap drinks. A local favourite that hasn''t changed in years.',
  'nightlife', 55.6664, 12.5499
),
(
  'd40071fd-315c-5215-be97-b6b2b04f8df7',
  'Gefährlich',
  'Nørrebro bar with a small dancefloor, regular DJ nights, and a loyal local crowd. Gets going late.',
  'nightlife', 55.6904, 12.5497
),
(
  '56dc62fb-d2c6-5c00-8ff1-c5b4bd648dbf',
  'KB18',
  'Underground club in a basement near Rådhuspladsen. Techno-focused with a dark, no-frills vibe.',
  'nightlife', 55.6754, 12.5619
),

-- ============================================================
-- CULTURE (16)
-- ============================================================
(
  'f68be660-7e44-5a66-96dd-894afa177a09',
  'SMK – National Gallery of Denmark',
  'Denmark''s largest art museum, with collections spanning 700 years — from Danish Golden Age painting to contemporary installations. Free for under 27s.',
  'culture', 55.6887, 12.5775
),
(
  'b9e3fb03-739f-5000-9cd0-9679dc3e843f',
  'Ny Carlsberg Glyptotek',
  'Stunning museum of ancient and 19th-century art, with an extraordinary collection of French Impressionism and a beautiful winter garden. Free on Sundays.',
  'culture', 55.6749, 12.5699
),
(
  '7de7e799-5bf4-5e11-b7a3-041876802823',
  'Rosenborg Castle',
  '17th-century Renaissance castle in the middle of the city, housing the Danish crown jewels. The gardens are free to walk through.',
  'culture', 55.6858, 12.5779
),
(
  'ab532da9-e475-5ba4-9919-4aacc86d1a87',
  'The Round Tower',
  'A 17th-century tower with a unique equestrian spiral ramp instead of stairs. Climb it for a panoramic view over Copenhagen''s rooftops.',
  'culture', 55.6813, 12.5740
),
(
  '263b478c-3151-5232-a695-ed86abb74f20',
  'Nyhavn',
  'The iconic colourful harbour front. Tourist-heavy but genuinely beautiful — best experienced with a beer from a kiosk sitting on the dock.',
  'culture', 55.6796, 12.5862
),
(
  '0b5c0751-1978-5b91-ade2-e79239ed44da',
  'Christiansborg Palace',
  'The seat of the Danish Parliament, Supreme Court, and the Prime Minister''s office — all on one island. The tower has the best free view in Copenhagen.',
  'culture', 55.6757, 12.5798
),
(
  '6f93f603-864b-552e-aba4-7f3769d6cde2',
  'Freetown Christiania',
  'The famous self-governing commune in Christianshavn. A unique slice of counterculture with galleries, music venues, and architecture unlike anywhere else in Denmark.',
  'culture', 55.6726, 12.5980
),
(
  '578618c5-2d37-5665-9efd-8adb87c41c0d',
  'Copenhagen Opera House',
  'Henning Larsen''s landmark building on the waterfront in Holmen. Free to walk through the foyer, and cheap student rush tickets are available.',
  'culture', 55.6805, 12.5996
),
(
  '12745095-b655-5973-98d5-fcd0ff205106',
  'Designmuseum Danmark',
  'Excellent museum of Danish and international design, applied arts, and decorative arts. The chair collection alone is worth the visit.',
  'culture', 55.6851, 12.5900
),
(
  '1bf00cf6-e6d6-5ec0-a90f-997b099e0f1b',
  'Natural History Museum of Denmark',
  'Classic natural history museum in the University of Copenhagen''s botanical complex. The geological and zoological collections are impressive.',
  'culture', 55.6871, 12.5734
),
(
  'ee1d1659-edcf-5889-b45b-239a2d3c74fb',
  'Assistens Cemetery',
  'Nørrebro''s working cemetery and public park, where Søren Kierkegaard and Hans Christian Andersen are buried. Locals sunbathe and picnic here in summer.',
  'culture', 55.6945, 12.5416
),
(
  'ef5963d1-117a-52ef-a888-301cf4f47741',
  'Botanical Garden Copenhagen',
  'Beautiful 19th-century botanical garden with a historic palm house. Free entry and a great place to decompress between classes.',
  'culture', 55.6868, 12.5718
),
(
  'c0a00f38-d3b1-5004-b92d-16567a068159',
  'Amalienborg Palace',
  'The Danish royal family''s winter residence — four identical Rococo palaces around an octagonal courtyard. Watch the changing of the guard at noon.',
  'culture', 55.6841, 12.5930
),
(
  '0544ad93-87aa-54a5-86d0-4949793eb3ff',
  'The Black Diamond',
  'The Royal Danish Library''s striking black granite extension on the waterfront. Beautiful architecture, a great reading room, and free exhibitions.',
  'culture', 55.6729, 12.5821
),
(
  'fe4f84f5-0ce6-51f5-9566-b6d7e0acadc6',
  'Church of Our Saviour',
  'Baroque church in Christianshavn with a corkscrew spire you can climb for spectacular views. One of Copenhagen''s best photo spots.',
  'culture', 55.6737, 12.5929
),
(
  '1847631d-318a-5210-b367-68a2e8ad6505',
  'Cisternerne',
  'An underground exhibition space inside a historic cistern beneath Frederiksberg Hill. Eerie, atmospheric, and unlike any gallery you''ve been to.',
  'culture', 55.6793, 12.5213
),

-- ============================================================
-- STUDY SPOTS (12)
-- ============================================================
(
  'd20cddb1-c03d-5737-a180-b2ee63abd1b2',
  'Copenhagen Central Library',
  'The main public library on Krystalgade — quiet floors, good wifi, and free to use. Open late on weekdays.',
  'study_spots', 55.6790, 12.5751
),
(
  'effbceab-04c0-5d27-9ea5-9f502bd92d26',
  'Studenterhuset',
  'Student-run culture house near the university with cheap coffee, a canteen, and a relaxed atmosphere. Open to all students.',
  'study_spots', 55.6821, 12.5716
),
(
  'de1c936d-42ff-5635-88a5-37e7c3569216',
  'Absalon',
  'A former church turned community hub in Vesterbro. Massive, open space with communal tables and cheap food. Surprisingly good for focused work.',
  'study_spots', 55.6709, 12.5532
),
(
  '661ebac4-1fc9-5412-8616-1fd9233376c6',
  'Riccos Kaffebar Istedgade',
  'Small, serious coffee bar on Istedgade. No distractions, great espresso, and enough ambient noise to stay focused.',
  'study_spots', 55.6717, 12.5477
),
(
  '49bc569d-3013-5e47-bab7-a2fdb36c5d90',
  'Prolog Coffee Bar',
  'Specialty coffee bar in Vesterbro with a minimal aesthetic and a calm atmosphere. A favourite of the city''s remote-working crowd.',
  'study_spots', 55.6726, 12.5540
),
(
  'c3595efc-7755-5539-a010-d79d2152407f',
  'The Corner Frederiksberg',
  'Quiet neighbourhood café in Frederiksberg with reliable wifi and a loyal regular crowd of students and freelancers.',
  'study_spots', 55.6772, 12.5267
),
(
  'ea944ac5-8917-5ee5-a617-97aeac73fd05',
  'BLOX Café',
  'The café inside BLOX — the Danish Architecture Centre by the harbour. Good coffee, design-forward space, and a great view of the canal.',
  'study_spots', 55.6726, 12.5789
),
(
  '97b0544d-9dd6-5b30-8e49-b4ea703e736e',
  'Café Norden',
  'Large, reliable café on Strøget. Good for a solo study session — plenty of seating and central location make it easy to drop in between activities.',
  'study_spots', 55.6795, 12.5738
),
(
  'c9e2c754-3d5e-5910-9b89-87077f9dade0',
  'Ørstedsparken',
  'Peaceful park near Nørreport, popular with students for reading and laptop work on warm days. Has benches, a lake, and good light.',
  'study_spots', 55.6839, 12.5681
),
(
  '1f9f3990-20ae-52d3-923f-70403b70ea49',
  'Frederiksberg Have',
  'Romantic English-style park surrounding Frederiksberg Palace. Quiet, green, and far enough from the centre that it never feels crowded.',
  'study_spots', 55.6787, 12.5211
),
(
  '008179de-5535-5f38-8b0c-375195944af8',
  'Jorcks Passage',
  'A covered arcade near Strøget with a few quiet café seats and a surprisingly calm atmosphere given how central it is.',
  'study_spots', 55.6794, 12.5725
),
(
  '7463d3e1-d358-5fd2-bd27-86f97be4c072',
  'Espresso House Nørreport',
  'The Nørreport branch of Denmark''s ubiquitous coffee chain. Not exciting, but consistently reliable for a long session — good seating and strong wifi.',
  'study_spots', 55.6831, 12.5702
),

-- ============================================================
-- HIDDEN GEMS (10)
-- ============================================================
(
  'c338757e-5b17-5fb9-b3b7-f9e12ae113e7',
  'Superkilen',
  'An extraordinary public park in Nørrebro with objects collected from 60 countries, reflecting the neighbourhood''s diverse population. A design landmark.',
  'hidden_gems', 55.6981, 12.5395
),
(
  'dacadbe0-c321-5e99-aa80-0455622e0291',
  'Kastellet',
  'A perfectly preserved 17th-century star fortress that still functions as a military base. The moat, ramparts, and windmill make for a surreal walk.',
  'hidden_gems', 55.6909, 12.5946
),
(
  '4ccd7af5-3896-5f54-a402-dd41d0537ae7',
  'Amager Strandpark',
  'A long artificial beach on Amager, just 15 minutes from the city centre by metro. Popular with students for sun, swimming, and summer evenings.',
  'hidden_gems', 55.6553, 12.6450
),
(
  'ab9fb68c-0206-53d2-978f-75544f10c661',
  'Blågårds Plads',
  'The beating heart of Nørrebro — a lively square surrounded by bars and cafés, with a weekly farmers'' market and constant foot traffic.',
  'hidden_gems', 55.6930, 12.5468
),
(
  'ef3b8e33-5926-584e-aa2e-c18e5e1a3730',
  'Halvandet',
  'A seasonal beach bar on a pier in Refshaleøen. Wooden decking, cold beer, and views of the harbour — one of the city''s best-kept summer secrets.',
  'hidden_gems', 55.6935, 12.6100
),
(
  '7b16e8c0-f567-5dba-8f2b-df34200064c7',
  'Sankt Peders Stræde',
  'A cobblestone street in the Latin Quarter lined with vintage shops, small galleries, and indie cafés. Great for wandering on an afternoon off.',
  'hidden_gems', 55.6783, 12.5706
),
(
  '3f8db6f2-fdbe-5662-873c-0382cf50baae',
  'Ofelia Beach',
  'A small urban beach on the harbour front near the Playhouse. Swim in the harbour, then walk to Nyhavn — it''s genuinely clean water.',
  'hidden_gems', 55.6820, 12.5938
),
(
  '0fcf23be-1d96-55bb-8362-5bfc3e09c77b',
  'Nørrebro Park',
  'A large neighbourhood park in the heart of Nørrebro with sports pitches, a skate area, and a great café. Less polished than the tourist parks, more alive.',
  'hidden_gems', 55.6971, 12.5435
),
(
  'e56a38f5-c707-5fe6-b26e-6a67ed07d807',
  'Utterslev Mose',
  'Three interconnected lakes in the northwest of the city, mostly unknown to tourists. Exceptional bird watching and a proper sense of urban wilderness.',
  'hidden_gems', 55.7161, 12.5180
),
(
  '5baa8300-8ece-513d-8f7f-25f27741bf31',
  'Dyrehaven',
  'A royal deer park just north of Copenhagen with 2,000 free-roaming deer. A 30-minute S-tog ride from the city — a completely different world.',
  'hidden_gems', 55.7860, 12.5710
);
