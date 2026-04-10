import { Platform } from 'react-native'
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDistanceMeters } from '@/lib/geo'
import { CHECKIN_CATEGORY } from '@/lib/notifications'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GEOFENCE_TASK = 'dispatch-geofence-task'
export const SLC_TASK = 'dispatch-slc-task'

const COOLDOWN_MS = 2 * 60 * 60 * 1000 // 2 hours
const GEOFENCE_RADIUS = 100 // metres
const COPENHAGEN_CENTER = { latitude: 55.6761, longitude: 12.5683 }
const SLC_REREGISTER_THRESHOLD = 500 // metres — only re-register geofences when user moves 500m+
const SLC_LAST_LOC_KEY = 'geofence-slc-last-loc'

// iOS hard cap is 20 regions. Android cap is 100; all 64 V1 POIs fit.
const IOS_GEOFENCE_LIMIT = 20
const ANDROID_GEOFENCE_LIMIT = 100

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PoiSlim = { id: string; name: string; lat: number; lng: number }

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function getGeofenceLimit(): number {
  return Platform.OS === 'ios' ? IOS_GEOFENCE_LIMIT : ANDROID_GEOFENCE_LIMIT
}

export function getNearestPois(
  pois: PoiSlim[],
  latitude: number,
  longitude: number,
  limit: number
): PoiSlim[] {
  return [...pois]
    .map((p) => ({ poi: p, dist: getDistanceMeters(latitude, longitude, p.lat, p.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((entry) => entry.poi)
}

// ---------------------------------------------------------------------------
// Cooldown helpers (AsyncStorage)
// ---------------------------------------------------------------------------

async function isCoolingDown(poiId: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem(`geofence-cooldown:${poiId}`)
  if (!stored) return false
  return Date.now() - parseInt(stored, 10) < COOLDOWN_MS
}

async function setCooldown(poiId: string): Promise<void> {
  await AsyncStorage.setItem(`geofence-cooldown:${poiId}`, Date.now().toString())
}

// ---------------------------------------------------------------------------
// Geofence registration
// ---------------------------------------------------------------------------

export async function registerGeofenceRegions(pois: PoiSlim[]): Promise<void> {
  const regions: Location.LocationRegion[] = pois.map((p) => ({
    identifier: `${p.id}::${p.name}`,
    latitude: p.lat,
    longitude: p.lng,
    radius: GEOFENCE_RADIUS,
    notifyOnEnter: true,
    notifyOnExit: false,
  }))
  await Location.startGeofencingAsync(GEOFENCE_TASK, regions)
}

export async function registerGeofences(
  pois: PoiSlim[],
  currentLocation?: { latitude: number; longitude: number }
): Promise<void> {
  // Stop any stale SLC task from a previous session to prevent
  // re-registration from wiping the geofence transition state.
  try { await Location.stopLocationUpdatesAsync(SLC_TASK) } catch { /* not registered */ }

  const loc = currentLocation ?? COPENHAGEN_CENTER
  const limit = getGeofenceLimit()
  const nearest = getNearestPois(pois, loc.latitude, loc.longitude, limit)
  await registerGeofenceRegions(nearest)

  await AsyncStorage.setItem(SLC_LAST_LOC_KEY, JSON.stringify(loc))

  // Start background location monitoring. On Android, the foreground service
  // keeps the process alive so geofence PendingIntents are delivered in the
  // background. On iOS, this also drives nearest-20 re-registration.
  await Location.startLocationUpdatesAsync(SLC_TASK, {
    accuracy: Location.Accuracy.Low,
    activityType: Location.ActivityType.Other,
    deferredUpdatesDistance: SLC_REREGISTER_THRESHOLD,
    deferredUpdatesInterval: 0,
    ...(Platform.OS === 'android' && {
      foregroundService: {
        notificationTitle: 'Dispatch is running',
        notificationBody: 'Monitoring nearby places for check-ins',
        notificationColor: '#1a73e8',
      },
    }),
  })
}

export async function stopGeofences(): Promise<void> {
  try { await Location.stopGeofencingAsync(GEOFENCE_TASK) } catch { /* not registered */ }
  try { await Location.stopLocationUpdatesAsync(SLC_TASK) } catch { /* not registered */ }
}

// ---------------------------------------------------------------------------
// Background task: geofence event handler
// ---------------------------------------------------------------------------

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Geofence task] error:', error.message)
    return
  }

  const { eventType, region } = data as {
    eventType: Location.LocationGeofencingEventType
    region: Location.LocationRegion
  }

  if (eventType !== Location.LocationGeofencingEventType.Enter) return
  if (!region.identifier) return

  const [poiId, ...nameParts] = region.identifier.split('::')
  const poiName = nameParts.join('::')

  if (await isCoolingDown(poiId)) return
  await setCooldown(poiId)

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `You're at ${poiName}`,
        body: 'Are you here? Tap to check in!',
        categoryIdentifier: CHECKIN_CATEGORY,
        data: { poiId, poiName },
        android: { channelId: 'checkin' },
      },
      trigger: null,
    })
  } catch (err) {
    console.error('[Geofence task] failed to schedule notification:', err)
  }
})

// ---------------------------------------------------------------------------
// Background task: significant location change → re-register nearest N
// ---------------------------------------------------------------------------

TaskManager.defineTask(SLC_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[SLC task] error:', error.message)
    return
  }

  // On Android, all 64 V1 POIs fit within the 100-region limit.
  // The SLC task only exists to keep the foreground service alive —
  // no re-registration needed. On iOS (20-region limit), re-register
  // the nearest 20 when the user moves 500m+.
  if (Platform.OS === 'android') return

  const { locations } = data as { locations: Location.LocationObject[] }
  if (!locations || locations.length === 0) return

  const current = locations[locations.length - 1]

  try {
    const stored = await AsyncStorage.getItem(SLC_LAST_LOC_KEY)
    if (stored) {
      const last = JSON.parse(stored) as { latitude: number; longitude: number }
      const dist = getDistanceMeters(
        last.latitude, last.longitude,
        current.coords.latitude, current.coords.longitude
      )
      if (dist < SLC_REREGISTER_THRESHOLD) return
    }

    const { supabase } = require('@/lib/supabase')
    const { data: pois } = await supabase
      .from('pois')
      .select('id, name, lat, lng')

    if (!pois || pois.length === 0) return

    const limit = getGeofenceLimit()
    const nearest = getNearestPois(
      pois as PoiSlim[],
      current.coords.latitude,
      current.coords.longitude,
      limit
    )
    await registerGeofenceRegions(nearest)
    await AsyncStorage.setItem(
      SLC_LAST_LOC_KEY,
      JSON.stringify({ latitude: current.coords.latitude, longitude: current.coords.longitude })
    )
  } catch (err) {
    console.error('[SLC task] failed to re-register geofences:', err)
  }
})
