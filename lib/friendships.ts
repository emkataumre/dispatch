import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables } from "@/types/supabase";

export type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

export type ProfileSummary = Pick<Tables<"profiles">, "id" | "display_name" | "avatar_url">;

export type FriendshipRow = Tables<"friendships">;

export type FriendshipWithProfiles = FriendshipRow & {
  requester: ProfileSummary;
  addressee: ProfileSummary;
};

type Supabase = SupabaseClient<Database>;

export async function fetchFriendships(supabase: Supabase): Promise<FriendshipWithProfiles[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
      *,
      requester:requester_id(id, display_name, avatar_url),
      addressee:addressee_id(id, display_name, avatar_url)
    `,
    )
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) throw new Error(error.message);
  return (data as unknown as FriendshipWithProfiles[]) ?? [];
}

export async function sendRequest(
  supabase: Supabase,
  { addresseeId }: { addresseeId: string },
): Promise<FriendshipRow> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id: addresseeId, status: "pending" })
    .select("*")
    .single();

  if (error) {
    // Postgres unique-constraint violation (23505) — most likely the LEAST/GREATEST pair index
    if (error.code === "23505") throw new Error("Friend request already exists");
    throw new Error(error.message);
  }
  return data;
}

export async function cancelRequest(
  supabase: Supabase,
  { friendshipId }: { friendshipId: string },
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { count, error } = await supabase
    .from("friendships")
    .delete({ count: "exact" })
    .eq("id", friendshipId);

  if (error) throw new Error(error.message);
  if (count === 0) throw new Error("Request not found or already cancelled");
}

export async function acceptRequest(
  supabase: Supabase,
  { friendshipId }: { friendshipId: string },
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { count, error } = await supabase
    .from("friendships")
    .update({ status: "accepted" }, { count: "exact" })
    .eq("id", friendshipId);

  if (error) throw new Error(error.message);
  if (count === 0) throw new Error("Request not found or already handled");
}

export async function declineRequest(
  supabase: Supabase,
  { friendshipId }: { friendshipId: string },
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { count, error } = await supabase
    .from("friendships")
    .delete({ count: "exact" })
    .eq("id", friendshipId);

  if (error) throw new Error(error.message);
  if (count === 0) throw new Error("Request not found or already declined");
}

export async function unfriend(
  supabase: Supabase,
  { friendshipId }: { friendshipId: string },
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { count, error } = await supabase
    .from("friendships")
    .delete({ count: "exact" })
    .eq("id", friendshipId);

  if (error) throw new Error(error.message);
  if (count === 0) throw new Error("Friendship not found");
}
