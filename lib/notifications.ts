import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'

export const CHECKIN_CATEGORY = 'geofence-checkin'
export const ACTION_CONFIRM = 'confirm-checkin'
export const ACTION_DISMISS = 'dismiss-checkin'

export async function setupNotificationCategories(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('checkin', {
      name: 'Check-in notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    })
  }

  await Notifications.setNotificationCategoryAsync(CHECKIN_CATEGORY, [
    {
      identifier: ACTION_CONFIRM,
      buttonTitle: "Yes, I'm here",
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_DISMISS,
      buttonTitle: 'No',
      options: { opensAppToForeground: false },
    },
  ])
}

// Module-level side effect (intentional): create the Android notification
// channel and register action categories early so they are available in
// headless mode (background geofence events). Previously this only ran inside
// MapScreen's useEffect, so headless task invocations tried to schedule on a
// non-existent channel and silently failed. Fire-and-forget — errors are
// logged but must not crash the module import chain.
setupNotificationCategories().catch((err) => {
  console.warn('[notifications] setupNotificationCategories failed at module scope:', err)
})

// Module-level side effect (intentional): setNotificationHandler must be
// registered early, before any notification arrives. Imported via index.js to
// ensure registration in both foreground and headless contexts. Currently
// applies to all categories — scope to categoryIdentifier if additional
// notification types are added in Phase 7.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})
