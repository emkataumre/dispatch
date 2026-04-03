CREATE VIEW poi_avg_ratings AS
SELECT
  poi_id,
  AVG(rating)::numeric(4,2) AS avg_rating,
  COUNT(*)::int AS rating_count
FROM poi_ratings
GROUP BY poi_id;

-- Allow authenticated users to read the view (same audience as poi_ratings)
GRANT SELECT ON poi_avg_ratings TO authenticated;
