import React from "react";
import { act, create } from "react-test-renderer";

const mockUseAuth = jest.fn();

const mockSelect = jest.fn();
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
};

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({ select: mockSelect })),
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
  },
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { usePendingRequestCount } from "../usePendingRequestCount";
import { supabase } from "@/lib/supabase";

type HookResult<T> = { current: T };

function renderHook<T>(useHook: () => T): { result: HookResult<T>; unmount: () => void } {
  const result: HookResult<T> = { current: undefined as unknown as T };
  let root: ReturnType<typeof create>;
  function TestComponent() {
    result.current = useHook();
    return null;
  }
  act(() => {
    root = create(React.createElement(TestComponent));
  });
  return {
    result,
    unmount: () =>
      act(() => {
        root.unmount();
      }),
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

const USER_ID = "user-me";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ session: { user: { id: USER_ID } } });
  mockChannel.on.mockReturnThis();
});

describe("usePendingRequestCount", () => {
  it("returns 0 when unauthenticated", async () => {
    mockUseAuth.mockReturnValue({ session: null });
    const { result } = renderHook(() => usePendingRequestCount());
    await flush();

    expect(result.current).toBe(0);
  });

  it("returns the correct count from a successful query", async () => {
    const eq2 = jest.fn().mockResolvedValue({ count: 3, error: null });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    mockSelect.mockReturnValue({ eq: eq1 });

    const { result } = renderHook(() => usePendingRequestCount());
    await flush();

    expect(result.current).toBe(3);
    expect(eq1).toHaveBeenCalledWith("addressee_id", USER_ID);
    expect(eq2).toHaveBeenCalledWith("status", "pending");
  });

  it("returns 0 when the query returns null count", async () => {
    const eq2 = jest.fn().mockResolvedValue({ count: null, error: null });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    mockSelect.mockReturnValue({ eq: eq1 });

    const { result } = renderHook(() => usePendingRequestCount());
    await flush();

    expect(result.current).toBe(0);
  });

  it("keeps previous count on query error and logs the error", async () => {
    const eq2 = jest.fn().mockResolvedValue({ count: null, error: { message: "RLS denied" } });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    mockSelect.mockReturnValue({ eq: eq1 });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const { result } = renderHook(() => usePendingRequestCount());
    await flush();

    expect(result.current).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith("usePendingRequestCount: query error", "RLS denied");
    consoleSpy.mockRestore();
  });

  it("logs error on fetch exception", async () => {
    const eq2 = jest.fn().mockRejectedValue(new Error("network down"));
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    mockSelect.mockReturnValue({ eq: eq1 });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const { result } = renderHook(() => usePendingRequestCount());
    await flush();

    expect(result.current).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      "usePendingRequestCount: failed to fetch count",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("calls removeChannel on cleanup", async () => {
    const eq2 = jest.fn().mockResolvedValue({ count: 0, error: null });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    mockSelect.mockReturnValue({ eq: eq1 });

    const { unmount } = renderHook(() => usePendingRequestCount());
    await flush();

    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it("subscribes with a status callback for Realtime errors", async () => {
    const eq2 = jest.fn().mockResolvedValue({ count: 0, error: null });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    mockSelect.mockReturnValue({ eq: eq1 });

    renderHook(() => usePendingRequestCount());
    await flush();

    expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it("does not log an error when CLOSED fires after cleanup (unmount)", async () => {
    const eq2 = jest.fn().mockResolvedValue({ count: 0, error: null });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    mockSelect.mockReturnValue({ eq: eq1 });

    const { unmount } = renderHook(() => usePendingRequestCount());
    await flush();

    const statusHandler = mockChannel.subscribe.mock.calls[0][0] as (status: string) => void;
    act(() => {
      statusHandler("SUBSCRIBED");
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    unmount();
    act(() => {
      statusHandler("CLOSED");
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("suppresses error when CHANNEL_ERROR fires while app is backgrounded", async () => {
    const { AppState } = require("react-native");
    const original = AppState.currentState;
    const eq2 = jest.fn().mockResolvedValue({ count: 0, error: null });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    mockSelect.mockReturnValue({ eq: eq1 });

    renderHook(() => usePendingRequestCount());
    await flush();

    const statusHandler = mockChannel.subscribe.mock.calls[0][0] as (status: string) => void;
    act(() => {
      statusHandler("SUBSCRIBED");
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    AppState.currentState = "background";
    act(() => {
      statusHandler("CHANNEL_ERROR");
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    AppState.currentState = original;
  });

  it("refetches count after CHANNEL_ERROR + SUBSCRIBED reconnect", async () => {
    const eq2 = jest.fn().mockResolvedValue({ count: 3, error: null });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    mockSelect.mockReturnValue({ eq: eq1 });

    const { result } = renderHook(() => usePendingRequestCount());
    await flush();

    expect(eq2).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(3);

    const statusHandler = mockChannel.subscribe.mock.calls[0][0] as (
      status: string,
      err?: Error,
    ) => void;

    // Initial SUBSCRIBED — marks as subscribed-once, no refetch
    act(() => {
      statusHandler("SUBSCRIBED");
    });
    expect(eq2).toHaveBeenCalledTimes(1);

    // Channel error
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    act(() => {
      statusHandler("CHANNEL_ERROR");
    });
    consoleSpy.mockRestore();

    // Reconnect — should re-fetch with updated count
    eq2.mockResolvedValue({ count: 5, error: null });
    await act(async () => {
      statusHandler("SUBSCRIBED");
    });
    await flush();

    expect(eq2).toHaveBeenCalledTimes(2);
    expect(result.current).toBe(5);
  });
});
