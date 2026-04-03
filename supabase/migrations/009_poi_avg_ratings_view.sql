-- security_invoker = true ensures the view respects RLS on poi_ratings for the calling user,
-- rather than executing as the definer and bypassing row-level security.
CREATE VIEW poi_avg_ratings WITH (security_invoker = true) AS
SELECT
  poi_id,
  AVG(rating)::numeric(4,2) AS avg_rating,
  COUNT(*)::int AS rating_count
FROM poi_ratings
GROUP BY poi_id;

-- Allow authenticated users to read the view (same audience as poi_ratings)
GRANT SELECT ON poi_avg_ratings TO authenticated;
