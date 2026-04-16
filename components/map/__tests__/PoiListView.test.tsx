/**
 * Tests for PoiListView component.
 *
 * Uses react-test-renderer (same primitives as jest-expo).
 * No @testing-library/react-native required.
 */

import React from "react";
import { act, create, ReactTestInstance } from "react-test-renderer";
import { PoiListView } from "../PoiListView";
import { PoiListRow } from "../PoiListRow";
import { Tables } from "@/types/supabase";

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

describe("PoiListView", () => {
  it("renders the empty state when pois array is empty", () => {
    let root: ReturnType<typeof create>;

    act(() => {
      root = create(<PoiListView pois={[]} avgRatings={{}} onPoiPress={jest.fn()} />);
    });

    // Verify the empty container is present by testID.
    // findAll returns both the React component node and the host node, so check > 0.
    const emptyNodes = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === "poi-list-empty",
    );
    expect(emptyNodes.length).toBeGreaterThan(0);
  });

  it("wires onPoiPress and poi to each PoiListRow", () => {
    const onPress = jest.fn();
    const poi = makePoi({ id: "poi-abc", name: "Paludan Bogcafé" });

    let root: ReturnType<typeof create>;

    act(() => {
      root = create(<PoiListView pois={[poi]} avgRatings={{}} onPoiPress={onPress} />);
    });

    // Assert prop wiring directly on the React component instance.
    // PoiListView is responsible for passing the right props to PoiListRow;
    // PoiListRow's own Pressable behaviour is its own concern.
    const row = root!.root.findByType(PoiListRow);
    expect(row.props.onPress).toBe(onPress);
    expect(row.props.poi).toEqual(poi);
  });

  it("forwards the correct avgRating from avgRatings map to each row", () => {
    const poi = makePoi({ id: "poi-abc", name: "Test Cafe" });

    let root: ReturnType<typeof create>;

    act(() => {
      root = create(
        <PoiListView pois={[poi]} avgRatings={{ "poi-abc": 4.5 }} onPoiPress={jest.fn()} />,
      );
    });

    const row = root!.root.findByType(PoiListRow);
    expect(row.props.avgRating).toBe(4.5);
  });

  it("passes null avgRating when POI has no entry in avgRatings", () => {
    const poi = makePoi({ id: "poi-xyz" });

    let root: ReturnType<typeof create>;

    act(() => {
      root = create(<PoiListView pois={[poi]} avgRatings={{}} onPoiPress={jest.fn()} />);
    });

    const row = root!.root.findByType(PoiListRow);
    expect(row.props.avgRating).toBeNull();
  });

  it("renders one row per POI", () => {
    const pois = [
      makePoi({ id: "poi-1", name: "Cafe 1" }),
      makePoi({ id: "poi-2", name: "Cafe 2" }),
      makePoi({ id: "poi-3", name: "Cafe 3" }),
    ];

    let root: ReturnType<typeof create>;

    act(() => {
      root = create(<PoiListView pois={pois} avgRatings={{}} onPoiPress={jest.fn()} />);
    });

    // findAllByType counts React component instances, not host nodes — one per row.
    const rows = root!.root.findAllByType(PoiListRow);
    expect(rows.length).toBe(3);
  });
});
