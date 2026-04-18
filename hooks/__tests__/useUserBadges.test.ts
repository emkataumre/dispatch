import React from "react";
import { act, create } from "react-test-renderer";

// ---------------------------------------------------------------------------
// Mock leaf fns
// ---------------------------------------------------------------------------
const mockProfileSingleFn = jest.fn();
const mockBadgesQueryFn = jest.fn();
const mockUseAuth = jest.fn();

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock("@/lib/supabase", () => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({ single: mockProfileSingleFn })),
            })),
          };
        }
        if (table === "user_badges") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => mockBadgesQueryFn()),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table in mock: ${table}`);
      }),
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn(),
    },
  };
});

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { useUserBadges } from "../useUserBadges";

// ---------------------------------------------------------------------------
// renderHook + flush helpers
// ---------------------------------------------------------------------------
type HookResult<T> = { current: T };

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
  await act(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SEMESTER_ID = "sem-2026";
const USER_ID = "user-1";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ session: { user: { id: USER_ID } } });
  mockProfileSingleFn.mockResolvedValue({ data: { semester_id: SEMESTER_ID }, error: null });
});

describe("useUserBadges — awarded badges mapping", () => {
  it("returns empty set when no badges awarded", async () => {
    mockBadgesQueryFn.mockResolvedValue({ data: [], error: null });

    const result = renderHook(() => useUserBadges());
    await flush();

    expect(result.current.awardedIds.size).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("maps badge_id rows to a Set", async () => {
    mockBadgesQueryFn.mockResolvedValue({
      data: [{ badge_id: "first_step" }, { badge_id: "pioneer" }],
      error: null,
    });

    const result = renderHook(() => useUserBadges());
    await flush();

    expect(result.current.awardedIds.has("first_step")).toBe(true);
    expect(result.current.awardedIds.has("pioneer")).toBe(true);
    expect(result.current.awardedIds.has("night_owl")).toBe(false);
    expect(result.current.awardedIds.size).toBe(2);
  });

  it("handles null data as empty set", async () => {
    mockBadgesQueryFn.mockResolvedValue({ data: null, error: null });

    const result = renderHook(() => useUserBadges());
    await flush();

    expect(result.current.awardedIds.size).toBe(0);
    expect(result.current.error).toBeNull();
  });
});

describe("useUserBadges — edge cases", () => {
  it("returns empty set and skips user_badges query when semester_id is null", async () => {
    mockProfileSingleFn.mockResolvedValue({ data: { semester_id: null }, error: null });

    const result = renderHook(() => useUserBadges());
    await flush();

    expect(result.current.awardedIds.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(mockBadgesQueryFn).not.toHaveBeenCalled();
  });

  it("returns empty set and no error when unauthenticated", async () => {
    mockUseAuth.mockReturnValue({ session: null });

    const result = renderHook(() => useUserBadges());
    await flush();

    expect(result.current.awardedIds.size).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockProfileSingleFn).not.toHaveBeenCalled();
  });

  it("sets error and skips user_badges query when profiles fetch fails", async () => {
    mockProfileSingleFn.mockResolvedValue({
      data: null,
      error: { message: "profile fetch failed" },
    });

    const result = renderHook(() => useUserBadges());
    await flush();

    expect(result.current.error).toBe("profile fetch failed");
    expect(result.current.isLoading).toBe(false);
    expect(mockBadgesQueryFn).not.toHaveBeenCalled();
  });

  it("sets error when user_badges query fails", async () => {
    mockBadgesQueryFn.mockResolvedValue({ data: null, error: { message: "query failed" } });

    const result = renderHook(() => useUserBadges());
    await flush();

    expect(result.current.error).toBe("query failed");
    expect(result.current.awardedIds.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });
});
