/**
 * Tests for PresenceLayer component.
 *
 * Uses react-test-renderer. Mapbox.MarkerView is mocked as a passthrough component
 * so we can inspect children without a native Mapbox context.
 */

import React from "react";
import { act, create, ReactTestInstance } from "react-test-renderer";
import { PresenceLayer } from "../PresenceLayer";
import { PresenceBubble } from "../PresenceBubble";
import { Tables } from "@/types/supabase";
import { LivePresenceEntry } from "@/hooks/useLivePresences";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock("@rnmapbox/maps", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: {
      MarkerView: function MockMarkerView({
        children,
        id,
        coordinate,
        allowOverlap,
      }: {
        children: React.ReactNode;
        id: string;
        coordinate: number[];
        allowOverlap?: boolean;
      }) {
        return React.createElement("MarkerView", { id, coordinate, allowOverlap }, children);
      },
    },
  };
});

jest.mock("../PresenceBubble", () => ({
  PresenceBubble: (props: { displayName: string; avatarUrl: string | null }) =>
    require("react").createElement("PresenceBubble", props),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type Poi = Tables<"pois">;

function makePoi(overrides: Partial<Poi> = {}): Poi {
  return {
    id: "poi-1",
    name: "Test Cafe",
    category: "food_drink",
    lat: 55.6761,
    lng: 12.5683,
    description: null,
    created_by: "user-1",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  } as Poi;
}

function makePresence(overrides: Partial<LivePresenceEntry> = {}): LivePresenceEntry {
  return {
    id: "presence-1",
    userId: "user-2",
    poiId: "poi-1",
    displayName: "Jane Doe",
    avatarUrl: null,
    message: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PresenceLayer", () => {
  it("renders nothing when presences is empty", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<PresenceLayer presences={[]} pois={[makePoi()]} onPoiPress={jest.fn()} />);
    });

    const markers = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "MarkerView",
    );
    expect(markers.length).toBe(0);
  });

  it("renders a MarkerView at the correct POI coordinates", () => {
    const poi = makePoi({ id: "poi-1", lng: 12.5683, lat: 55.6761 });
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(
        <PresenceLayer presences={[makePresence()]} pois={[poi]} onPoiPress={jest.fn()} />,
      );
    });

    const markers = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "MarkerView",
    );
    expect(markers.length).toBe(1);
    expect(markers[0].props.coordinate).toEqual([12.5683, 55.6761]);
  });

  it("renders one PresenceBubble for a single presence at a POI", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(
        <PresenceLayer presences={[makePresence()]} pois={[makePoi()]} onPoiPress={jest.fn()} />,
      );
    });

    const bubbles = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "PresenceBubble",
    );
    expect(bubbles.length).toBe(1);
    expect(bubbles[0].props.displayName).toBe("Jane Doe");
  });

  it("renders multiple bubbles in one MarkerView when several users are at the same POI", () => {
    const presences = [
      makePresence({ id: "p-1", displayName: "Jane Doe" }),
      makePresence({ id: "p-2", userId: "user-3", displayName: "Bob Smith" }),
    ];
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(
        <PresenceLayer presences={presences} pois={[makePoi()]} onPoiPress={jest.fn()} />,
      );
    });

    const markers = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "MarkerView",
    );
    expect(markers.length).toBe(1);

    const bubbles = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "PresenceBubble",
    );
    expect(bubbles.length).toBe(2);
  });

  it("caps visible bubbles at 3 and shows an overflow pill for extras", () => {
    const presences = Array.from({ length: 5 }, (_, i) =>
      makePresence({ id: `p-${i}`, userId: `user-${i + 2}`, displayName: `User ${i}` }),
    );
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(
        <PresenceLayer presences={presences} pois={[makePoi()]} onPoiPress={jest.fn()} />,
      );
    });

    const bubbles = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "PresenceBubble",
    );
    expect(bubbles.length).toBe(3);

    const texts = root!.root.findAll(
      (n: ReactTestInstance) =>
        (n.type as string) === "Text" && String(n.props.children).startsWith("+"),
    );
    expect(texts.length).toBe(1);
    expect(texts[0].props.children).toBe("+2");
  });

  it("calls onPoiPress with the correct POI when a bubble is tapped", () => {
    const poi = makePoi();
    const onPoiPress = jest.fn();
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(
        <PresenceLayer presences={[makePresence()]} pois={[poi]} onPoiPress={onPoiPress} />,
      );
    });

    const pressable = root!.root.findAll(
      (n: ReactTestInstance) => typeof n.props.onPress === "function",
    )[0];
    act(() => {
      pressable.props.onPress();
    });

    expect(onPoiPress).toHaveBeenCalledWith(poi);
  });

  it("gives separate MarkerViews to presences at different POIs", () => {
    const poi1 = makePoi({ id: "poi-1" });
    const poi2 = makePoi({ id: "poi-2", lng: 12.57, lat: 55.68 });
    const presences = [
      makePresence({ id: "p-1", poiId: "poi-1" }),
      makePresence({ id: "p-2", userId: "user-3", poiId: "poi-2" }),
    ];
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(
        <PresenceLayer presences={presences} pois={[poi1, poi2]} onPoiPress={jest.fn()} />,
      );
    });

    const markers = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "MarkerView",
    );
    expect(markers.length).toBe(2);
  });

  it("renders MarkerView with allowOverlap so bubbles are visible at all zoom levels", () => {
    const presence = makePresence();
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(
        <PresenceLayer presences={[presence]} pois={[makePoi()]} onPoiPress={jest.fn()} />,
      );
    });

    const marker = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "MarkerView",
    )[0];
    expect(marker.props.allowOverlap).toBe(true);
  });

  it("skips a presence whose POI is not in the pois array", () => {
    const presence = makePresence({ poiId: "poi-unknown" });
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(
        <PresenceLayer
          presences={[presence]}
          pois={[makePoi({ id: "poi-1" })]}
          onPoiPress={jest.fn()}
        />,
      );
    });

    const markers = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "MarkerView",
    );
    expect(markers.length).toBe(0);
  });
});
