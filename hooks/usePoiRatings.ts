import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type RatingComment = {
  id: string;
  rating: number;
  // Only rows where comment IS NOT NULL are included — non-null guaranteed by filter before mapping
  comment: string;
  created_at: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

export type MyRating = {
  id: string;
  rating: number;
  comment: string | null;
};

type ProfileJoin = { display_name?: string; avatar_url?: string | null };

function getProfileField(profiles: unknown): ProfileJoin {
  if (!profiles) return {};
  if (Array.isArray(profiles)) return (profiles[0] as ProfileJoin) ?? {};
  return profiles as ProfileJoin;
}

export function usePoiRatings(poiId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [comments, setComments] = useState<RatingComment[]>([]);
  const [myRating, setMyRating] = useState<MyRating | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accepts an optional isCancelled guard so the useEffect can cancel in-flight
  // requests when poiId changes, while refetch() calls pass no guard.
  const load = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!poiId) return;
      setLoading(true);
      setError(null);

      // Relies on the "Profiles viewable by authenticated users" RLS SELECT policy
      // allowing cross-user reads of display_name and avatar_url. If that policy is ever
      // tightened, the profiles join will silently return null and both fields will fall
      // back to defaults.
      const { data, error } = await supabase
        .from("poi_ratings")
        .select("id, rating, comment, created_at, user_id, profiles(display_name, avatar_url)")
        .eq("poi_id", poiId)
        .order("created_at", { ascending: false });

      if (isCancelled?.()) return;

      if (error) {
        console.error("usePoiRatings:", error.message);
        setError(error.message);
        setLoading(false);
        return;
      }

      const rows = data ?? [];
      const total = rows.reduce((sum, r) => sum + r.rating, 0);
      setRatingCount(rows.length);
      setAvgRating(rows.length > 0 ? total / rows.length : null);

      setComments(
        rows
          .filter((r) => r.comment !== null && r.created_at !== null)
          .slice(0, 5)
          .map((r) => {
            const profile = getProfileField(r.profiles);
            return {
              id: r.id,
              rating: r.rating,
              comment: r.comment as string,
              created_at: r.created_at as string,
              user_id: r.user_id,
              display_name: profile.display_name ?? "Unknown",
              avatar_url: profile.avatar_url ?? null,
            };
          }),
      );

      const mine = userId ? (rows.find((r) => r.user_id === userId) ?? null) : null;
      setMyRating(
        mine ? { id: mine.id, rating: mine.rating, comment: mine.comment ?? null } : null,
      );

      setLoading(false);
    },
    [poiId, userId],
  );

  useEffect(() => {
    let cancelled = false;
    if (!poiId) {
      setAvgRating(null);
      setRatingCount(0);
      setComments([]);
      setMyRating(null);
      return;
    }
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [poiId, load]);

  return { avgRating, ratingCount, comments, myRating, loading, error, refetch: load };
}
