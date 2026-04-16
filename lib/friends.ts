import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

export type SearchUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

// Escape ILIKE special characters so user input is treated as a literal string.
function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

export async function searchUsers(
  supabase: SupabaseClient<Database>,
  { query }: { query: string },
): Promise<SearchUser[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Prefix match (query%) — uses the index on display_name; change to %query% for
  // substring matching at the cost of a full scan.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .ilike("display_name", `${escapeIlike(query)}%`)
    .neq("id", user.id)
    .limit(20);

  if (error) throw new Error(error.message);
  return (data as SearchUser[]) ?? [];
}
