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
  const [stats, setStats] = useState<PassportStats>({
    totalCheckIns: 0,
    uniquePois: 0,
    mostVisitedPoiId: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    setError(null);

    supabase.rpc("get_passport_stats").then(({ data, error: rpcError }) => {
      if (!active) return;
      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setStats({
          totalCheckIns: Number(row.total_check_ins),
          uniquePois: Number(row.unique_pois),
          mostVisitedPoiId: row.most_visited_poi_id ?? null,
        });
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [session]);

  return { ...stats, loading, error };
}
