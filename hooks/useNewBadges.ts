import { useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { BADGE_BY_ID, type BadgeDefinition } from "@/lib/badges/catalog";

export type NewBadgesState = {
  newBadge: BadgeDefinition | null;
  dismiss: () => void;
};

export function useNewBadges(): NewBadgesState {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [newBadge, setNewBadge] = useState<BadgeDefinition | null>(null);
  const channelId = useRef(`new-badges-${Date.now()}-${Math.random()}`);

  useEffect(() => {
    if (!userId) return;

    channelId.current = `new-badges-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(channelId.current)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_badges",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (AppState.currentState !== "active") return;
          const badgeId = (payload.new as { badge_id: string }).badge_id;
          const badge = BADGE_BY_ID.get(badgeId);
          if (badge) {
            setNewBadge(badge);
          }
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`useNewBadges: channel ${status} for user ${userId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismiss = useCallback(() => setNewBadge(null), []);

  return { newBadge, dismiss };
}
