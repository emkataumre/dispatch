import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type PassportStats = {
  totalCheckIns: number;
  uniquePois: number;
  mostVisitedPoiId: string | null;
};

export function usePassportStats() {
  const { session } = useAuth();
  const [stats, setStats] = useState<PassportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setStats(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc("get_passport_stats");

      if (cancelled) return;

      if (rpcError) {
        console.error("usePassportStats:", rpcError.message);
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      const rows = data as Array<{
        total_check_ins: number;
        unique_pois: number;
        most_visited_poi_id: string | null;
      }>;
      const row = rows?.[0];
      setStats(
        row
          ? {
              totalCheckIns: row.total_check_ins,
              uniquePois: row.unique_pois,
              mostVisitedPoiId: row.most_visited_poi_id,
            }
          : { totalCheckIns: 0, uniquePois: 0, mostVisitedPoiId: null },
      );
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return { stats, loading, error };
}
