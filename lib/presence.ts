import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

export type VisibilityType = Database["public"]["Enums"]["visibility_type"];

export type ActivePresence = {
  id: string;
  poi_id: string;
  message: string | null;
  visible_to: VisibilityType;
};

export async function broadcastPresence(
  supabase: SupabaseClient<Database>,
  {
    poiId,
    message,
    visibleTo = "friends",
  }: { poiId: string; message?: string; visibleTo?: VisibilityType },
) {
  // Also enforced at DB level: CHECK (char_length(message) <= 140)
  const trimmedMessage = message?.trim() || null;
  if (trimmedMessage && trimmedMessage.length > 140) {
    throw new Error("Message must be 140 characters or less");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Auto-dismiss any existing active broadcast (no-op if none exists)
  const { error: dismissError } = await supabase
    .from("live_presence")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("dismissed_at", null);
  if (dismissError) throw new Error(dismissError.message);

  const { data, error } = await supabase
    .from("live_presence")
    .insert({
      poi_id: poiId,
      user_id: user.id,
      message: trimmedMessage,
      visible_to: visibleTo,
    })
    .select("id, poi_id, message, visible_to")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function dismissPresence(
  supabase: SupabaseClient<Database>,
  { presenceId }: { presenceId: string },
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("live_presence")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", presenceId)
    .eq("user_id", user.id)
    .is("dismissed_at", null);

  if (error) throw new Error(error.message);
}
