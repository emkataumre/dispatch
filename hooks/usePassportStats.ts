import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type MostVisitedPoi = {
  name: string;
  count: number;
};

export type PassportStats = {
  totalCheckIns: number;
  uniquePois: number;
  mostVisited: MostVisitedPoi | null;
  isLoading: boolean;
  error: string | null;
};

export function usePassportStats(): PassportStats {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [totalCheckIns, setTotalCheckIns] = useState(0);
  const [uniquePois, setUniquePois] = useState(0);
  const [mostVisited, setMostVisited] = useState<MostVisitedPoi | null>(null);
  // Start in loading state if a user is already present — avoids a one-frame
  // flash of zeros before the first async fetch sets isLoading(true).
  const [isLoading, setIsLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!userId) return;
      setIsLoading(true);
      setError(null);

      // Step 1: get the user's active semester_id from their profile.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("semester_id")
        .eq("id", userId)
        .single();

      if (isCancelled?.()) return;

      if (profileError) {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      if (!profile.semester_id) {
        // No active semester — show zeros without querying check_ins.
        setTotalCheckIns(0);
        setUniquePois(0);
        setMostVisited(null);
        setIsLoading(false);
        return;
      }

      // Step 2: delegate all aggregation to the server via RPC.
      // get_passport_stats always returns exactly one row (aggregate over empty
      // set yields 0s / NULLs), so .single() is safe.
      const { data: stats, error: statsError } = await supabase
        .rpc("get_passport_stats", { p_semester_id: profile.semester_id })
        .single();

      if (isCancelled?.()) return;

      if (statsError) {
        setError(statsError.message);
        setIsLoading(false);
        return;
      }

      setTotalCheckIns(stats?.total_check_ins ?? 0);
      setUniquePois(stats?.unique_pois ?? 0);
      setMostVisited(
        stats?.most_visited_name != null
          ? { name: stats.most_visited_name, count: stats.most_visited_count ?? 0 }
          : null,
      );
      setIsLoading(false);
    },
    [userId],
  );

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      // Reset all stats (including isLoading) when the user logs out mid-fetch.
      // Without setIsLoading(false) here, a fetch in-flight at logout time would
      // be cancelled before setting it, leaving the UI stuck in a loading state.
      setTotalCheckIns(0);
      setUniquePois(0);
      setMostVisited(null);
      setIsLoading(false);
      return;
    }
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

  return { totalCheckIns, uniquePois, mostVisited, isLoading, error };
}
