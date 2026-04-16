/**
 * Tests for BroadcastingPill component.
 *
 * Follows the same react-test-renderer pattern used by PresenceBubble.test.tsx
 * and other component tests in this directory.
 */

import React from "react";
import { Pressable, Text } from "react-native";
import { act, create, ReactTestInstance } from "react-test-renderer";
import { BroadcastingPill } from "../BroadcastingPill";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findByTestID(root: ReturnType<typeof create>, testID: string): ReactTestInstance | null {
  const results = root.root.findAll((n: ReactTestInstance) => n.props.testID === testID);
  return results.length > 0 ? results[0] : null;
}

function findTextNodes(root: ReturnType<typeof create>): ReactTestInstance[] {
  return root.root.findAll((n: ReactTestInstance) => (n.type as string) === "Text");
}

// RN Text nodes render template-literal children as arrays (e.g. ["At ", "Café"]).
// Flatten to a plain string before asserting on content.
function childrenToString(children: unknown): string {
  if (Array.isArray(children)) return children.map(childrenToString).join("");
  return String(children ?? "");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BroadcastingPill", () => {
  it("renders 'At {poiName}' label with the passed poiName", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="The Corner Café" onEnd={jest.fn()} />);
    });

    const texts = findTextNodes(root!);
    const labelNode = texts.find((n) =>
      childrenToString(n.props.children).includes("The Corner Café"),
    );
    expect(labelNode).toBeDefined();
    expect(childrenToString(labelNode!.props.children)).toContain("At The Corner Café");
  });

  it("renders the separator '·' between the label and End button", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Bakken" onEnd={jest.fn()} />);
    });

    const texts = findTextNodes(root!);
    const separatorNode = texts.find((n) => String(n.props.children).includes("·"));
    expect(separatorNode).toBeDefined();
  });

  it("renders an 'End' button with the correct testID", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Tivoli" onEnd={jest.fn()} />);
    });

    const endButton = findByTestID(root!, "broadcasting-pill-end");
    expect(endButton).not.toBeNull();
  });

  it("calls onEnd once when the End button is tapped", async () => {
    const onEnd = jest.fn(() => Promise.resolve());
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Nørreport" onEnd={onEnd} />);
    });

    await act(async () => {
      findByTestID(root!, "broadcasting-pill-end")!.props.onPress();
    });

    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("does not show error text initially (no error state on mount)", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Amagertorv" onEnd={jest.fn()} />);
    });

    const errorNode = findByTestID(root!, "broadcasting-pill-error");
    expect(errorNode).toBeNull();
  });

  it("disables the End button while onEnd is pending (dismissing state)", async () => {
    let resolveFn!: () => void;
    const slowOnEnd = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        }),
    );

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Strøget" onEnd={slowOnEnd} />);
    });

    // Press — starts the pending promise
    act(() => {
      findByTestID(root!, "broadcasting-pill-end")!.props.onPress();
    });

    // While still pending, the Pressable should have disabled={true}
    const endButton = findByTestID(root!, "broadcasting-pill-end");
    expect(endButton!.props.disabled).toBe(true);

    // Resolve to clean up
    await act(async () => {
      resolveFn();
    });
  });

  it("second rapid tap while pending is a no-op (onEnd called only once)", async () => {
    let resolveFn!: () => void;
    const slowOnEnd = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        }),
    );

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Rådhuspladsen" onEnd={slowOnEnd} />);
    });

    // First press — starts the pending promise
    act(() => {
      findByTestID(root!, "broadcasting-pill-end")!.props.onPress();
    });

    // Second press while dismissing — should be ignored
    act(() => {
      findByTestID(root!, "broadcasting-pill-end")!.props.onPress();
    });

    // Clean up
    await act(async () => {
      resolveFn();
    });

    expect(slowOnEnd).toHaveBeenCalledTimes(1);
  });

  it("shows inline error text when onEnd rejects", async () => {
    const failingOnEnd = jest.fn(() => Promise.reject(new Error("Network error")));
    // Suppress console.error for expected error path
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Vesterbro" onEnd={failingOnEnd} />);
    });

    await act(async () => {
      findByTestID(root!, "broadcasting-pill-end")!.props.onPress();
    });

    consoleSpy.mockRestore();

    const errorNode = findByTestID(root!, "broadcasting-pill-error");
    expect(errorNode).not.toBeNull();
    expect(String(errorNode!.props.children)).toContain("Couldn't end broadcast");
  });

  it("error text color is #E51E1E", async () => {
    const failingOnEnd = jest.fn(() => Promise.reject(new Error("Fail")));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Nørrebro" onEnd={failingOnEnd} />);
    });

    await act(async () => {
      findByTestID(root!, "broadcasting-pill-end")!.props.onPress();
    });

    consoleSpy.mockRestore();

    const errorNode = findByTestID(root!, "broadcasting-pill-error");
    expect(errorNode).not.toBeNull();

    // style may be an array or an object — look for color in all layers
    const getColor = (style: unknown): string | undefined => {
      if (Array.isArray(style)) {
        for (const s of style) {
          const c = getColor(s);
          if (c) return c;
        }
        return undefined;
      }
      return (style as Record<string, unknown> | null)?.color as string | undefined;
    };

    expect(getColor(errorNode!.props.style)).toBe("#E51E1E");
  });

  it("re-enables the End button after onEnd rejects", async () => {
    const failingOnEnd = jest.fn(() => Promise.reject(new Error("Fail")));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Frederiksberg" onEnd={failingOnEnd} />);
    });

    await act(async () => {
      findByTestID(root!, "broadcasting-pill-end")!.props.onPress();
    });

    consoleSpy.mockRestore();

    // Button must be re-enabled so the user can retry
    const endButton = findByTestID(root!, "broadcasting-pill-end");
    expect(endButton!.props.disabled).toBe(false);
  });

  it("clears error state on next successful End tap", async () => {
    let callCount = 0;
    const onEnd = jest.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error("First attempt fails"));
      return Promise.resolve();
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<BroadcastingPill poiName="Østerbro" onEnd={onEnd} />);
    });

    // First tap — error surfaces
    await act(async () => {
      findByTestID(root!, "broadcasting-pill-end")!.props.onPress();
    });
    consoleSpy.mockRestore();

    expect(findByTestID(root!, "broadcasting-pill-error")).not.toBeNull();

    // Second tap — clears the error before calling onEnd, so if the call succeeds the error
    // should be gone after resolution
    await act(async () => {
      findByTestID(root!, "broadcasting-pill-end")!.props.onPress();
    });

    // After a successful second attempt the error should be cleared
    expect(findByTestID(root!, "broadcasting-pill-error")).toBeNull();
  });

  it("passes numberOfLines={1} and ellipsizeMode='tail' to the label", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(
        <BroadcastingPill poiName="A Very Long Place Name That Would Truncate" onEnd={jest.fn()} />,
      );
    });

    const texts = findTextNodes(root!);
    const labelNode = texts.find((n) =>
      childrenToString(n.props.children).includes("A Very Long Place Name"),
    );
    expect(labelNode).toBeDefined();
    expect(labelNode!.props.numberOfLines).toBe(1);
    expect(labelNode!.props.ellipsizeMode).toBe("tail");
  });
});
