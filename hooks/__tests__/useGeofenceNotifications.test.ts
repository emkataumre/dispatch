const React = require('react')

// Track the registered listener so tests can invoke it
let notificationResponseListener: ((response: unknown) => void) | null = null

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn((cb) => {
    notificationResponseListener = cb
    return { remove: jest.fn() }
  }),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
}))

jest.mock('../../lib/checkIns', () => ({
  insertCheckIn: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../lib/presenceJoins', () => ({
  confirmJoins: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../lib/supabase', () => ({
  supabase: { __mock: true },
}))

jest.mock('../../lib/notifications', () => ({
  CHECKIN_CATEGORY: 'geofence-checkin',
  ACTION_CONFIRM: 'confirm-checkin',
  ACTION_DISMISS: 'dismiss-checkin',
}))

import { useGeofenceNotifications } from '../useGeofenceNotifications'
import { insertCheckIn } from '../../lib/checkIns'
import { confirmJoins } from '../../lib/presenceJoins'

// Minimal renderHook using react-test-renderer (project convention)
const { create, act } = require('react-test-renderer')

function renderHook<T>(hook: () => T): { result: { current: T }; unmount: () => void } {
  const result = { current: undefined as T }
  let renderer: ReturnType<typeof create>

  function TestComponent() {
    result.current = hook()
    return null
  }

  act(() => {
    renderer = create(React.createElement(TestComponent))
  })

  return {
    result,
    unmount: () => act(() => renderer.unmount()),
  }
}

function makeNotificationResponse(actionIdentifier: string, poiId?: string, poiName?: string) {
  return {
    actionIdentifier,
    notification: {
      request: {
        identifier: 'notif-123',
        content: {
          categoryIdentifier: 'geofence-checkin',
          data: { poiId, poiName },
        },
      },
    },
  }
}

describe('useGeofenceNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    notificationResponseListener = null
  })

  it('registers a notification response listener on mount', () => {
    const Notifications = require('expo-notifications')
    renderHook(() => useGeofenceNotifications())
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled()
  })

  it('calls insertCheckIn on confirm action', async () => {
    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(insertCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ __mock: true }),
      { poiId: 'poi-1' }
    )
  })

  it('calls insertCheckIn on default action (body tap)', async () => {
    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse(
          'expo.modules.notifications.actions.DEFAULT',
          'poi-2',
          'Nørrebro'
        )
      )
    })

    expect(insertCheckIn).toHaveBeenCalledWith(
      expect.anything(),
      { poiId: 'poi-2' }
    )
  })

  it('does not call insertCheckIn on dismiss action', async () => {
    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('dismiss-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(insertCheckIn).not.toHaveBeenCalled()
  })

  it('dismisses notification on dismiss action', async () => {
    const Notifications = require('expo-notifications')
    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('dismiss-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('notif-123')
  })

  it('does not call insertCheckIn for non-geofence notification', async () => {
    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!({
        actionIdentifier: 'confirm-checkin',
        notification: {
          request: {
            content: {
              categoryIdentifier: 'some-other-category',
              data: { poiId: 'poi-1', poiName: 'Paludan' },
            },
          },
        },
      })
    })

    expect(insertCheckIn).not.toHaveBeenCalled()
  })

  it('sets toast visible on successful check-in', async () => {
    const { result } = renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(result.current.toast.visible).toBe(true)
    expect(result.current.toast.message).toBe('Checked in at Paludan')
  })

  it('shows error toast when insertCheckIn fails', async () => {
    ;(insertCheckIn as jest.Mock).mockRejectedValueOnce(new Error('Not authenticated'))

    const { result } = renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(result.current.toast.visible).toBe(true)
    expect(result.current.toast.message).toBe('Check-in failed — please try again')
  })

  it('does not call insertCheckIn when poiId is missing', async () => {
    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', undefined, 'Paludan')
      )
    })

    expect(insertCheckIn).not.toHaveBeenCalled()
  })

  it('does not call insertCheckIn when poiName is missing', async () => {
    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', undefined)
      )
    })

    expect(insertCheckIn).not.toHaveBeenCalled()
  })

  it('dismisses notification before attempting check-in', async () => {
    const Notifications = require('expo-notifications')
    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('notif-123')
  })

  it('removes listener on unmount', () => {
    const Notifications = require('expo-notifications')
    const { unmount } = renderHook(() => useGeofenceNotifications())
    const removeMock = Notifications.addNotificationResponseReceivedListener.mock.results[0].value.remove

    unmount()
    expect(removeMock).toHaveBeenCalled()
  })

  it('calls confirmJoins after successful check-in', async () => {
    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(confirmJoins).toHaveBeenCalledWith(
      expect.objectContaining({ __mock: true }),
      { poiId: 'poi-1' }
    )
  })

  it('does not call confirmJoins when check-in fails', async () => {
    ;(insertCheckIn as jest.Mock).mockRejectedValueOnce(new Error('auth error'))

    renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(confirmJoins).not.toHaveBeenCalled()
  })

  it('retries confirmJoins once on failure and shows toast on success', async () => {
    // Mock setTimeout to fire the first 2000ms timer (retry delay) immediately.
    // Subsequent 2000ms timers (toast cleanup) are registered but not called,
    // so toast.visible stays true when we check. React's internal 0ms timers
    // are not affected by the 2000ms guard.
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout')
    let retryFired = false
    setTimeoutSpy.mockImplementation((fn, delay) => {
      if (!retryFired && delay === 2000) {
        retryFired = true
        if (typeof fn === 'function') (fn as () => void)()
      }
      return 0 as unknown as ReturnType<typeof setTimeout>
    })

    ;(confirmJoins as jest.Mock)
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(confirmJoins).toHaveBeenCalledTimes(2)
    expect(result.current.toast.visible).toBe(true)
    expect(result.current.toast.message).toBe('Checked in at Paludan')

    setTimeoutSpy.mockRestore()
  })

  it('logs error and still shows toast when confirmJoins fails both attempts', async () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout')
    let retryFired = false
    setTimeoutSpy.mockImplementation((fn, delay) => {
      if (!retryFired && delay === 2000) {
        retryFired = true
        if (typeof fn === 'function') (fn as () => void)()
      }
      return 0 as unknown as ReturnType<typeof setTimeout>
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(confirmJoins as jest.Mock).mockRejectedValue(new Error('persistent error'))

    const { result } = renderHook(() => useGeofenceNotifications())

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(confirmJoins).toHaveBeenCalledTimes(2)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Join confirmation failed after retry'),
      expect.any(Error)
    )
    expect(result.current.toast.visible).toBe(true)
    expect(result.current.toast.message).toBe('Checked in at Paludan')

    consoleSpy.mockRestore()
    setTimeoutSpy.mockRestore()
  })

  it('hides toast after 2 seconds', async () => {
    // Ensure confirmJoins resolves so the retry timer is never scheduled
    ;(confirmJoins as jest.Mock).mockResolvedValue(undefined)
    const { result } = renderHook(() => useGeofenceNotifications())
    // Set up the spy AFTER renderHook so React initialisation timers are unaffected.
    // The spy intercepts the toast cleanup setTimeout (2000 ms) and captures the fn.
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout')
    let cleanupFn: (() => void) | null = null
    setTimeoutSpy.mockImplementation((fn, delay) => {
      if (delay === 2000 && typeof fn === 'function') {
        cleanupFn = fn as () => void
      }
      return 0 as unknown as ReturnType<typeof setTimeout>
    })

    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    // Toast should be visible immediately after the notification is handled
    expect(result.current.toast.visible).toBe(true)
    expect(cleanupFn).not.toBeNull()

    // Fire the cleanup timer to hide the toast
    await act(async () => { cleanupFn!() })

    expect(result.current.toast.visible).toBe(false)
    setTimeoutSpy.mockRestore()
  })
})
