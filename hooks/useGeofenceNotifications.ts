import { useEffect, useRef, useCallback, useState } from 'react'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import { insertCheckIn } from '@/lib/checkIns'
import { confirmJoins } from '@/lib/presenceJoins'
import { ACTION_CONFIRM, ACTION_DISMISS, CHECKIN_CATEGORY } from '@/lib/notifications'

export type ToastState = {
  visible: boolean
  message: string
}

export function useGeofenceNotifications() {
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' })
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(true)

  const showToast = useCallback((message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast({ visible: true, message })
    timeoutRef.current = setTimeout(() => {
      setToast({ visible: false, message: '' })
    }, 2000)
    ;(timeoutRef.current as unknown as { unref?: () => void }).unref?.()
  }, [])

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const { actionIdentifier, notification } = response
        const category = notification.request.content.categoryIdentifier
        if (category !== CHECKIN_CATEGORY) return

        // Dismiss the notification on any action to prevent stale banners —
        // on Android, notification actions do not always auto-dismiss.
        await Notifications.dismissNotificationAsync(
          notification.request.identifier
        )

        // Any action other than explicit confirm or default tap (banner tap) is
        // ignored — e.g. ACTION_DISMISS ("No" button). The notification was
        // already dismissed above.
        if (
          actionIdentifier !== ACTION_CONFIRM &&
          actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
        ) return

        const data = notification.request.content.data as {
          poiId?: string
          poiName?: string
        }

        if (!data?.poiId || !data?.poiName) {
          console.error('[Geofence notification] Missing poiId or poiName in data')
          return
        }

        try {
          await insertCheckIn(supabase, { poiId: data.poiId })
          // Confirm any pending joins at this POI — best-effort, never blocks check-in
          try {
            await confirmJoins(supabase, { poiId: data.poiId })
          } catch {
            try {
              await new Promise(r => setTimeout(r, 2000))
              if (!isMounted.current) return
              await confirmJoins(supabase, { poiId: data.poiId })
            } catch (retryErr) {
              console.error('[Geofence notification] Join confirmation failed after retry:', retryErr)
            }
          }
          showToast(`Checked in at ${data.poiName}`)
        } catch (err) {
          console.error('[Geofence notification] Check-in failed:', err)
          showToast('Check-in failed — please try again')
        }
      }
    )

    return () => {
      isMounted.current = false
      subscription.remove()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [showToast])

  return { toast }
}
