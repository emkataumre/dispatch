import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables } from "@/types/supabase";

// Use the generated type so it stays in sync with the DB schema automatically.
export type PresenceJoin = Tables<"presence_joins">;

export async function joinPresence(
  supabase: SupabaseClient<Database>,
  { presenceId }: { presenceId: string },
): Promise<PresenceJoin> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("presence_joins")
    .insert({ presence_id: presenceId, joiner_user_id: user.id })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("You have already joined this person.");
    throw new Error(error.message);
  }

  try {
    // Push notification stub — replace with Expo Push when infra is built in Phase 7
    console.log("[Push stub] join notification queued");
  } catch (pushErr) {
    console.error("[Push stub] Failed to send join notification:", pushErr);
    // Join succeeded — push failure is non-fatal
  }

  return data as PresenceJoin;
}

export async function cancelJoin(
  supabase: SupabaseClient<Database>,
  { joinId }: { joinId: string },
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { count, error } = await supabase
    .from("presence_joins")
    .delete({ count: "exact" })
    .eq("id", joinId)
    .eq("joiner_user_id", user.id);

  if (error) throw new Error(error.message);
  if ((count ?? 0) === 0) throw new Error("Join not found or already cancelled");

  try {
    // Push notification stub — replace with Expo Push when infra is built in Phase 7
    console.log("[Push stub] cancel notification queued");
  } catch (pushErr) {
    console.error("[Push stub] Failed to send cancel notification:", pushErr);
    // Cancel succeeded — push failure is non-fatal
  }
}

// Confirms all of the current user's pending joins at a given POI.
// Called as a side-effect of the normal geofence check-in flow — the joiner
// entering a geofence implicitly confirms they arrived for any broadcaster there.
// Two-step query avoids a cross-table join: step 1 finds active presences at
// the POI, step 2 updates only the joiner's unconfirmed rows for those presences.
export async function confirmJoins(
  supabase: SupabaseClient<Database>,
  { poiId }: { poiId: string },
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Step 1: find active presences at this POI
  const { data: presences, error: presenceError } = await supabase
    .from("live_presence")
    .select("id")
    .eq("poi_id", poiId)
    .is("dismissed_at", null);

  if (presenceError) throw new Error(presenceError.message);
  if (!presences || presences.length === 0) return;

  const presenceIds = presences.map((p) => p.id);

  // Step 2: confirm the joiner's pending joins for those presences
  const { error: updateError, count } = await supabase
    .from("presence_joins")
    .update({ confirmed: true }, { count: "exact" })
    .eq("joiner_user_id", user.id)
    .eq("confirmed", false)
    .in("presence_id", presenceIds);

  if (updateError) throw new Error(updateError.message);
  if (count === 0)
    console.log("[confirmJoins] No joins updated — joiner has no pending joins at poi:", poiId);

  try {
    // Push notification stub — replace with Expo Push when infra is built in Phase 7
    console.log("[Push stub] arrival notification queued for broadcasters at poi:", poiId);
  } catch (pushErr) {
    console.error("[Push stub] Failed to queue arrival notification:", pushErr);
    // Confirmation succeeded — push failure is non-fatal
  }
}
