import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type UserBadgesState = {
  awardedIds: ReadonlySet<string>;
  isLoading: boolean;
  error: string | null;
};

const EMPTY_SET: ReadonlySet<string> = new Set();

export function useUserBadges(): UserBadgesState {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [awardedIds, setAwardedIds] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [isLoading, setIsLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!userId) return;
      setIsLoading(true);
      setError(null);

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

      if (!profile?.semester_id) {
        setAwardedIds(EMPTY_SET);
        setIsLoading(false);
        return;
      }

      const { data: badges, error: badgesError } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId)
        .eq("semester_id", profile.semester_id);

      if (isCancelled?.()) return;

      if (badgesError) {
        setError(badgesError.message);
        setIsLoading(false);
        return;
      }

      setAwardedIds(new Set((badges ?? []).map((b) => b.badge_id)));
      setIsLoading(false);
    },
    [userId],
  );

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setAwardedIds(EMPTY_SET);
      setIsLoading(false);
      setError(null);
      return;
    }
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [userId, load]);

  return { awardedIds, isLoading, error };
}
