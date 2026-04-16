import { useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PresenceJoin, joinPresence, cancelJoin } from "@/lib/presenceJoins";

export function usePresenceJoins() {
  const { session } = useAuth();
  const [joins, setJoins] = useState<PresenceJoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelId = useRef(`presence-joins-changes-${Date.now()}-${Math.random()}`);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setJoins([]);
      setLoading(false);
      return;
    }

    let active = true;
    setError(null);
    setLoading(true);

    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from("presence_joins")
          .select("id, presence_id, joiner_user_id, joined_at, confirmed")
          .eq("joiner_user_id", userId!);
        if (!active) return;
        if (fetchError) {
          console.error("usePresenceJoins:", fetchError.message);
          setError(fetchError.message);
        } else {
          // Note: joins for dismissed presences (dismissed_at set) are not filtered here
          // because soft-deleted live_presence rows persist. Stale joins are harmless —
          // dismissed presences never render PresenceCards so the stale join is never acted on.
          setJoins((data ?? []) as PresenceJoin[]);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("usePresenceJoins:", message);
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    // Subscribe to UPDATE events on the joiner's own joins so the UI reflects
    // confirmed = true immediately when the broadcaster-side RLS allows it or
    // when the joiner self-confirms via the geofence arrival flow.
    const channel = supabase
      .channel(channelId.current)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "presence_joins",
          filter: `joiner_user_id=eq.${userId}`,
        },
        (payload) => {
          if (!active) return;
          const updated = payload.new as PresenceJoin;
          setJoins((prev) => prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)));
        },
      )
      .subscribe((status, err) => {
        if (!active) return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (AppState.currentState === "background") return;
          console.error(`usePresenceJoins: Realtime ${status}`, err ?? "(no details)");
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  const join = useCallback(async (presenceId: string): Promise<PresenceJoin> => {
    const newJoin = await joinPresence(supabase, { presenceId });
    setJoins((prev) => {
      if (prev.some((j) => j.id === newJoin.id)) return prev;
      return [...prev, newJoin];
    });
    return newJoin;
  }, []);

  const cancel = useCallback(async (joinId: string): Promise<void> => {
    await cancelJoin(supabase, { joinId });
    setJoins((prev) => prev.filter((j) => j.id !== joinId));
  }, []);

  const getJoinForPresence = useCallback(
    (presenceId: string): PresenceJoin | undefined =>
      joins.find((j) => j.presence_id === presenceId),
    [joins],
  );

  return { joins, loading, error, join, cancel, getJoinForPresence };
}
