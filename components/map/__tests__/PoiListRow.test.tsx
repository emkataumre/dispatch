/**
 * Tests for PoiListRow component.
 *
 * Covers: null/non-null avgRating display branches, toFixed(1) formatting,
 * and onPress(poi) wiring.
 */

import React from "react";
import { Text } from "react-native";
import { act, create, ReactTestInstance } from "react-test-renderer";
import { PoiListRow } from "../PoiListRow";
import { CATEGORY_LABELS } from "@/lib/poiCategories";
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

function findTexts(root: ReturnType<typeof create>): string[] {
  return root.root.findAllByType(Text).map((n: ReactTestInstance) => String(n.props.children));
}

describe("PoiListRow", () => {
  it('shows "No ratings" when avgRating is null', () => {
    const poi = makePoi();
    let root: ReturnType<typeof create>;

    act(() => {
      root = create(<PoiListRow poi={poi} avgRating={null} onPress={jest.fn()} />);
    });

    expect(findTexts(root!)).toContain("No ratings");
  });

  it("formats avgRating with one decimal and a star when not null", () => {
    const poi = makePoi();
    let root: ReturnType<typeof create>;

    act(() => {
      root = create(<PoiListRow poi={poi} avgRating={4.567} onPress={jest.fn()} />);
    });

    expect(findTexts(root!)).toContain("★ 4.6");
  });

  it("shows the correct category label from CATEGORY_LABELS", () => {
    const poi = makePoi({ category: "nightlife" });
    let root: ReturnType<typeof create>;

    act(() => {
      root = create(<PoiListRow poi={poi} avgRating={null} onPress={jest.fn()} />);
    });

    expect(findTexts(root!)).toContain(CATEGORY_LABELS["nightlife"]);
  });

  it("calls onPress with the poi when the row is pressed", () => {
    const onPress = jest.fn();
    const poi = makePoi({ id: "poi-press", name: "Pressed Cafe" });
    let root: ReturnType<typeof create>;

    act(() => {
      root = create(<PoiListRow poi={poi} avgRating={null} onPress={onPress} />);
    });

    const pressable = root!.root.findAll(
      (n: ReactTestInstance) =>
        n.props.testID === "poi-list-row" && typeof n.props.onPress === "function",
    )[0];

    act(() => {
      pressable.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(poi);
  });
});
