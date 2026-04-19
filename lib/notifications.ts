import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

export const CHECKIN_CATEGORY = "geofence-checkin";
export const ACTION_CONFIRM = "confirm-checkin";
export const ACTION_DISMISS = "dismiss-checkin";

export async function setupNotificationCategories(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("checkin", {
      name: "Check-in notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  await Notifications.setNotificationCategoryAsync(CHECKIN_CATEGORY, [
    {
      identifier: ACTION_CONFIRM,
      buttonTitle: "Yes, I'm here",
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_DISMISS,
      buttonTitle: "No",
      options: { opensAppToForeground: false },
    },
  ]);
}

// Module-level side effect (intentional): create the Android notification
// channel and register action categories early so they are available in
// headless mode (background geofence events). Previously this only ran inside
// MapScreen's useEffect, so headless task invocations tried to schedule on a
// non-existent channel and silently failed. Fire-and-forget — errors are
// logged but must not crash the module import chain.
setupNotificationCategories().catch((err) => {
  console.warn("[notifications] setupNotificationCategories failed at module scope:", err);
});

// Module-level side effect (intentional): setNotificationHandler must be
// registered early, before any notification arrives. Imported via index.js to
// ensure registration in both foreground and headless contexts. Currently
// applies to all categories — scope to categoryIdentifier if additional
// notification types are added in Phase 7.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Registers the device's Expo push token in `push_tokens` for the current user.
// Non-fatal on every failure path: push delivery is opt-in infra; the app must
// keep working without it. All exits log via console.warn — never throws.
//
// Permission rules: prompt whenever the OS still allows it (`canAskAgain`),
// not only on the legacy `undetermined` status. Android 13+ reports a fresh
// install as `denied` with `canAskAgain: true`, so a strict `undetermined`
// check would never prompt. If the user has hard-denied, respect that —
// Phase 7 will add a settings-driven re-ask.
export async function registerForPushNotifications(): Promise<void> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted && settings.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    console.warn("[notifications] Push permission not granted; skipping token registration");
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("[notifications] No EAS projectId in app config; skipping token registration");
    return;
  }

  // Fails on iOS simulator (no APNs) and on real iOS devices until APNs key is
  // configured in Expo. On Android dev builds it works out of the box via
  // Expo's default FCM credentials. Treat as non-fatal and bail.
  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (err) {
    console.warn("[notifications] getExpoPushTokenAsync failed:", err);
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    console.warn("[notifications] auth.getUser failed:", userError.message);
    return;
  }
  if (!user) {
    console.warn("[notifications] No authenticated user; skipping token upsert");
    return;
  }

  const { error } = await supabase
    .from("push_tokens")
    .upsert({ user_id: user.id, expo_push_token: token }, { onConflict: "user_id" });
  if (error) {
    console.warn("[notifications] push_tokens upsert failed:", error.message);
  }
}

// Deletes the current user's push_tokens row. Must be called BEFORE
// supabase.auth.signOut() — after sign-out, the JWT is gone and RLS
// (`auth.uid() = user_id`) would block the delete, leaving a stale token
// that routes pushes for the account to the previous user's device.
//
// Non-fatal by contract: sign-out must never be blocked on this. All exits
// log via console.warn and resolve normally; never throws.
export async function clearPushToken(): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    console.warn("[notifications] clearPushToken auth.getUser failed:", userError.message);
    return;
  }
  if (!user) {
    // No session — nothing to clear. Not a warning.
    return;
  }

  const { error } = await supabase.from("push_tokens").delete().eq("user_id", user.id);
  if (error) {
    console.warn("[notifications] push_tokens delete failed:", error.message);
  }
}
