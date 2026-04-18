// send-push: server-templated Expo push delivery for presence events.
//
// Trust boundary. The function holds SUPABASE_SERVICE_ROLE_KEY to look up
// push tokens and derive recipients (RLS bypass). Callers send only a `kind`
// and a `presence_join_id`; the server derives the recipient user_id and
// renders the title/body from a fixed template. This prevents an authed
// user from spamming arbitrary users with arbitrary content.
//
// Authorization model:
//   - verify_jwt=true (Supabase gateway) — rejects unauthenticated callers.
//   - Per-call: caller_id == presence_joins.joiner_user_id — only the joiner
//     triggers notifications about their own join.
//
// Kinds:
//   - presence_join     → "X wants to join you at POI"   (recipient = broadcaster)
//   - presence_cancel   → "X is no longer joining at POI"(recipient = broadcaster)
//   - presence_arrived  → "X has arrived at POI"         (recipient = broadcaster)
//
// Cancel note: callers MUST invoke this function BEFORE deleting the
// presence_joins row, otherwise the lookup 404s (documented, not a bug).
//
// Input:  { kind: PushKind; presence_join_id: string }
// Output: { sent: number; failed: number; missing_tokens: number }
// Counters reflect Expo ticket acceptance, not delivery. DeviceNotRegistered
// is surfaced via the receipts endpoint (not wired up — Phase 7 polish).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_LIMIT = 100;

type PushKind = "presence_join" | "presence_cancel" | "presence_arrived";

interface SendPushPayload {
  kind: PushKind;
  presence_join_id: string;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: "default";
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function renderTemplate(
  kind: PushKind,
  joinerName: string,
  poiName: string,
): { title: string; body: string } {
  switch (kind) {
    case "presence_join":
      return { title: `${joinerName} wants to join you`, body: `At ${poiName}` };
    case "presence_cancel":
      return { title: `${joinerName} is no longer joining`, body: `At ${poiName}` };
    case "presence_arrived":
      return { title: `${joinerName} has arrived`, body: `At ${poiName}` };
  }
}

function isValidPayload(p: unknown): p is SendPushPayload {
  if (typeof p !== "object" || p === null) return false;
  const obj = p as Record<string, unknown>;
  const kindOk =
    obj.kind === "presence_join" ||
    obj.kind === "presence_cancel" ||
    obj.kind === "presence_arrived";
  return kindOk && typeof obj.presence_join_id === "string";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "missing_server_env" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "missing_auth" }, 401);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  if (!isValidPayload(payload)) {
    return jsonResponse({ error: "invalid_payload" }, 400);
  }
  const { kind, presence_join_id } = payload;

  // Caller client (anon + forwarded JWT) — used only to derive caller_id.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userResult.user) {
    return jsonResponse({ error: "unauthenticated" }, 401);
  }
  const callerId = userResult.user.id;

  // Admin client for server-derived recipient + token lookup.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: joinRow, error: joinErr } = await admin
    .from("presence_joins")
    .select("joiner_user_id, presence_id")
    .eq("id", presence_join_id)
    .maybeSingle();
  if (joinErr) {
    return jsonResponse({ error: "join_lookup_failed", detail: joinErr.message }, 500);
  }
  if (!joinRow) {
    return jsonResponse({ error: "presence_join_not_found" }, 404);
  }
  if (joinRow.joiner_user_id !== callerId) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const { data: presenceRow, error: presenceErr } = await admin
    .from("live_presence")
    .select("user_id, poi_id")
    .eq("id", joinRow.presence_id)
    .maybeSingle();
  if (presenceErr) {
    return jsonResponse({ error: "presence_lookup_failed", detail: presenceErr.message }, 500);
  }
  if (!presenceRow) {
    return jsonResponse({ error: "presence_not_found" }, 404);
  }
  const recipientId = presenceRow.user_id;

  const [{ data: joinerProfile, error: joinerErr }, { data: poi, error: poiErr }] =
    await Promise.all([
      admin.from("profiles").select("display_name").eq("id", callerId).maybeSingle(),
      admin.from("pois").select("name").eq("id", presenceRow.poi_id).maybeSingle(),
    ]);
  if (joinerErr || poiErr) {
    return jsonResponse(
      { error: "context_lookup_failed", detail: joinerErr?.message ?? poiErr?.message },
      500,
    );
  }

  const joinerName = joinerProfile?.display_name ?? "Someone";
  const poiName = poi?.name ?? "a spot";
  const { title, body } = renderTemplate(kind, joinerName, poiName);

  const { data: tokenRows, error: tokenErr } = await admin
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", recipientId);
  if (tokenErr) {
    return jsonResponse({ error: "token_lookup_failed", detail: tokenErr.message }, 500);
  }
  const tokens = (tokenRows ?? []).map((r: { expo_push_token: string }) => r.expo_push_token);
  const missing_tokens = tokens.length === 0 ? 1 : 0;

  if (tokens.length === 0) {
    return jsonResponse({ sent: 0, failed: 0, missing_tokens });
  }

  const pushData = {
    kind,
    presence_join_id,
    presence_id: joinRow.presence_id,
    poi_id: presenceRow.poi_id,
  };

  let sent = 0;
  let failed = 0;

  for (const group of chunk(tokens, EXPO_BATCH_LIMIT)) {
    const messages: ExpoMessage[] = group.map((to) => ({
      to,
      title,
      body,
      data: pushData,
      sound: "default",
    }));
    try {
      const resp = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "<unreadable>");
        console.error(`[send-push] Expo ${resp.status}: ${errBody}`);
        failed += group.length;
        continue;
      }
      const result = await resp.json();
      const tickets: Array<{ status: string; message?: string }> = result?.data ?? [];
      for (const t of tickets) {
        if (t.status === "ok") sent += 1;
        else {
          failed += 1;
          console.error(`[send-push] ticket ${t.status}: ${t.message ?? ""}`);
        }
      }
      const unaccounted = group.length - tickets.length;
      if (unaccounted > 0) failed += unaccounted;
    } catch (err) {
      console.error("[send-push] Expo fetch threw:", err);
      failed += group.length;
    }
  }

  return jsonResponse({ sent, failed, missing_tokens });
});
