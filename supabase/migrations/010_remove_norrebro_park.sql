-- Remove Nørrebro Park from pois (unwanted POI)
DELETE FROM pois WHERE name ILIKE '%norrebro park%' OR name ILIKE '%nørrebro park%';
