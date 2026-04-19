import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDistanceMeters } from "@/lib/geo";
import { CHECKIN_CATEGORY } from "@/lib/notifications";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GEOFENCE_TASK = "dispatch-geofence-task";
export const SLC_TASK = "dispatch-slc-task";

const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const GEOFENCE_RADIUS = 100;
const COPENHAGEN_CENTER = { latitude: 55.6761, longitude: 12.5683 };
const SLC_REREGISTER_THRESHOLD = 500;
const SLC_LAST_LOC_KEY = "geofence-slc-last-loc";

// iOS CLLocationManager hard cap: 20 regions. Google Play Services cap: 100.
// If POI count exceeds ANDROID_GEOFENCE_LIMIT, the Android early-return in the
// background location task must be removed to enable re-registration on Android.
const IOS_GEOFENCE_LIMIT = 20;
const ANDROID_GEOFENCE_LIMIT = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PoiSlim = { id: string; name: string; lat: number; lng: number };

// ---------------------------------------------------------------------------
// Diagnostic logger
// ---------------------------------------------------------------------------

// Temporary instrumentation for the in-session check-in notification regression
// (PR #59 follow-up). Routed through console.warn so headless task output
// surfaces in `adb logcat *:S ReactNativeJS:V` reliably — console.log is
// frequently dropped from the headless JS context. Strip in the cleanup
// sub-feature once root cause is confirmed.
function gfLog(stage: string, fields: Record<string, unknown> = {}): void {
  if (!__DEV__) return;
  const parts = Object.entries(fields).map(([k, v]) => {
    const value = v === undefined ? "undefined" : typeof v === "object" ? JSON.stringify(v) : v;
    return `${k}=${value}`;
  });
  console.warn(`[Geofence:${stage}]`, ...parts);
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function getGeofenceLimit(): number {
  return Platform.OS === "ios" ? IOS_GEOFENCE_LIMIT : ANDROID_GEOFENCE_LIMIT;
}

export function getNearestPois(
  pois: PoiSlim[],
  latitude: number,
  longitude: number,
  limit: number,
): PoiSlim[] {
  return [...pois]
    .map((p) => ({ poi: p, dist: getDistanceMeters(latitude, longitude, p.lat, p.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((entry) => entry.poi);
}

// ---------------------------------------------------------------------------
// Cooldown helpers (AsyncStorage)
// ---------------------------------------------------------------------------

async function isCoolingDown(poiId: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(`geofence-cooldown:${poiId}`);
    if (!stored) {
      gfLog("cooldown", { poiId, stored: null, cooling: false });
      return false;
    }
    const ageMs = Date.now() - parseInt(stored, 10);
    const cooling = ageMs < COOLDOWN_MS;
    gfLog("cooldown", { poiId, stored, ageMs, cooling });
    return cooling;
  } catch (err) {
    // If AsyncStorage fails, allow the notification rather than silently blocking.
    gfLog("cooldown", { poiId, err: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

async function setCooldown(poiId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`geofence-cooldown:${poiId}`, Date.now().toString());
    gfLog("cooldownSet", { poiId });
  } catch (err) {
    console.error("[Geofence] failed to set cooldown:", err);
  }
}

// ---------------------------------------------------------------------------
// Geofence registration
// ---------------------------------------------------------------------------

// Intended for call sites where expo-task-manager is already initialized (i.e.
// not at cold-start). Direct callers (e.g. the SLC background task) must not
// call this at a point where TaskManagerInternalImpl's SharedPreferences may be
// null — use registerGeofences instead, which primes the singleton first.
export async function registerGeofenceRegions(pois: PoiSlim[]): Promise<void> {
  const regions: Location.LocationRegion[] = pois.map((p) => ({
    identifier: `${p.id}::${p.name}`,
    latitude: p.lat,
    longitude: p.lng,
    radius: GEOFENCE_RADIUS,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));
  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
}

export async function registerGeofences(
  pois: PoiSlim[],
  currentLocation?: { latitude: number; longitude: number },
): Promise<void> {
  gfLog("register:start", {
    platform: Platform.OS,
    poiCount: pois.length,
    haveLocation: currentLocation !== undefined,
  });

  // Prime expo-task-manager's native singleton before any Location.* call. On
  // Android, startGeofencingAsync reads TaskManagerInternalImpl's persisted-
  // task SharedPreferences; if the TaskService context hasn't initialized yet
  // (race against concurrent expo-notifications/FCM init at app cold-start),
  // that SharedPreferences reference is null and getAll() throws NPE. Calling
  // isTaskRegisteredAsync first forces the singleton to construct.
  let alreadyRegistered: boolean | "unknown" = "unknown";
  try {
    alreadyRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    gfLog("register:primed", { alreadyRegistered });
  } catch (err) {
    // isTaskRegisteredAsync returns false (not throws) when TaskManager is
    // uninitialized — reaching here is unexpected. Log prominently so it
    // surfaces in crash reporting (Crashlytics, Phase 7) and proceed; the
    // prime has failed and the Android NPE may still occur.
    console.error(
      "[registerGeofences] TaskManager prime threw unexpectedly — Android NPE may follow:",
      err,
    );
  }

  // Stop any stale geofence and location-update tasks from a previous session.
  // Without stopping the geofence task first, startGeofencingAsync may deliver
  // queued/pending Enter events from the old registration alongside the new one,
  // causing duplicate notifications for the same POI.
  try {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
    gfLog("register:stoppedGeofence");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    gfLog("register:stopGeofenceErr", { msg });
    if (!msg.includes("not registered") && !msg.includes("not found")) {
      console.error("[registerGeofences] unexpected error stopping stale geofence task:", err);
    }
  }
  try {
    await Location.stopLocationUpdatesAsync(SLC_TASK);
    gfLog("register:stoppedSLC");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    gfLog("register:stopSLCErr", { msg });
    if (!msg.includes("not registered") && !msg.includes("not found")) {
      console.error("[registerGeofences] unexpected error stopping stale SLC task:", err);
    }
  }

  const loc = currentLocation ?? COPENHAGEN_CENTER;
  const limit = getGeofenceLimit();
  const nearest = getNearestPois(pois, loc.latitude, loc.longitude, limit);
  await registerGeofenceRegions(nearest);
  gfLog("register:startedGeofence", { regionCount: nearest.length, limit });

  await AsyncStorage.setItem(SLC_LAST_LOC_KEY, JSON.stringify(loc));

  // Start background location monitoring. On Android, the foreground service
  // keeps the process alive so geofence PendingIntents are delivered in the
  // background. On iOS, this also drives nearest-20 re-registration.
  // deferredUpdatesInterval: 0 means updates are delivered as soon as the
  // distance threshold is reached, not on a timer.
  await Location.startLocationUpdatesAsync(SLC_TASK, {
    accuracy: Location.Accuracy.Low,
    activityType: Location.ActivityType.Other,
    deferredUpdatesDistance: SLC_REREGISTER_THRESHOLD,
    deferredUpdatesInterval: 0,
    ...(Platform.OS === "android" && {
      foregroundService: {
        notificationTitle: "Dispatch is running",
        notificationBody: "Monitoring nearby places for check-ins",
        notificationColor: "#1a73e8",
      },
    }),
  });
  gfLog("register:done", { fgServiceAndroid: Platform.OS === "android" });
}

export async function stopGeofences(): Promise<void> {
  try {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("not registered") && !msg.includes("not found")) {
      console.error("[stopGeofences] unexpected error stopping geofence task:", err);
    }
  }
  try {
    await Location.stopLocationUpdatesAsync(SLC_TASK);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("not registered") && !msg.includes("not found")) {
      console.error("[stopGeofences] unexpected error stopping SLC task:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Background task: geofence event handler
// ---------------------------------------------------------------------------

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  gfLog("task:entry", { hasError: error != null });
  if (error) {
    console.error("[Geofence task] error:", error.message);
    return;
  }

  const { eventType, region } = data as {
    eventType: Location.LocationGeofencingEventType;
    region: Location.LocationRegion;
  };

  gfLog("task:event", { eventType, identifier: region?.identifier });

  if (eventType !== Location.LocationGeofencingEventType.Enter) return;
  if (!region.identifier) return;

  const [poiId, ...nameParts] = region.identifier.split("::");
  const poiName = nameParts.join("::");

  if (await isCoolingDown(poiId)) {
    gfLog("task:skipCooling", { poiId });
    return;
  }

  if (Platform.OS === "android") {
    try {
      const channel = await Notifications.getNotificationChannelAsync("checkin");
      gfLog("task:channel", {
        exists: channel !== null,
        importance: channel?.importance,
      });
    } catch (err) {
      gfLog("task:channelErr", { msg: err instanceof Error ? err.message : String(err) });
    }
  }

  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      // Stable identifier per POI — if the OS delivers a duplicate geofence
      // Enter event (e.g. after re-registration on cold start), the second
      // scheduleNotificationAsync call auto-replaces the first notification
      // instead of creating a second one.
      identifier: `geofence-checkin:${poiId}`,
      content: {
        title: `You're at ${poiName}`,
        body: "Are you here? Tap to check in!",
        categoryIdentifier: CHECKIN_CATEGORY,
        data: { poiId, poiName },
      },
      trigger:
        Platform.OS === "android"
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: "checkin",
            }
          : null,
    });
    gfLog("task:scheduled", { poiId, notifId });
    // Set cooldown only after successful notification — a transient failure
    // should not burn the 2h window and silently block future prompts.
    await setCooldown(poiId);
  } catch (err) {
    console.error("[Geofence task] failed to schedule notification:", err);
  }
});

// ---------------------------------------------------------------------------
// Background task: low-accuracy location updates → re-register nearest N
// Uses startLocationUpdatesAsync with deferredUpdatesDistance to approximate
// significant-location-change behavior. Not the iOS CLLocationManager SLC API.
// ---------------------------------------------------------------------------

TaskManager.defineTask(SLC_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[SLC task] error:", error.message);
    return;
  }

  // On Android, the 100-region limit accommodates all V1 POIs. The background
  // location task only exists to keep the foreground service alive — no
  // re-registration needed. If POI count exceeds ANDROID_GEOFENCE_LIMIT, this
  // early-return must be removed to enable re-registration on Android as well.
  // On iOS (20-region limit), re-register the nearest 20 when the user moves 500m+.
  if (Platform.OS === "android") return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const current = locations[locations.length - 1];

  try {
    const stored = await AsyncStorage.getItem(SLC_LAST_LOC_KEY);
    if (stored) {
      const last = JSON.parse(stored) as { latitude: number; longitude: number };
      const dist = getDistanceMeters(
        last.latitude,
        last.longitude,
        current.coords.latitude,
        current.coords.longitude,
      );
      if (dist < SLC_REREGISTER_THRESHOLD) return;
    }

    const { supabase } = require("@/lib/supabase");
    const { data: pois, error: poisError } = await supabase
      .from("pois")
      .select("id, name, lat, lng");

    if (poisError) {
      console.error("[SLC task] failed to fetch POIs:", poisError.message);
      return;
    }

    if (!pois || pois.length === 0) return;

    const limit = getGeofenceLimit();
    const nearest = getNearestPois(
      pois as PoiSlim[],
      current.coords.latitude,
      current.coords.longitude,
      limit,
    );
    await registerGeofenceRegions(nearest);
    await AsyncStorage.setItem(
      SLC_LAST_LOC_KEY,
      JSON.stringify({ latitude: current.coords.latitude, longitude: current.coords.longitude }),
    );
  } catch (err) {
    console.error("[SLC task] failed to re-register geofences:", err);
  }
});
