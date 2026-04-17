import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type MostVisitedPoi = {
  poiId: string;
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

type PoiJoin = { name?: string };

function getPoiName(pois: unknown): string | null {
  if (!pois) return null;
  if (Array.isArray(pois)) return (pois[0] as PoiJoin)?.name ?? null;
  return (pois as PoiJoin).name ?? null;
}

export function usePassportStats(): PassportStats {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [totalCheckIns, setTotalCheckIns] = useState(0);
  const [uniquePois, setUniquePois] = useState(0);
  const [mostVisited, setMostVisited] = useState<MostVisitedPoi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!userId) return;
      setIsLoading(true);
      setError(null);

      // Step 1: get the user's active semester_id from their profile.
      // semester_id is nullable until issue #31 migration lands.
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
        // semester_id nullable until issue #31 migration. Show zeros; don't aggregate all-time.
        setTotalCheckIns(0);
        setUniquePois(0);
        setMostVisited(null);
        setIsLoading(false);
        return;
      }

      // Step 2: fetch all check-ins for this user in the active semester,
      // ordered desc so the first occurrence of each poi_id is the most recent.
      const { data, error: checkInsError } = await supabase
        .from("check_ins")
        .select("poi_id, checked_in_at, pois(name)")
        .eq("user_id", userId)
        .eq("semester_id", profile.semester_id)
        .order("checked_in_at", { ascending: false });

      if (isCancelled?.()) return;

      if (checkInsError) {
        setError(checkInsError.message);
        setIsLoading(false);
        return;
      }

      const rows = data ?? [];
      setTotalCheckIns(rows.length);
      setUniquePois(new Set(rows.map((r) => r.poi_id)).size);

      // Group by poi_id, counting visits. Because rows are sorted desc, the first
      // occurrence of each poi_id carries the most recent checked_in_at — used as
      // tiebreaker when two POIs share the top visit count.
      const byPoi = new Map<string, { name: string; count: number; latestAt: string }>();
      for (const row of rows) {
        const name = getPoiName(row.pois) ?? "Unknown";
        const existing = byPoi.get(row.poi_id);
        if (!existing) {
          byPoi.set(row.poi_id, { name, count: 1, latestAt: row.checked_in_at });
        } else {
          byPoi.set(row.poi_id, { ...existing, count: existing.count + 1 });
          // latestAt intentionally not updated — first insertion holds most recent.
        }
      }

      if (byPoi.size === 0) {
        setMostVisited(null);
      } else {
        const [[poiId, { name, count }]] = [...byPoi.entries()].sort((a, b) => {
          const countDiff = b[1].count - a[1].count;
          if (countDiff !== 0) return countDiff;
          // Tiebreak: most recent last check-in wins.
          return b[1].latestAt.localeCompare(a[1].latestAt);
        });
        setMostVisited({ poiId, name, count });
      }

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
