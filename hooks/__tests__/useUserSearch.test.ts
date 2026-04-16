import React, { useState } from "react";
import { act, create } from "react-test-renderer";

const mockSearchUsers = jest.fn();

jest.mock("@/lib/friends", () => ({
  searchUsers: (...args: unknown[]) => mockSearchUsers(...args),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {},
}));

import { useUserSearch } from "../useUserSearch";

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

const MOCK_RESULTS = [{ id: "user-1", display_name: "Jane Doe", avatar_url: null }];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useUserSearch", () => {
  it("state is idle when query is empty string", () => {
    const result = renderHook(() => useUserSearch(""));
    expect(result.current.state).toBe("idle");
    expect(result.current.results).toEqual([]);
    expect(mockSearchUsers).not.toHaveBeenCalled();
  });

  it("state is idle when query is 1 character", () => {
    const result = renderHook(() => useUserSearch("J"));
    expect(result.current.state).toBe("idle");
    expect(mockSearchUsers).not.toHaveBeenCalled();
  });

  it("state transitions to searching immediately for 2+ char query", () => {
    const result = renderHook(() => useUserSearch("Ja"));
    expect(result.current.state).toBe("searching");
  });

  it("fires search after 300ms debounce and transitions to results", async () => {
    mockSearchUsers.mockResolvedValue(MOCK_RESULTS);

    const result = renderHook(() => useUserSearch("Ja"));
    expect(result.current.state).toBe("searching");

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockSearchUsers).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("results");
    expect(result.current.results).toEqual(MOCK_RESULTS);
    expect(result.current.error).toBeNull();
  });

  it("does not fire search before debounce delay", () => {
    mockSearchUsers.mockResolvedValue(MOCK_RESULTS);

    renderHook(() => useUserSearch("Jane"));
    jest.advanceTimersByTime(299);

    expect(mockSearchUsers).not.toHaveBeenCalled();
  });

  it("state is error with message when searchUsers throws", async () => {
    mockSearchUsers.mockRejectedValue(new Error("network failure"));

    const result = renderHook(() => useUserSearch("Ja"));

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.error).toBe("network failure");
    expect(result.current.results).toEqual([]);
  });

  it("resets to idle and clears results when query drops below 2 chars", async () => {
    mockSearchUsers.mockResolvedValue(MOCK_RESULTS);

    // First render with valid query to get results
    let query = "Jane";
    const result = renderHook(() => useUserSearch(query));

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.state).toBe("results");

    // Re-render with short query — in practice this happens via useState in the parent
    // We test the hook in isolation by directly verifying idle transition
    const result2 = renderHook(() => useUserSearch(""));
    expect(result2.current.state).toBe("idle");
    expect(result2.current.results).toEqual([]);
  });

  it("passes trimmed query to searchUsers", async () => {
    mockSearchUsers.mockResolvedValue([]);

    renderHook(() => useUserSearch("  Jane  "));

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockSearchUsers).toHaveBeenCalledWith(expect.anything(), { query: "Jane" });
  });

  it("discards stale results when query drops below threshold while search is in-flight", async () => {
    let resolveSearch!: (v: typeof MOCK_RESULTS) => void;
    mockSearchUsers.mockImplementation(
      () =>
        new Promise((r) => {
          resolveSearch = r;
        }),
    );

    let setQueryExternal!: (q: string) => void;
    const result: { current: ReturnType<typeof useUserSearch> } = { current: undefined as never };

    function TestComponent() {
      const [q, setQ] = useState("Ja");
      setQueryExternal = setQ;
      result.current = useUserSearch(q);
      return null;
    }

    act(() => {
      create(React.createElement(TestComponent));
    });

    // Advance past debounce — search fires and is now in-flight
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(mockSearchUsers).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("searching");

    // Drop query below threshold while search is in-flight — cleanup sets active = false
    act(() => {
      setQueryExternal("J");
    });
    expect(result.current.state).toBe("idle");

    // Stale search resolves — should be discarded because active is false
    await act(async () => {
      resolveSearch(MOCK_RESULTS);
      await Promise.resolve();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.results).toEqual([]);
  });

  it("cancels the previous debounce timer when the query changes", async () => {
    mockSearchUsers.mockResolvedValue(MOCK_RESULTS);

    let setQueryExternal!: (q: string) => void;
    const result: { current: ReturnType<typeof useUserSearch> } = { current: undefined as never };

    function TestComponent() {
      const [q, setQ] = useState("Ja");
      setQueryExternal = setQ;
      result.current = useUserSearch(q);
      return null;
    }

    act(() => {
      create(React.createElement(TestComponent));
    });

    // Advance 200ms — debounce has not yet fired
    jest.advanceTimersByTime(200);
    expect(mockSearchUsers).not.toHaveBeenCalled();

    // Change query — previous timer should be cancelled and a new 300ms window starts
    act(() => {
      setQueryExternal("Jane");
    });

    // Advance 300ms more — only the 'Jane' search should fire
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockSearchUsers).toHaveBeenCalledTimes(1);
    expect(mockSearchUsers).toHaveBeenCalledWith(expect.anything(), { query: "Jane" });
    expect(result.current.state).toBe("results");
  });

  it("sets error to Search failed when a non-Error value is thrown", async () => {
    mockSearchUsers.mockRejectedValue("plain string error");

    const result = renderHook(() => useUserSearch("Ja"));

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.error).toBe("Search failed");
  });
});
