/**
 * Tests for usePassportStats.
 *
 * Mocks supabase.rpc and useAuth so the hook never hits the network.
 * Uses the same minimal renderHook helper pattern as the other hook tests
 * in this directory (react-test-renderer + React.act).
 */

import React from "react";
import { act, create } from "react-test-renderer";

const mockRpcFn = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: mockRpcFn,
  },
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { usePassportStats } from "../usePassportStats";

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

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ session: { user: { id: "user-1" } } });
});

describe("usePassportStats", () => {
  it("returns zero stats when RPC returns a row with zero counts", async () => {
    mockRpcFn.mockResolvedValue({
      data: [{ total_check_ins: 0, unique_pois: 0, most_visited_poi_id: null }],
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.totalCheckIns).toBe(0);
    expect(result.current.uniquePois).toBe(0);
    expect(result.current.mostVisitedPoiId).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("maps RPC snake_case fields to camelCase stats", async () => {
    mockRpcFn.mockResolvedValue({
      data: [{ total_check_ins: 12, unique_pois: 5, most_visited_poi_id: "poi-abc" }],
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.totalCheckIns).toBe(12);
    expect(result.current.uniquePois).toBe(5);
    expect(result.current.mostVisitedPoiId).toBe("poi-abc");
    expect(result.current.loading).toBe(false);
  });

  it("mostVisitedPoiId is null when most_visited_poi_id is null (tied visit counts)", async () => {
    mockRpcFn.mockResolvedValue({
      data: [{ total_check_ins: 4, unique_pois: 4, most_visited_poi_id: null }],
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.mostVisitedPoiId).toBeNull();
    expect(result.current.totalCheckIns).toBe(4);
  });

  it("sets error and leaves stats at defaults when RPC returns an error", async () => {
    mockRpcFn.mockResolvedValue({ data: null, error: { message: "RPC failed" } });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.error).toBe("RPC failed");
    expect(result.current.totalCheckIns).toBe(0);
    expect(result.current.uniquePois).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it("does not call RPC when session is absent", async () => {
    mockUseAuth.mockReturnValue({ session: null });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(mockRpcFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
