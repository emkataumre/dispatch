import React from "react";
import { act, create } from "react-test-renderer";
import { BadgeUnlockToast } from "../BadgeUnlockToast";
import type { BadgeDefinition } from "@/lib/badges/catalog";

const BADGE_A: BadgeDefinition = {
  id: "first_step",
  name: "First Step",
  description: "Made your very first check-in.",
  criteriaHint: "Check in anywhere for the first time.",
  category: "milestone",
  icon: "👣",
};

const BADGE_B: BadgeDefinition = {
  id: "pioneer",
  name: "Pioneer",
  description: "One of the summer 2026 cohort.",
  criteriaHint: "Auto-awarded on signup.",
  category: "exclusive",
  icon: "🚀",
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("BadgeUnlockToast — auto-dismiss", () => {
  it("calls onDismiss after 3s when a badge is shown", () => {
    const onDismiss = jest.fn();
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BadgeUnlockToast badge={BADGE_A} onDismiss={onDismiss} />);
    });

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);

    act(() => {
      root!.unmount();
    });
  });

  it("clears the original timer when badge changes mid-display", () => {
    const onDismiss = jest.fn();
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BadgeUnlockToast badge={BADGE_A} onDismiss={onDismiss} />);
    });

    // 2.5s in — original timer has not fired yet.
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // Swap to a new badge — original 3s timer should be cleared.
    act(() => {
      root!.update(<BadgeUnlockToast badge={BADGE_B} onDismiss={onDismiss} />);
    });

    // 500ms more reaches the ORIGINAL 3s deadline — if the timer wasn't
    // cleared, onDismiss would fire here. It must not.
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // 2500ms more completes the NEW 3s timer (total 3000ms since swap).
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);

    act(() => {
      root!.unmount();
    });
  });
});
