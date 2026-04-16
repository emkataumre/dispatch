import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { searchUsers, SearchUser } from "@/lib/friends";

export type SearchResult =
  | { state: "idle"; results: []; error: null }
  | { state: "searching"; results: SearchUser[]; error: null }
  | { state: "results"; results: SearchUser[]; error: null }
  | { state: "error"; results: []; error: string };

export function useUserSearch(query: string): SearchResult {
  const [results, setResults] = useState<SearchUser[]>([]);
  const [state, setState] = useState<SearchResult["state"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();

    // Require at least 2 characters to avoid overly broad prefix queries
    if (trimmed.length < 2) {
      setResults([]);
      setState("idle");
      setError(null);
      return;
    }

    let active = true;
    setState("searching");

    // 300ms debounce to avoid firing a search request on every keystroke
    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchUsers(supabase, { query: trimmed });
        if (!active) return;
        setResults(data);
        setState("results");
        setError(null);
      } catch (err) {
        if (!active) return;
        console.error("useUserSearch: search failed for query:", trimmed, err);
        setError(err instanceof Error ? err.message : "Search failed");
        setState("error");
        setResults([]);
      }
    }, 300);

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { results, state, error } as SearchResult;
}
