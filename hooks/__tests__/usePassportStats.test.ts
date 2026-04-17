/**
 * Tests for usePassportStats hook.
 *
 * Two Supabase queries under test:
 *   1. profiles → select(semester_id) → eq(id) → single()
 *   2. check_ins → select(poi_id, checked_in_at, pois(name)) → eq(user_id) → eq(semester_id) → order()
 *
 * The mock branches on the table name (same pattern as useLivePresences.test.ts).
 * Variables referenced inside jest.mock() factories must be mock-prefixed.
 *
 * IMPORTANT: Always use result.current (not destructured `current`) when asserting
 * values that change after async state updates. Destructuring captures a stale
 * reference to the first render's return object; result.current is updated on
 * every re-render.
 */

import React from "react";
import { act, create } from "react-test-renderer";

// ---------------------------------------------------------------------------
// Mock leaf fns
// ---------------------------------------------------------------------------
const mockSingleFn = jest.fn(); // profiles query terminal
const mockOrderFn = jest.fn(); // check_ins query terminal
const mockUseAuth = jest.fn();

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single: mockSingleFn })),
          })),
        };
      }
      // check_ins
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: mockOrderFn,
            })),
          })),
        })),
      };
    }),
  },
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { usePassportStats } from "../usePassportStats";

// ---------------------------------------------------------------------------
// renderHook + flush helpers
// ---------------------------------------------------------------------------
type HookResult<T> = { current: T };

// Store the renderer so afterEach can unmount it, preventing async state
// updates from landing on an orphaned tree and silently swallowing failures.
let activeRenderer: ReturnType<typeof create> | null = null;

afterEach(() => {
  if (activeRenderer) {
    act(() => {
      activeRenderer!.unmount();
    });
    activeRenderer = null;
  }
});

function renderHook<T>(useHook: () => T): HookResult<T> {
  const result: HookResult<T> = { current: undefined as unknown as T };
  function TestComponent() {
    result.current = useHook();
    return null;
  }
  act(() => {
    activeRenderer = create(React.createElement(TestComponent));
  });
  return result;
}

async function flush() {
  // setImmediate fires after all pending microtasks drain — needed because the hook
  // has two sequential awaits (profile query → check_ins query). A single
  // Promise.resolve() tick only resolves the first; setImmediate lets the full
  // microtask queue empty before act processes state updates.
  await act(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SEMESTER_ID = "sem-2026";
const USER_ID = "user-1";

function makeCheckIn(poiId: string, poiName: string, checkedInAt: string) {
  return {
    poi_id: poiId,
    checked_in_at: checkedInAt,
    pois: { name: poiName },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ session: { user: { id: USER_ID } } });
  mockSingleFn.mockResolvedValue({ data: { semester_id: SEMESTER_ID }, error: null });
});

describe("usePassportStats — authenticated user with active semester", () => {
  it("returns zeros when there are no check-ins", async () => {
    mockOrderFn.mockResolvedValue({ data: [], error: null });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.totalCheckIns).toBe(0);
    expect(result.current.uniquePois).toBe(0);
    expect(result.current.mostVisited).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("counts total check-ins correctly", async () => {
    mockOrderFn.mockResolvedValue({
      data: [
        makeCheckIn("poi-1", "Paludan", "2026-03-10T12:00:00Z"),
        makeCheckIn("poi-1", "Paludan", "2026-03-11T12:00:00Z"),
        makeCheckIn("poi-2", "La Banchina", "2026-03-12T12:00:00Z"),
      ],
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.totalCheckIns).toBe(3);
  });

  it("counts unique POIs correctly", async () => {
    mockOrderFn.mockResolvedValue({
      data: [
        makeCheckIn("poi-1", "Paludan", "2026-03-10T12:00:00Z"),
        makeCheckIn("poi-1", "Paludan", "2026-03-11T12:00:00Z"),
        makeCheckIn("poi-2", "La Banchina", "2026-03-12T12:00:00Z"),
        makeCheckIn("poi-3", "Gasoline Grill", "2026-03-13T12:00:00Z"),
      ],
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.uniquePois).toBe(3);
  });

  it("returns the POI with the most visits as mostVisited", async () => {
    mockOrderFn.mockResolvedValue({
      data: [
        makeCheckIn("poi-1", "Paludan", "2026-03-13T12:00:00Z"),
        makeCheckIn("poi-2", "La Banchina", "2026-03-12T12:00:00Z"),
        makeCheckIn("poi-2", "La Banchina", "2026-03-11T12:00:00Z"),
        makeCheckIn("poi-1", "Paludan", "2026-03-10T12:00:00Z"),
        makeCheckIn("poi-2", "La Banchina", "2026-03-09T12:00:00Z"),
      ],
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.mostVisited).toEqual({ poiId: "poi-2", name: "La Banchina", count: 3 });
  });

  it("tiebreaks by most recent check-in when two POIs share top count", async () => {
    // poi-1 and poi-2 both have 2 visits; poi-1's most recent is later → wins.
    mockOrderFn.mockResolvedValue({
      data: [
        makeCheckIn("poi-1", "Paludan", "2026-03-15T12:00:00Z"), // most recent overall
        makeCheckIn("poi-2", "La Banchina", "2026-03-14T12:00:00Z"),
        makeCheckIn("poi-1", "Paludan", "2026-03-10T12:00:00Z"),
        makeCheckIn("poi-2", "La Banchina", "2026-03-09T12:00:00Z"),
      ],
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.mostVisited?.poiId).toBe("poi-1");
    expect(result.current.mostVisited?.name).toBe("Paludan");
    expect(result.current.mostVisited?.count).toBe(2);
  });

  it("sets error state when check_ins query fails", async () => {
    mockOrderFn.mockResolvedValue({ data: null, error: { message: "network error" } });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.error).toBe("network error");
    expect(result.current.totalCheckIns).toBe(0);
  });
});

describe("usePassportStats — edge cases", () => {
  it("returns zeros when profile has no active semester (semester_id null)", async () => {
    mockSingleFn.mockResolvedValue({ data: { semester_id: null }, error: null });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.totalCheckIns).toBe(0);
    expect(result.current.uniquePois).toBe(0);
    expect(result.current.mostVisited).toBeNull();
    // check_ins query must NOT have been called
    expect(mockOrderFn).not.toHaveBeenCalled();
  });

  it("returns zeros and no error when user is not authenticated", async () => {
    mockUseAuth.mockReturnValue({ session: null });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.totalCheckIns).toBe(0);
    expect(result.current.uniquePois).toBe(0);
    expect(result.current.mostVisited).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockSingleFn).not.toHaveBeenCalled();
  });

  it("sets error state when profiles query fails", async () => {
    mockSingleFn.mockResolvedValue({ data: null, error: { message: "profile fetch failed" } });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.error).toBe("profile fetch failed");
    expect(mockOrderFn).not.toHaveBeenCalled();
  });
});
