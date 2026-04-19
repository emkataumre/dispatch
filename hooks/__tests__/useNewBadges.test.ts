import React from "react";
import { act, create } from "react-test-renderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type InsertPayload = { new: { badge_id: string } };
type InsertHandler = (payload: InsertPayload) => void;
type StatusHandler = (status: string, err?: Error) => void;

// ---------------------------------------------------------------------------
// Mock leaf fns (mock* prefix — only lookups inside factory must be lazy)
// ---------------------------------------------------------------------------
const mockUseAuth = jest.fn();

const mockChannel = {
  on: jest.fn(),
  subscribe: jest.fn(),
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
  },
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { useNewBadges, type NewBadgesState } from "../useNewBadges";
import { supabase } from "@/lib/supabase";
import { BADGE_BY_ID } from "@/lib/badges/catalog";

const channelFn = supabase.channel as unknown as jest.Mock;
const removeChannelFn = supabase.removeChannel as unknown as jest.Mock;

// ---------------------------------------------------------------------------
// renderHook helper (mirrors hooks/__tests__/useUserBadges.test.ts)
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

// ---------------------------------------------------------------------------
// Constants + setup
// ---------------------------------------------------------------------------
const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";

let capturedInsertHandler: InsertHandler | null = null;
let capturedSubscribeHandler: StatusHandler | null = null;

// Guard against silent drift if the catalog ever renames "pioneer".
beforeAll(() => {
  expect(BADGE_BY_ID.has("pioneer")).toBe(true);
});

beforeEach(() => {
  jest.clearAllMocks();
  capturedInsertHandler = null;
  capturedSubscribeHandler = null;

  mockChannel.on.mockImplementation((_event: string, _cfg: unknown, handler: InsertHandler) => {
    capturedInsertHandler = handler;
    return mockChannel;
  });
  mockChannel.subscribe.mockImplementation((handler: StatusHandler) => {
    capturedSubscribeHandler = handler;
    return mockChannel;
  });

  const { AppState } = require("react-native");
  AppState.currentState = "active";

  mockUseAuth.mockReturnValue({ session: { user: { id: USER_ID } } });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useNewBadges — INSERT handling", () => {
  it("sets newBadge when INSERT arrives with known badge_id", () => {
    const result = renderHook(() => useNewBadges());

    expect(capturedInsertHandler).not.toBeNull();
    act(() => {
      capturedInsertHandler!({ new: { badge_id: "pioneer" } });
    });

    expect(result.current.newBadge?.id).toBe("pioneer");
  });

  it("ignores INSERT when AppState is not active (app backgrounded)", () => {
    // Mount while active so subscribe-time state isn't what's under test;
    // then flip to background so the in-handler guard is exercised.
    const result = renderHook(() => useNewBadges());

    const { AppState } = require("react-native");
    AppState.currentState = "background";
    act(() => {
      capturedInsertHandler!({ new: { badge_id: "pioneer" } });
    });

    expect(result.current.newBadge).toBeNull();
  });

  it("silently no-ops when badge_id is not in catalog", () => {
    const result = renderHook(() => useNewBadges());

    act(() => {
      capturedInsertHandler!({ new: { badge_id: "ghost_badge_not_in_catalog" } });
    });

    expect(result.current.newBadge).toBeNull();
  });
});

describe("useNewBadges — channel lifecycle", () => {
  it("removes channel on unmount", () => {
    renderHook(() => useNewBadges());

    expect(channelFn).toHaveBeenCalledTimes(1);
    expect(channelFn.mock.calls[0][0]).toMatch(/^new-badges-\d+-[\d.]+$/);
    expect(removeChannelFn).not.toHaveBeenCalled();

    act(() => {
      activeRenderer!.unmount();
    });
    activeRenderer = null;

    expect(removeChannelFn).toHaveBeenCalledTimes(1);
  });

  it("removes old channel and creates new one when userId changes", () => {
    const result: HookResult<NewBadgesState> = {
      current: undefined as unknown as NewBadgesState,
    };
    function TestComponent() {
      result.current = useNewBadges();
      return null;
    }

    act(() => {
      activeRenderer = create(React.createElement(TestComponent));
    });
    expect(channelFn).toHaveBeenCalledTimes(1);
    expect(channelFn.mock.calls[0][0]).toMatch(/^new-badges-\d+-[\d.]+$/);
    expect(removeChannelFn).not.toHaveBeenCalled();

    mockUseAuth.mockReturnValue({ session: { user: { id: OTHER_USER_ID } } });
    act(() => {
      activeRenderer!.update(React.createElement(TestComponent));
    });

    expect(removeChannelFn).toHaveBeenCalledTimes(1);
    expect(channelFn).toHaveBeenCalledTimes(2);
    expect(channelFn.mock.calls[1][0]).toMatch(/^new-badges-\d+-[\d.]+$/);
  });
});

describe("useNewBadges — dismiss", () => {
  it("clears newBadge when dismiss is called", () => {
    const result = renderHook(() => useNewBadges());

    act(() => {
      capturedInsertHandler!({ new: { badge_id: "pioneer" } });
    });
    expect(result.current.newBadge?.id).toBe("pioneer");

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.newBadge).toBeNull();
  });
});

describe("useNewBadges — Realtime status", () => {
  it("sets realtimeError on CHANNEL_ERROR (foreground)", () => {
    const result = renderHook(() => useNewBadges());
    expect(result.current.realtimeError).toBeNull();

    act(() => {
      capturedSubscribeHandler!("CHANNEL_ERROR");
    });

    expect(result.current.realtimeError).not.toBeNull();
  });

  it("sets realtimeError on TIMED_OUT (foreground)", () => {
    const result = renderHook(() => useNewBadges());

    act(() => {
      capturedSubscribeHandler!("TIMED_OUT");
    });

    expect(result.current.realtimeError).not.toBeNull();
  });

  it("clears realtimeError on SUBSCRIBED after a prior error", () => {
    const result = renderHook(() => useNewBadges());

    act(() => {
      capturedSubscribeHandler!("CHANNEL_ERROR");
    });
    expect(result.current.realtimeError).not.toBeNull();

    act(() => {
      capturedSubscribeHandler!("SUBSCRIBED");
    });
    expect(result.current.realtimeError).toBeNull();
  });

  it("sets realtimeError on CLOSED when app is foregrounded", () => {
    const result = renderHook(() => useNewBadges());

    act(() => {
      capturedSubscribeHandler!("CLOSED");
    });

    expect(result.current.realtimeError).not.toBeNull();
  });

  it("does not set realtimeError on CLOSED when app is backgrounded", () => {
    const result = renderHook(() => useNewBadges());

    const { AppState } = require("react-native");
    AppState.currentState = "background";
    act(() => {
      capturedSubscribeHandler!("CLOSED");
    });

    expect(result.current.realtimeError).toBeNull();
  });
});
