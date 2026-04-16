/**
 * Tests for useProximity hook and the getDistanceMeters Haversine helper.
 *
 * watchPositionAsync is a native API — we test the Haversine function directly
 * and mock expo-location for the hook behaviour tests.
 */

import React from "react";
import { act, create } from "react-test-renderer";

// ---------------------------------------------------------------------------
// Mock expo-location before any imports that trigger it.
// Define mock functions inside the factory (not as module-level consts) to
// avoid TDZ issues with Babel's jest.mock hoisting.
// ---------------------------------------------------------------------------

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  watchPositionAsync: jest.fn(),
}));

import * as ExpoLocation from "expo-location";
import { getDistanceMeters } from "../useProximity";
import { useProximity } from "../useProximity";

const mockRemove = jest.fn();
const mockWatchPositionAsync = ExpoLocation.watchPositionAsync as jest.Mock;

// ---------------------------------------------------------------------------
// renderHook helper (same pattern as other hook tests)
// ---------------------------------------------------------------------------

type HookResult<T> = { current: T };

function renderHook<T>(useHook: () => T): HookResult<T> {
  const result: HookResult<T> = { current: undefined as unknown as T };

  function TestComponent() {
    result.current = useHook();
    return null;
  }

  act(() => {
    create(React.createElement(TestComponent));
  });

  return result;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

// ---------------------------------------------------------------------------
// Haversine tests
// ---------------------------------------------------------------------------

describe("getDistanceMeters", () => {
  it("returns 0 for identical coordinates", () => {
    // Fix 8: use toBeLessThan(1) instead of toBe(0) to avoid floating-point brittleness
    expect(getDistanceMeters(55.6761, 12.5683, 55.6761, 12.5683)).toBeLessThan(1);
  });

  it("returns approximately correct distance for two known Copenhagen points", () => {
    // Copenhagen City Hall (55.6761, 12.5683) to Nyhavn (55.6800, 12.5900)
    // Straight-line distance is roughly 1.5 km
    const dist = getDistanceMeters(55.6761, 12.5683, 55.68, 12.59);
    expect(dist).toBeGreaterThan(1_400);
    expect(dist).toBeLessThan(1_700);
  });

  it("returns approximately correct distance for a ~100m separation", () => {
    // Move ~0.0009 degrees lat ≈ 100m
    const dist = getDistanceMeters(55.6761, 12.5683, 55.677, 12.5683);
    expect(dist).toBeGreaterThan(80);
    expect(dist).toBeLessThan(120);
  });
});

// ---------------------------------------------------------------------------
// Hook tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockRemove.mockReset();
  mockWatchPositionAsync.mockReset();
  mockWatchPositionAsync.mockResolvedValue({ remove: mockRemove });
});

describe("useProximity", () => {
  const TARGET = { lat: 55.6761, lng: 12.5683 };

  it("isNearby is false when target is null", async () => {
    const result = renderHook(() => useProximity(null));
    await flush();

    expect(result.current.isNearby).toBe(false);
    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
  });

  // Fix 3: make async, flush before invoking callback, assert callback is not null
  it("isNearby is true when simulated location is within 100m", async () => {
    let locationCallback:
      | ((loc: { coords: { latitude: number; longitude: number } }) => void)
      | null = null;

    mockWatchPositionAsync.mockImplementation((_opts: unknown, cb: typeof locationCallback) => {
      locationCallback = cb;
      return Promise.resolve({ remove: mockRemove });
    });

    const result = renderHook(() => useProximity(TARGET));
    await flush(); // ensure the .then has run

    expect(locationCallback).not.toBeNull();

    // Simulate location update ~50m away
    act(() => {
      locationCallback!({ coords: { latitude: 55.6766, longitude: 12.5683 } });
    });

    expect(result.current.isNearby).toBe(true);
  });

  // Fix 3: make async, flush before invoking callback, assert callback is not null
  it("isNearby is false when simulated location is beyond 100m", async () => {
    let locationCallback:
      | ((loc: { coords: { latitude: number; longitude: number } }) => void)
      | null = null;

    mockWatchPositionAsync.mockImplementation((_opts: unknown, cb: typeof locationCallback) => {
      locationCallback = cb;
      return Promise.resolve({ remove: mockRemove });
    });

    const result = renderHook(() => useProximity(TARGET));
    await flush(); // ensure the .then has run

    expect(locationCallback).not.toBeNull();

    // Simulate location update ~500m away
    act(() => {
      locationCallback!({ coords: { latitude: 55.6806, longitude: 12.5683 } });
    });

    expect(result.current.isNearby).toBe(false);
  });

  // Fix 4: test custom radiusMeters parameter
  it("isNearby is false when location is within default radius but beyond custom radiusMeters", async () => {
    let locationCallback:
      | ((loc: { coords: { latitude: number; longitude: number } }) => void)
      | null = null;

    mockWatchPositionAsync.mockImplementation((_opts: unknown, cb: typeof locationCallback) => {
      locationCallback = cb;
      return Promise.resolve({ remove: mockRemove });
    });

    // radiusMeters: 50 — target is ~80m away, within 100m but outside 50m
    const result = renderHook(() => useProximity(TARGET, 50));
    await flush(); // ensure the .then has run

    expect(locationCallback).not.toBeNull();

    // ~80m north of target (0.00072 degrees ≈ 80m)
    act(() => {
      locationCallback!({ coords: { latitude: 55.6769, longitude: 12.5683 } });
    });

    expect(result.current.isNearby).toBe(false);
  });

  // Fix 1: make async, await flush inside async act before unmounting
  it("calls subscription.remove() on cleanup", async () => {
    let instance: ReturnType<typeof create>;

    await act(async () => {
      instance = create(
        React.createElement(function TestComponent() {
          useProximity(TARGET);
          return null;
        }),
      );
    });

    await flush();

    act(() => {
      instance!.unmount();
    });

    expect(mockRemove).toHaveBeenCalled();
  });
});
