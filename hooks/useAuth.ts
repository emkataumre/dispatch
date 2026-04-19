import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { clearPushToken } from "@/lib/notifications";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Failed to restore session:", error.message);
      } else {
        setSession(session);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear push token BEFORE sign-out — after sign-out the JWT is gone and
    // RLS blocks the delete, leaving a stale row that would route this
    // account's pushes to a prior user on shared devices. Non-fatal.
    await clearPushToken();
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign out failed:", error.message);
  };

  return { session, loading, signOut };
}
