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

  it('does not throw when insertCheckIn fails', async () => {
    ;(insertCheckIn as jest.Mock).mockRejectedValueOnce(new Error('Not authenticated'))

    renderHook(() => useGeofenceNotifications())

    // Should not throw
    await act(async () => {
      await notificationResponseListener!(
        makeNotificationResponse('confirm-checkin', 'poi-1', 'Paludan')
      )
    })

    expect(insertCheckIn).toHaveBeenCalled()
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

  it('removes listener on unmount', () => {
    const Notifications = require('expo-notifications')
    const { unmount } = renderHook(() => useGeofenceNotifications())
    const removeMock = Notifications.addNotificationResponseReceivedListener.mock.results[0].value.remove

    unmount()
    expect(removeMock).toHaveBeenCalled()
  })
})
