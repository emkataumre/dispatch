import React from "react";
import { act, create } from "react-test-renderer";

const mockRpcFn = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: mockRpcFn },
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
  it("returns zeroed stats when RPC returns no rows", async () => {
    mockRpcFn.mockResolvedValue({ data: [], error: null });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.stats).toEqual({
      totalCheckIns: 0,
      uniquePois: 0,
      mostVisitedPoiId: null,
    });
    expect(result.current.error).toBeNull();
  });

  it("maps RPC row fields to camelCase stats", async () => {
    mockRpcFn.mockResolvedValue({
      data: [{ total_check_ins: 5, unique_pois: 3, most_visited_poi_id: "poi-abc" }],
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.stats).toEqual({
      totalCheckIns: 5,
      uniquePois: 3,
      mostVisitedPoiId: "poi-abc",
    });
  });

  it("mostVisitedPoiId is null when RPC returns null for that field", async () => {
    mockRpcFn.mockResolvedValue({
      data: [{ total_check_ins: 2, unique_pois: 2, most_visited_poi_id: null }],
      error: null,
    });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.stats?.mostVisitedPoiId).toBeNull();
  });

  it("sets error state and leaves stats null when RPC returns an error", async () => {
    mockRpcFn.mockResolvedValue({ data: null, error: { message: "rpc error" } });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(result.current.error).toBe("rpc error");
    expect(result.current.stats).toBeNull();
  });

  it("does not call RPC and stats remains null when session is absent", async () => {
    mockUseAuth.mockReturnValue({ session: null });

    const result = renderHook(() => usePassportStats());
    await flush();

    expect(mockRpcFn).not.toHaveBeenCalled();
    expect(result.current.stats).toBeNull();
  });
});
