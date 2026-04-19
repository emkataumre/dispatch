import { supabase } from "./supabase";

export type PresencePushKind = "presence_join" | "presence_cancel" | "presence_arrived";

export interface SendPresencePushResult {
  sent: number;
  failed: number;
  missing_tokens: number;
}

// Invokes the `send-push` Edge Function for a presence event. The server
// derives the recipient and renders the title/body from a fixed template
// keyed by `kind` — callers cannot spoof content or target. Only the joiner
// of the referenced presence_joins row may trigger (enforced server-side).
//
// Non-fatal contract: push delivery is opt-in infra; callers (join/cancel,
// arrival prompts) must not depend on success. All failures log via
// console.warn and resolve to null — callers should treat null as
// "delivery skipped".
//
// Cancel ordering: invoke BEFORE deleting the presence_joins row. The edge
// function looks up the row by id; post-delete calls resolve to null.
export async function sendPresencePush(
  kind: PresencePushKind,
  presenceJoinId: string,
): Promise<SendPresencePushResult | null> {
  const { data, error } = await supabase.functions.invoke<SendPresencePushResult>("send-push", {
    body: { kind, presence_join_id: presenceJoinId },
  });

  if (error) {
    console.warn("[pushDelivery] send-push invoke failed:", error.message);
    return null;
  }
  return data ?? null;
}
