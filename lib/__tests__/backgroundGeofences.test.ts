import { Platform } from 'react-native'
import { getNearestPois, getGeofenceLimit, PoiSlim } from '../backgroundGeofences'

// Mock the modules that defineTask calls at import time
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}))
jest.mock('expo-location', () => ({
  startGeofencingAsync: jest.fn().mockResolvedValue(undefined),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopGeofencingAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  LocationGeofencingEventType: { Enter: 1, Exit: 2 },
  Accuracy: { Low: 2, Balanced: 3 },
  ActivityType: { Other: 3 },
}))
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id'),
}))
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../notifications', () => ({
  CHECKIN_CATEGORY: 'geofence-checkin',
}))

const SAMPLE_POIS: PoiSlim[] = [
  { id: 'a', name: 'Alpha', lat: 55.676, lng: 12.568 },
  { id: 'b', name: 'Bravo', lat: 55.680, lng: 12.570 },
  { id: 'c', name: 'Charlie', lat: 55.690, lng: 12.580 },
  { id: 'd', name: 'Delta', lat: 55.700, lng: 12.600 },
  { id: 'e', name: 'Echo', lat: 55.750, lng: 12.650 },
]

describe('getNearestPois', () => {
  it('returns the N nearest POIs sorted by distance', () => {
    // User is at Alpha's location — Alpha should be first
    const result = getNearestPois(SAMPLE_POIS, 55.676, 12.568, 3)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('a') // closest
    expect(result[1].id).toBe('b') // second closest
    expect(result[2].id).toBe('c') // third closest
  })

  it('returns all POIs when limit exceeds array length', () => {
    const result = getNearestPois(SAMPLE_POIS, 55.676, 12.568, 100)
    expect(result).toHaveLength(SAMPLE_POIS.length)
  })

  it('returns empty array for empty input', () => {
    const result = getNearestPois([], 55.676, 12.568, 5)
    expect(result).toHaveLength(0)
  })

  it('does not mutate the original array', () => {
    const original = [...SAMPLE_POIS]
    getNearestPois(SAMPLE_POIS, 55.750, 12.650, 2)
    expect(SAMPLE_POIS).toEqual(original)
  })
})

describe('getGeofenceLimit', () => {
  const originalOS = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS })
  })

  it('returns 20 for iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' })
    expect(getGeofenceLimit()).toBe(20)
  })

  it('returns 100 for Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' })
    expect(getGeofenceLimit()).toBe(100)
  })
})

describe('geofence task handler', () => {
  const TaskManager = require('expo-task-manager')
  const Notifications = require('expo-notifications')
  const AsyncStorage = require('@react-native-async-storage/async-storage')

  // Capture the handler at describe time — before any beforeEach clearAllMocks runs.
  // defineTask was called at module-load time when backgroundGeofences.ts was imported.
  const geofenceCall = TaskManager.defineTask.mock.calls.find(
    (c: [string, unknown]) => c[0] === 'dispatch-geofence-task'
  )
  const handler = geofenceCall![1] as (args: { data: unknown; error: unknown }) => Promise<void>

  beforeEach(() => {
    // Only clear the mocks we use in each test — not defineTask itself
    Notifications.scheduleNotificationAsync.mockClear()
    AsyncStorage.getItem.mockReset()
    AsyncStorage.setItem.mockReset()
    AsyncStorage.getItem.mockResolvedValue(null)
    AsyncStorage.setItem.mockResolvedValue(undefined)
  })

  it('schedules a notification on geofence enter', async () => {
    await handler({
      data: {
        eventType: 1, // Enter
        region: { identifier: 'poi-1::Paludan Bogcafé' },
      },
      error: null,
    })

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "You're at Paludan Bogcafé",
        body: 'Are you here? Tap to check in!',
        categoryIdentifier: 'geofence-checkin',
        data: { poiId: 'poi-1', poiName: 'Paludan Bogcafé' },
      },
      trigger: null, // Platform.OS defaults to 'ios' in jest; Android uses TIME_INTERVAL trigger with channelId
    })
  })

  it('does not schedule notification on exit event', async () => {
    await handler({
      data: {
        eventType: 2, // Exit
        region: { identifier: 'poi-1::Paludan' },
      },
      error: null,
    })

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('suppresses notification within cooldown window', async () => {
    AsyncStorage.getItem.mockResolvedValue((Date.now() - 1000).toString()) // 1 second ago

    await handler({
      data: {
        eventType: 1,
        region: { identifier: 'poi-1::Paludan' },
      },
      error: null,
    })

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('fires notification after cooldown expires', async () => {
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000 + 1000)
    AsyncStorage.getItem.mockResolvedValue(twoHoursAgo.toString())

    await handler({
      data: {
        eventType: 1,
        region: { identifier: 'poi-1::Paludan' },
      },
      error: null,
    })

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled()
  })

  it('correctly parses identifier with :: in the POI name', async () => {
    await handler({
      data: {
        eventType: 1,
        region: { identifier: 'poi-1::Café :: Lounge' },
      },
      error: null,
    })

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: { poiId: 'poi-1', poiName: 'Café :: Lounge' },
        }),
      })
    )
  })

  it('sets cooldown in AsyncStorage after firing', async () => {
    await handler({
      data: {
        eventType: 1,
        region: { identifier: 'poi-1::Paludan' },
      },
      error: null,
    })

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'geofence-cooldown:poi-1',
      expect.any(String)
    )
  })
})

describe('registerGeofences', () => {
  const Location = require('expo-location')
  const TaskManagerReg = require('expo-task-manager')
  const originalOS = Platform.OS

  beforeEach(() => {
    Location.startGeofencingAsync.mockClear()
    Location.startLocationUpdatesAsync.mockClear()
    TaskManagerReg.isTaskRegisteredAsync.mockClear()
    TaskManagerReg.isTaskRegisteredAsync.mockResolvedValue(false)
  })

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS })
  })

  it('registers all POIs on Android (limit 100 > 63 POIs)', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' })
    // Re-import to pick up the new Platform.OS
    const { registerGeofences } = require('../backgroundGeofences')

    // Generate 63 POIs — all fit under Android's 100 limit
    const pois: PoiSlim[] = Array.from({ length: 63 }, (_, i) => ({
      id: `poi-${i}`,
      name: `Place ${i}`,
      lat: 55.676 + i * 0.001,
      lng: 12.568 + i * 0.001,
    }))

    await registerGeofences(pois, { latitude: 55.676, longitude: 12.568 })

    const regions = Location.startGeofencingAsync.mock.calls[0][1]
    expect(regions).toHaveLength(63)
  })

  it('registers nearest 20 POIs on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' })
    const { registerGeofences } = require('../backgroundGeofences')

    const pois: PoiSlim[] = Array.from({ length: 63 }, (_, i) => ({
      id: `poi-${i}`,
      name: `Place ${i}`,
      lat: 55.676 + i * 0.001,
      lng: 12.568 + i * 0.001,
    }))

    await registerGeofences(pois, { latitude: 55.676, longitude: 12.568 })

    const regions = Location.startGeofencingAsync.mock.calls[0][1]
    expect(regions).toHaveLength(20)
  })
})
