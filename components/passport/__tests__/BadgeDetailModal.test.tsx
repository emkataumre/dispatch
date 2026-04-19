import React from "react";
import { act, create, ReactTestInstance } from "react-test-renderer";
import { BadgeDetailModal } from "../BadgeDetailModal";
import type { BadgeDefinition } from "@/lib/badges/catalog";

const MOCK_BADGE: BadgeDefinition = {
  id: "first_step",
  name: "First Step",
  description: "Made your very first check-in.",
  criteriaHint: "Check in anywhere for the first time.",
  category: "milestone",
  icon: "👣",
};

function allTextNodes(root: ReturnType<typeof create>): unknown[] {
  return root.root
    .findAll((n: ReactTestInstance) => (n.type as string) === "Text")
    .map((n) => n.props.children);
}

describe("BadgeDetailModal", () => {
  it("is not visible when badge is null", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BadgeDetailModal badge={null} onClose={() => {}} />);
    });

    // Query by testID to avoid relying on internal RN Modal host component type names.
    const modal = root!.root.findAll((n: ReactTestInstance) => n.props.testID === "badge-modal");
    expect(modal.length).toBeGreaterThanOrEqual(1);
    expect(modal[0].props.visible).toBe(false);
  });

  it("shows badge name and Locked chip when unlocked=false (default)", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BadgeDetailModal badge={MOCK_BADGE} onClose={() => {}} />);
    });

    const texts = allTextNodes(root!);
    expect(texts).toContain(MOCK_BADGE.name);
    expect(texts).toContain("Locked");
  });

  it("shows criteriaHint in the hint box when locked", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BadgeDetailModal badge={MOCK_BADGE} unlocked={false} onClose={() => {}} />);
    });

    expect(allTextNodes(root!)).toContain(MOCK_BADGE.criteriaHint);
  });

  it("shows Earned chip and hides criteriaHint when unlocked=true", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BadgeDetailModal badge={MOCK_BADGE} unlocked={true} onClose={() => {}} />);
    });

    const texts = allTextNodes(root!);
    expect(texts).toContain("Earned");
    expect(texts).not.toContain(MOCK_BADGE.criteriaHint);
  });

  it("renders close button", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BadgeDetailModal badge={MOCK_BADGE} onClose={() => {}} />);
    });

    const closeButtons = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === "badge-modal-close",
    );
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BadgeDetailModal badge={MOCK_BADGE} onClose={onClose} />);
    });

    act(() => {
      root!.root
        .findAll((n: ReactTestInstance) => n.props.testID === "badge-modal-close")[0]
        .props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is pressed", () => {
    const onClose = jest.fn();
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BadgeDetailModal badge={MOCK_BADGE} onClose={onClose} />);
    });

    act(() => {
      root!.root
        .findAll((n: ReactTestInstance) => n.props.testID === "badge-modal-backdrop")[0]
        .props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
