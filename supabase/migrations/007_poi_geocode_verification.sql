-- Full coordinate verification pass — Google Maps automation + manual review.
-- Supersedes coordinate values set in 005 and 006 where they differ.
-- Atelier September removed (user decision).

-- ============================================================
-- DELETION
-- ============================================================

DELETE FROM public.pois WHERE id = '463b1dc0-fb07-556a-8474-f94a21cce74c'; -- Atelier September

-- ============================================================
-- COORDINATE UPDATES
-- ============================================================

-- food_drink
UPDATE public.pois SET lat = 55.6837848, lng = 12.5689280 WHERE id = '2720fc84-f690-5b93-bff8-dc4883cda4e1'; -- Torvehallerne
UPDATE public.pois SET lat = 55.6936333, lng = 12.6082318 WHERE id = '60a0c640-12e7-51bf-8d45-237839acb69f'; -- Reffen Street Food
UPDATE public.pois SET lat = 55.6720157, lng = 12.5213242 WHERE id = '83a23304-64e6-5d0a-8b32-bd9eb51dcd2d'; -- Grød
UPDATE public.pois SET lat = 55.6798752, lng = 12.5733676 WHERE id = 'b35796d8-a452-5176-a7bb-8b06526b6936'; -- Paludan Bog & Café
UPDATE public.pois SET lat = 55.7061815, lng = 12.5818152 WHERE id = 'e4076f99-c3d1-53d6-b1ab-d81d02343a69'; -- Juno the Bakery
UPDATE public.pois SET lat = 55.6790351, lng = 12.5372846 WHERE id = '712be2a9-3b09-57f4-9487-2a3a61196758'; -- Hart Bageri
UPDATE public.pois SET lat = 55.6685024, lng = 12.5599359 WHERE id = '9b905bdb-3ad4-53e4-af78-11eee702bbed'; -- Warpigs
UPDATE public.pois SET lat = 55.6584355, lng = 12.5510930 WHERE id = '0d734e56-4be6-5f4c-a394-3143ca3280cc'; -- Hija de Sanchez
UPDATE public.pois SET lat = 55.6778772, lng = 12.5968088 WHERE id = '08d3d318-aa0e-560e-b04e-2876ec4aecf2'; -- Broens Gadekøkken
UPDATE public.pois SET lat = 55.6656681, lng = 12.5496042 WHERE id = '871a1350-c84d-5460-9da4-5e9058d51351'; -- Café Dyrehaven

-- nightlife
UPDATE public.pois SET lat = 55.6912350, lng = 12.5592894 WHERE id = '17696b38-b3dd-537a-b967-5c5635969778'; -- Rust
UPDATE public.pois SET lat = 55.6681108, lng = 12.5438031 WHERE id = 'f07f4dfa-82a1-587d-8135-84882e58597c'; -- VEGA
UPDATE public.pois SET lat = 55.6863855, lng = 12.5839928 WHERE id = '37e496c1-7579-5490-a23e-d9f8f49888ce'; -- Culture Box
UPDATE public.pois SET lat = 55.6728044, lng = 12.5516122 WHERE id = '13b22126-f096-5146-aa30-a7f32f991fb7'; -- Lidkoeb
UPDATE public.pois SET lat = 55.6800628, lng = 12.5758287 WHERE id = '038d42c6-48a6-5189-9b3f-a177148c2cd8'; -- The Jane
UPDATE public.pois SET lat = 55.6773697, lng = 12.5816522 WHERE id = '484bf1f1-57f1-5867-9c43-7ba0c902a1da'; -- Ved Stranden 10
UPDATE public.pois SET lat = 55.6673056, lng = 12.5612166 WHERE id = '4dd38765-6d58-5f57-b45c-498500683f96'; -- Jolene Bar

-- culture
UPDATE public.pois SET lat = 55.6888127, lng = 12.5783303 WHERE id = 'f68be660-7e44-5a66-96dd-894afa177a09'; -- SMK – National Gallery of Denmark
UPDATE public.pois SET lat = 55.6729800, lng = 12.5725430 WHERE id = 'b9e3fb03-739f-5000-9cd0-9679dc3e843f'; -- Ny Carlsberg Glyptotek
UPDATE public.pois SET lat = 55.6858274, lng = 12.5772687 WHERE id = '7de7e799-5bf4-5e11-b7a3-041876802823'; -- Rosenborg Castle
UPDATE public.pois SET lat = 55.6813470, lng = 12.5757299 WHERE id = 'ab532da9-e475-5ba4-9919-4aacc86d1a87'; -- The Round Tower
UPDATE public.pois SET lat = 55.6797676, lng = 12.5907984 WHERE id = '263b478c-3151-5232-a695-ed86abb74f20'; -- Nyhavn
UPDATE public.pois SET lat = 55.6766975, lng = 12.5772913 WHERE id = '0b5c0751-1978-5b91-ade2-e79239ed44da'; -- Christiansborg Palace
UPDATE public.pois SET lat = 55.6779630, lng = 12.6051861 WHERE id = '6f93f603-864b-552e-aba4-7f3769d6cde2'; -- Freetown Christiania
UPDATE public.pois SET lat = 55.6821758, lng = 12.6000932 WHERE id = '578618c5-2d37-5665-9efd-8adb87c41c0d'; -- Copenhagen Opera House
UPDATE public.pois SET lat = 55.6865563, lng = 12.5928423 WHERE id = '12745095-b655-5973-98d5-fcd0ff205106'; -- Designmuseum Danmark
UPDATE public.pois SET lat = 55.6874652, lng = 12.5767806 WHERE id = '1bf00cf6-e6d6-5ec0-a90f-997b099e0f1b'; -- Natural History Museum of Denmark
UPDATE public.pois SET lat = 55.6910102, lng = 12.5501532 WHERE id = 'ee1d1659-edcf-5889-b45b-239a2d3c74fb'; -- Assistens Cemetery
UPDATE public.pois SET lat = 55.6849043, lng = 12.5733926 WHERE id = 'ef5963d1-117a-52ef-a888-301cf4f47741'; -- Botanical Garden Copenhagen
UPDATE public.pois SET lat = 55.6840588, lng = 12.5930201 WHERE id = 'c0a00f38-d3b1-5004-b92d-16567a068159'; -- Amalienborg Palace
UPDATE public.pois SET lat = 55.6733994, lng = 12.5826588 WHERE id = '0544ad93-87aa-54a5-86d0-4949793eb3ff'; -- The Black Diamond
UPDATE public.pois SET lat = 55.6729387, lng = 12.5942102 WHERE id = 'fe4f84f5-0ce6-51f5-9566-b6d7e0acadc6'; -- Church of Our Saviour
UPDATE public.pois SET lat = 55.6695374, lng = 12.5242031 WHERE id = '1847631d-318a-5210-b367-68a2e8ad6505'; -- Cisternerne
UPDATE public.pois SET lat = 55.6748106, lng = 12.5254766 WHERE id = '1f9f3990-20ae-52d3-923f-70403b70ea49'; -- Frederiksberg Have

-- study_spots
UPDATE public.pois SET lat = 55.6809067, lng = 12.5736671 WHERE id = 'd20cddb1-c03d-5737-a180-b2ee63abd1b2'; -- Copenhagen Central Library
UPDATE public.pois SET lat = 55.6811862, lng = 12.5762561 WHERE id = 'effbceab-04c0-5d27-9ea5-9f502bd92d26'; -- Studenterhuset
UPDATE public.pois SET lat = 55.6653981, lng = 12.5477230 WHERE id = 'de1c936d-42ff-5635-88a5-37e7c3569216'; -- Absalon
UPDATE public.pois SET lat = 55.6675548, lng = 12.5482188 WHERE id = '661ebac4-1fc9-5412-8616-1fd9233376c6'; -- Riccos Kaffebar Istedgade
UPDATE public.pois SET lat = 55.6682891, lng = 12.5390771 WHERE id = '49bc569d-3013-5e47-bab7-a2fdb36c5d90'; -- Prolog Coffee Bar
UPDATE public.pois SET lat = 55.6810135, lng = 12.5669485 WHERE id = 'c9e2c754-3d5e-5910-9b89-87077f9dade0'; -- Ørstedsparken
UPDATE public.pois SET lat = 55.6788341, lng = 12.5742518 WHERE id = '008179de-5535-5f38-8b0c-375195944af8'; -- Jorcks Passage
UPDATE public.pois SET lat = 55.6842082, lng = 12.5680429 WHERE id = '7463d3e1-d358-5fd2-bd27-86f97be4c072'; -- Espresso House Nørreport

-- hidden_gems
UPDATE public.pois SET lat = 55.7013424, lng = 12.5426383 WHERE id = 'c338757e-5b17-5fb9-b3b7-f9e12ae113e7'; -- Superkilen
UPDATE public.pois SET lat = 55.6913760, lng = 12.5943010 WHERE id = 'dacadbe0-c321-5e99-aa80-0455622e0291'; -- Kastellet
UPDATE public.pois SET lat = 55.6545325, lng = 12.6496067 WHERE id = '4ccd7af5-3896-5f54-a402-dd41d0537ae7'; -- Amager Strandpark
UPDATE public.pois SET lat = 55.6955245, lng = 12.6093316 WHERE id = 'ef3b8e33-5926-584e-aa2e-c18e5e1a3730'; -- Halvandet
UPDATE public.pois SET lat = 55.6791439, lng = 12.5689981 WHERE id = '7b16e8c0-f567-5dba-8f2b-df34200064c7'; -- Sankt Peders Stræde
UPDATE public.pois SET lat = 55.6824324, lng = 12.5963819 WHERE id = '3f8db6f2-fdbe-5662-873c-0382cf50baae'; -- Ofelia Beach
UPDATE public.pois SET lat = 55.6980823, lng = 12.5332338 WHERE id = '0fcf23be-1d96-55bb-8362-5bfc3e09c77b'; -- Nørrebro Park
UPDATE public.pois SET lat = 55.7174179, lng = 12.5067223 WHERE id = 'e56a38f5-c707-5fe6-b26e-6a67ed07d807'; -- Utterslev Mose
UPDATE public.pois SET lat = 55.8021521, lng = 12.5499210 WHERE id = '5baa8300-8ece-513d-8f7f-25f27741bf31'; -- Dyrehaven
