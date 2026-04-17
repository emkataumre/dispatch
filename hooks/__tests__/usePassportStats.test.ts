/**
 * Tests for usePassportStats hook.
 *
 * Two Supabase operations under test:
 *   1. profiles → select(semester_id) → eq(id) → single()
 *   2. rpc("get_passport_stats", { p_semester_id }) → single()
 *
 * Variables referenced inside jest.mock() factories must be mock-prefixed
 * (Jest hoisting requirement).
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
const mockRpcSingleFn = jest.fn(); // get_passport_stats RPC terminal
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
      throw new Error(`Unexpected table in mock: ${table}`);
    }),
    rpc: jest.fn(() => ({ single: mockRpcSingleFn })),
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
  // has two sequential awaits (profile query → RPC). A single Promise.resolve() tick
  // only resolves the first; setImmediate lets the full microtask queue empty before
  // act processes state updates.
  await act(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SEMESTER_ID = "sem-2026";
const USER_ID = "user-1";

function makeRpcRow(
  overrides?: Partial<{
    total_check_ins: number;
    unique_pois: number;
    most_visited_name: string | null;
    most_visited_count: number | null;
  }>,
) {
  return {
    total_check_ins: 0,
    unique_pois: 0,
    most_visited_name: null,
    most_visited_count: null,
    ...overrides,
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

describe("usePassportStats — RPC response mapping", () => {
  it("returns zeros when RPC returns zero stats", async () => {
    mockRpcSingleFn.mockResolvedValue({ data: makeRpcRow(), error: null });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.totalCheckIns).toBe(0);
    expect(result.current.uniquePois).toBe(0);
    expect(result.current.mostVisited).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("maps total_check_ins and unique_pois from RPC row", async () => {
    mockRpcSingleFn.mockResolvedValue({
      data: makeRpcRow({ total_check_ins: 7, unique_pois: 4 }),
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.totalCheckIns).toBe(7);
    expect(result.current.uniquePois).toBe(4);
  });

  it("maps most_visited_name + count to mostVisited when present", async () => {
    mockRpcSingleFn.mockResolvedValue({
      data: makeRpcRow({ most_visited_name: "Paludan", most_visited_count: 3 }),
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.mostVisited).toEqual({ name: "Paludan", count: 3 });
  });

  it("sets mostVisited null when most_visited_name is null", async () => {
    mockRpcSingleFn.mockResolvedValue({
      data: makeRpcRow({ total_check_ins: 5, most_visited_name: null }),
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.mostVisited).toBeNull();
  });

  it("sets error state when RPC fails", async () => {
    mockRpcSingleFn.mockResolvedValue({ data: null, error: { message: "rpc error" } });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.error).toBe("rpc error");
    expect(result.current.totalCheckIns).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("usePassportStats — edge cases", () => {
  it("returns zeros and skips RPC when profile has no active semester", async () => {
    mockSingleFn.mockResolvedValue({ data: { semester_id: null }, error: null });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.totalCheckIns).toBe(0);
    expect(result.current.uniquePois).toBe(0);
    expect(result.current.mostVisited).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockRpcSingleFn).not.toHaveBeenCalled();
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

  it("sets error state and skips RPC when profiles query fails", async () => {
    mockSingleFn.mockResolvedValue({ data: null, error: { message: "profile fetch failed" } });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.error).toBe("profile fetch failed");
    expect(result.current.isLoading).toBe(false);
    expect(mockRpcSingleFn).not.toHaveBeenCalled();
  });
});
