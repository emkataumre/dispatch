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

// Ensure notifications display when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})
