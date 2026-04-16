import { Platform } from "react-native";
import { getNearestPois, getGeofenceLimit, PoiSlim } from "../backgroundGeofences";

// Mock the modules that defineTask calls at import time
jest.mock("expo-task-manager", () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));
jest.mock("expo-location", () => ({
  startGeofencingAsync: jest.fn().mockResolvedValue(undefined),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopGeofencingAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  LocationGeofencingEventType: { Enter: 1, Exit: 2 },
  Accuracy: { Low: 2, Balanced: 3 },
  ActivityType: { Other: 3 },
}));
jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue("notif-id"),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../notifications", () => ({
  CHECKIN_CATEGORY: "geofence-checkin",
  setupNotificationCategories: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() =>
        Promise.resolve({
          data: [
            { id: "poi-1", name: "Alpha", lat: 55.676, lng: 12.568 },
            { id: "poi-2", name: "Bravo", lat: 55.68, lng: 12.57 },
          ],
          error: null,
        }),
      ),
    })),
  },
}));

const SAMPLE_POIS: PoiSlim[] = [
  { id: "a", name: "Alpha", lat: 55.676, lng: 12.568 },
  { id: "b", name: "Bravo", lat: 55.68, lng: 12.57 },
  { id: "c", name: "Charlie", lat: 55.69, lng: 12.58 },
  { id: "d", name: "Delta", lat: 55.7, lng: 12.6 },
  { id: "e", name: "Echo", lat: 55.75, lng: 12.65 },
];

describe("getNearestPois", () => {
  it("returns the N nearest POIs sorted by distance", () => {
    // User is at Alpha's location — Alpha should be first
    const result = getNearestPois(SAMPLE_POIS, 55.676, 12.568, 3);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("a"); // closest
    expect(result[1].id).toBe("b"); // second closest
    expect(result[2].id).toBe("c"); // third closest
  });

  it("returns all POIs when limit exceeds array length", () => {
    const result = getNearestPois(SAMPLE_POIS, 55.676, 12.568, 100);
    expect(result).toHaveLength(SAMPLE_POIS.length);
  });

  it("returns empty array for empty input", () => {
    const result = getNearestPois([], 55.676, 12.568, 5);
    expect(result).toHaveLength(0);
  });

  it("does not mutate the original array", () => {
    const original = [...SAMPLE_POIS];
    getNearestPois(SAMPLE_POIS, 55.75, 12.65, 2);
    expect(SAMPLE_POIS).toEqual(original);
  });
});

describe("getGeofenceLimit", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS });
  });

  it("returns 20 for iOS", () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    expect(getGeofenceLimit()).toBe(20);
  });

  it("returns 100 for Android", () => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    expect(getGeofenceLimit()).toBe(100);
  });
});

describe("geofence task handler", () => {
  const TaskManager = require("expo-task-manager");
  const Notifications = require("expo-notifications");
  const AsyncStorage = require("@react-native-async-storage/async-storage");

  // Capture the handler at describe time — before any beforeEach clearAllMocks runs.
  // defineTask was called at module-load time when backgroundGeofences.ts was imported.
  const geofenceCall = TaskManager.defineTask.mock.calls.find(
    (c: [string, unknown]) => c[0] === "dispatch-geofence-task",
  );
  const handler = geofenceCall![1] as (args: { data: unknown; error: unknown }) => Promise<void>;

  beforeEach(() => {
    // Only clear the mocks we use in each test — not defineTask itself
    Notifications.scheduleNotificationAsync.mockClear();
    AsyncStorage.getItem.mockReset();
    AsyncStorage.setItem.mockReset();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it("schedules a notification on geofence enter", async () => {
    await handler({
      data: {
        eventType: 1, // Enter
        region: { identifier: "poi-1::Paludan Bogcafé" },
      },
      error: null,
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: "geofence-checkin:poi-1",
      content: {
        title: "You're at Paludan Bogcafé",
        body: "Are you here? Tap to check in!",
        categoryIdentifier: "geofence-checkin",
        data: { poiId: "poi-1", poiName: "Paludan Bogcafé" },
      },
      trigger: null, // Platform.OS defaults to 'ios' in jest; Android uses TIME_INTERVAL trigger with channelId
    });
  });

  it("does not schedule notification on exit event", async () => {
    await handler({
      data: {
        eventType: 2, // Exit
        region: { identifier: "poi-1::Paludan" },
      },
      error: null,
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("does not schedule notification when error is provided", async () => {
    await handler({
      data: {
        eventType: 1,
        region: { identifier: "poi-1::Paludan" },
      },
      error: { message: "Location unavailable" },
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("does not schedule notification when region.identifier is missing", async () => {
    await handler({
      data: {
        eventType: 1,
        region: { identifier: "" },
      },
      error: null,
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("suppresses notification within cooldown window", async () => {
    AsyncStorage.getItem.mockResolvedValue((Date.now() - 1000).toString()); // 1 second ago

    await handler({
      data: {
        eventType: 1,
        region: { identifier: "poi-1::Paludan" },
      },
      error: null,
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("fires notification after cooldown expires", async () => {
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000 + 1000);
    AsyncStorage.getItem.mockResolvedValue(twoHoursAgo.toString());

    await handler({
      data: {
        eventType: 1,
        region: { identifier: "poi-1::Paludan" },
      },
      error: null,
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it("correctly parses identifier with :: in the POI name", async () => {
    await handler({
      data: {
        eventType: 1,
        region: { identifier: "poi-1::Café :: Lounge" },
      },
      error: null,
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "geofence-checkin:poi-1",
        content: expect.objectContaining({
          data: { poiId: "poi-1", poiName: "Café :: Lounge" },
        }),
      }),
    );
  });

  it("sets cooldown only after successful notification", async () => {
    await handler({
      data: {
        eventType: 1,
        region: { identifier: "poi-1::Paludan" },
      },
      error: null,
    });

    // Verify setCooldown was called after scheduleNotificationAsync
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "geofence-cooldown:poi-1",
      expect.any(String),
    );
  });

  it("does not set cooldown when notification fails", async () => {
    Notifications.scheduleNotificationAsync.mockRejectedValueOnce(new Error("Channel not found"));

    await handler({
      data: {
        eventType: 1,
        region: { identifier: "poi-1::Paludan" },
      },
      error: null,
    });

    // setCooldown (setItem for cooldown key) should NOT have been called
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      "geofence-cooldown:poi-1",
      expect.any(String),
    );
  });

  it("allows notification when AsyncStorage.getItem fails (cooldown check)", async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error("Storage full"));

    await handler({
      data: {
        eventType: 1,
        region: { identifier: "poi-1::Paludan" },
      },
      error: null,
    });

    // Should allow the notification rather than silently blocking
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
});

describe("SLC task handler", () => {
  const TaskManager = require("expo-task-manager");
  const AsyncStorage = require("@react-native-async-storage/async-storage");
  const Location = require("expo-location");
  const originalOS = Platform.OS;

  const slcCall = TaskManager.defineTask.mock.calls.find(
    (c: [string, unknown]) => c[0] === "dispatch-slc-task",
  );
  const handler = slcCall![1] as (args: { data: unknown; error: unknown }) => Promise<void>;

  beforeEach(() => {
    AsyncStorage.getItem.mockReset();
    AsyncStorage.setItem.mockReset();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    Location.startGeofencingAsync.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS });
  });

  it("skips re-registration on Android", async () => {
    Object.defineProperty(Platform, "OS", { value: "android" });

    await handler({
      data: { locations: [{ coords: { latitude: 55.676, longitude: 12.568 } }] },
      error: null,
    });

    expect(Location.startGeofencingAsync).not.toHaveBeenCalled();
  });

  it("skips when locations array is empty", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });

    await handler({
      data: { locations: [] },
      error: null,
    });

    expect(Location.startGeofencingAsync).not.toHaveBeenCalled();
  });

  it("skips when distance moved is below threshold", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });

    // Stored location is very close to the new one (< 500m)
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ latitude: 55.676, longitude: 12.568 }));

    await handler({
      data: { locations: [{ coords: { latitude: 55.6761, longitude: 12.5681 } }] },
      error: null,
    });

    expect(Location.startGeofencingAsync).not.toHaveBeenCalled();
  });

  it("re-registers and updates stored location when distance exceeds threshold", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });

    // Stored location is far from the new one (> 500m)
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ latitude: 55.67, longitude: 12.56 }));

    await handler({
      data: { locations: [{ coords: { latitude: 55.69, longitude: 12.59 } }] },
      error: null,
    });

    expect(Location.startGeofencingAsync).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "geofence-slc-last-loc",
      JSON.stringify({ latitude: 55.69, longitude: 12.59 }),
    );
  });

  it("does not throw when error parameter is provided", async () => {
    await handler({
      data: { locations: [] },
      error: { message: "something broke" },
    });

    expect(Location.startGeofencingAsync).not.toHaveBeenCalled();
  });
});

describe("stopGeofences", () => {
  const Location = require("expo-location");

  beforeEach(() => {
    Location.stopGeofencingAsync.mockClear();
    Location.stopLocationUpdatesAsync.mockClear();
    Location.stopGeofencingAsync.mockResolvedValue(undefined);
    Location.stopLocationUpdatesAsync.mockResolvedValue(undefined);
  });

  it("calls both stop functions", async () => {
    const { stopGeofences } = require("../backgroundGeofences");
    await stopGeofences();

    expect(Location.stopGeofencingAsync).toHaveBeenCalledWith("dispatch-geofence-task");
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith("dispatch-slc-task");
  });

  it("does not throw when tasks are not registered", async () => {
    Location.stopGeofencingAsync.mockRejectedValue(new Error("Task not registered"));
    Location.stopLocationUpdatesAsync.mockRejectedValue(new Error("Task not found"));

    const { stopGeofences } = require("../backgroundGeofences");
    await expect(stopGeofences()).resolves.toBeUndefined();
  });
});

describe("registerGeofences", () => {
  const Location = require("expo-location");
  const TaskManagerReg = require("expo-task-manager");
  const originalOS = Platform.OS;

  beforeEach(() => {
    Location.startGeofencingAsync.mockClear();
    Location.startLocationUpdatesAsync.mockClear();
    TaskManagerReg.isTaskRegisteredAsync.mockClear();
    TaskManagerReg.isTaskRegisteredAsync.mockResolvedValue(false);
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS });
  });

  it("stops existing geofence task before re-registering", async () => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    const { registerGeofences } = require("../backgroundGeofences");

    // Track call order via a shared array
    const callOrder: string[] = [];
    Location.stopGeofencingAsync.mockImplementation(() => {
      callOrder.push("stopGeofencing");
      return Promise.resolve(undefined);
    });
    Location.startGeofencingAsync.mockImplementation(() => {
      callOrder.push("startGeofencing");
      return Promise.resolve(undefined);
    });

    const pois: PoiSlim[] = [{ id: "poi-1", name: "Test", lat: 55.676, lng: 12.568 }];

    await registerGeofences(pois, { latitude: 55.676, longitude: 12.568 });

    expect(Location.stopGeofencingAsync).toHaveBeenCalledWith("dispatch-geofence-task");
    expect(callOrder.indexOf("stopGeofencing")).toBeLessThan(callOrder.indexOf("startGeofencing"));
  });

  it("tolerates not-registered error when stopping geofence task", async () => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    Location.stopGeofencingAsync.mockRejectedValueOnce(new Error("Task not registered"));

    const { registerGeofences } = require("../backgroundGeofences");
    const pois: PoiSlim[] = [{ id: "poi-1", name: "Test", lat: 55.676, lng: 12.568 }];

    // Should not throw — the error is silently swallowed
    await expect(registerGeofences(pois)).resolves.toBeUndefined();
    expect(Location.startGeofencingAsync).toHaveBeenCalled();
  });

  it("registers all POIs on Android (limit 100 > 63 POIs)", async () => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    const { registerGeofences } = require("../backgroundGeofences");

    // Generate 63 POIs — all fit under Android's 100 limit
    const pois: PoiSlim[] = Array.from({ length: 63 }, (_, i) => ({
      id: `poi-${i}`,
      name: `Place ${i}`,
      lat: 55.676 + i * 0.001,
      lng: 12.568 + i * 0.001,
    }));

    await registerGeofences(pois, { latitude: 55.676, longitude: 12.568 });

    const regions = Location.startGeofencingAsync.mock.calls[0][1];
    expect(regions).toHaveLength(63);
  });

  it("registers nearest 20 POIs on iOS", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    const { registerGeofences } = require("../backgroundGeofences");

    const pois: PoiSlim[] = Array.from({ length: 63 }, (_, i) => ({
      id: `poi-${i}`,
      name: `Place ${i}`,
      lat: 55.676 + i * 0.001,
      lng: 12.568 + i * 0.001,
    }));

    await registerGeofences(pois, { latitude: 55.676, longitude: 12.568 });

    const regions = Location.startGeofencingAsync.mock.calls[0][1];
    expect(regions).toHaveLength(20);
  });

  it("uses Copenhagen center when no currentLocation provided", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    const { registerGeofences } = require("../backgroundGeofences");

    const pois: PoiSlim[] = Array.from({ length: 5 }, (_, i) => ({
      id: `poi-${i}`,
      name: `Place ${i}`,
      lat: 55.676 + i * 0.01,
      lng: 12.568 + i * 0.01,
    }));

    await registerGeofences(pois); // no second argument

    expect(Location.startGeofencingAsync).toHaveBeenCalled();
    const regions = Location.startGeofencingAsync.mock.calls[0][1];
    expect(regions).toHaveLength(5);
  });

  it("sets notifyOnEnter: true and notifyOnExit: false on each region", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    const { registerGeofences } = require("../backgroundGeofences");

    const pois: PoiSlim[] = [{ id: "poi-1", name: "Test", lat: 55.676, lng: 12.568 }];

    await registerGeofences(pois, { latitude: 55.676, longitude: 12.568 });

    const regions = Location.startGeofencingAsync.mock.calls[0][1];
    expect(regions[0]).toEqual(
      expect.objectContaining({
        notifyOnEnter: true,
        notifyOnExit: false,
        radius: 100,
      }),
    );
  });
});
