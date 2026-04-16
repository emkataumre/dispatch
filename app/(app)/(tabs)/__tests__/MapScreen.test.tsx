/**
 * Tests for MapScreen behavioral contracts introduced in the POI list view feature.
 *
 * Mocks all child components so only MapScreen's own logic is under test.
 * Uses react-test-renderer + React.act (no @testing-library/react-native needed).
 */

import React from "react";
import { Text } from "react-native";
import { act, create, ReactTestInstance } from "react-test-renderer";

// ---------------------------------------------------------------------------
// Mapbox mock — Camera wires setCamera to a stable spy via useImperativeHandle.
// mockSetCamera is prefixed with "mock" so Jest hoisting allows it in the factory.
// ---------------------------------------------------------------------------
const mockSetCamera = jest.fn();

jest.mock("@rnmapbox/maps", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: {
      MapView: function MockMapView({ children }: { children: React.ReactNode }) {
        return React.createElement(React.Fragment, null, children);
      },
      Camera: React.forwardRef(function MockCamera(_: any, ref: any) {
        React.useImperativeHandle(ref, () => ({ setCamera: mockSetCamera }));
        return null;
      }),
      LocationPuck: function MockLocationPuck() {
        return null;
      },
      StyleURL: {
        Light: "mapbox://styles/mapbox/light-v10",
      },
    },
  };
});

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getBackgroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: "denied" })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 55.6761, longitude: 12.5683 } }),
  ),
  Accuracy: { High: 3, Low: 2 },
}));

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
}));

jest.mock("@/lib/backgroundGeofences", () => ({
  registerGeofences: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/notifications", () => ({
  setupNotificationCategories: jest.fn(() => Promise.resolve()),
  CHECKIN_CATEGORY: "geofence-checkin",
}));

jest.mock("@/components/BackgroundPermissionBanner", () => ({
  BackgroundPermissionBanner: () => null,
}));

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

jest.mock("@/lib/presence", () => ({
  dismissPresence: jest.fn(() => Promise.resolve()),
}));

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------
const mockRefetchRatings = jest.fn();

jest.mock("@/hooks/usePois", () => ({
  usePois: jest.fn(() => ({ pois: [], error: null })),
}));

jest.mock("@/hooks/useAllPoiRatings", () => ({
  useAllPoiRatings: jest.fn(() => ({
    avgRatings: {},
    loading: false,
    error: null,
    refetch: mockRefetchRatings,
  })),
}));

// Fix 5: use real useState so setBroadcast/clearBroadcast actually update activePresence
jest.mock("@/hooks/useActivePresence", () => {
  const { useState } = require("react");
  return {
    useActivePresence: () => {
      const [activePresence, setActivePresence] = useState(null);
      return {
        activePresence,
        loading: false,
        error: null,
        setBroadcast: setActivePresence,
        clearBroadcast: () => setActivePresence(null),
      };
    },
  };
});

// ---------------------------------------------------------------------------
// Child component mocks — render null so only MapScreen's own nodes are visible
// ---------------------------------------------------------------------------
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@/hooks/useFriendships", () => ({
  useFriendships: jest.fn(() => ({
    friends: [],
    incomingRequests: [],
    outgoingRequestMap: new Map(),
    sendRequest: jest.fn(),
    acceptRequest: jest.fn(),
    declineRequest: jest.fn(),
    cancelRequest: jest.fn(),
    unfriend: jest.fn(),
    getStatusForUser: jest.fn(() => "none"),
    getFriendshipId: jest.fn(() => null),
  })),
}));
jest.mock("@/hooks/useLivePresences", () => ({
  useLivePresences: jest.fn(() => ({ presences: [], loading: false, error: null })),
}));

jest.mock("@/hooks/usePresenceJoins", () => ({
  usePresenceJoins: jest.fn(() => ({
    joins: [],
    loading: false,
    error: null,
    join: jest.fn(),
    cancel: jest.fn(),
    getJoinForPresence: jest.fn(() => undefined),
  })),
}));
jest.mock("@/components/map/PoiLayer", () => ({ PoiLayer: (props: any) => null }));
jest.mock("@/components/map/PresenceLayer", () => ({ PresenceLayer: (props: any) => null }));
jest.mock("@/components/map/CategoryFilterBar", () => ({ CategoryFilterBar: () => null }));
jest.mock("@/components/map/PoiBottomSheet", () => ({ PoiBottomSheet: (props: any) => null }));
jest.mock("@/components/map/PoiListView", () => ({ PoiListView: (props: any) => null }));

// ---------------------------------------------------------------------------
// Imports resolve to mocked versions — used with findByType
// ---------------------------------------------------------------------------
import Mapbox from "@rnmapbox/maps";
import { usePois } from "@/hooks/usePois";
import { useAllPoiRatings } from "@/hooks/useAllPoiRatings";
import { useFriendships } from "@/hooks/useFriendships";
import { useLivePresences } from "@/hooks/useLivePresences";
import { usePresenceJoins } from "@/hooks/usePresenceJoins";
import { PoiLayer } from "@/components/map/PoiLayer";
import { PresenceLayer } from "@/components/map/PresenceLayer";
import { PoiBottomSheet } from "@/components/map/PoiBottomSheet";
import { PoiListView } from "@/components/map/PoiListView";
import { Tables } from "@/types/supabase";
import MapScreen from "../index";

type Poi = Tables<"pois">;

// RN Text nodes render template-literal children as arrays (e.g. ["At ", "Café"]).
// Flatten to a plain string before asserting on content.
function childrenToString(children: unknown): string {
  if (Array.isArray(children)) return children.map(childrenToString).join("");
  return String(children ?? "");
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MapScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePois as jest.Mock).mockReturnValue({ pois: [], error: null });
    (useAllPoiRatings as jest.Mock).mockReturnValue({
      avgRatings: {},
      loading: false,
      error: null,
      refetch: mockRefetchRatings,
    });
    (useFriendships as jest.Mock).mockReturnValue({
      friends: [],
      incomingRequests: [],
      outgoingRequestMap: new Map(),
      sendRequest: jest.fn(),
      acceptRequest: jest.fn(),
      declineRequest: jest.fn(),
      cancelRequest: jest.fn(),
      unfriend: jest.fn(),
      getStatusForUser: jest.fn(() => "none"),
      getFriendshipId: jest.fn(() => null),
      error: null,
    });
    (useLivePresences as jest.Mock).mockReturnValue({ presences: [], loading: false, error: null });
  });

  it("Camera initializes centered on Copenhagen at zoom 13", async () => {
    let root: ReturnType<typeof create>;

    await act(async () => {
      root = create(<MapScreen />);
    });

    const camera = root!.root.findByType(Mapbox.Camera);
    expect(camera.props.defaultSettings.centerCoordinate).toEqual([12.5683, 55.6761]);
    expect(camera.props.defaultSettings.zoomLevel).toBe(13);
  });

  it("handleSheetClose clears selected POI and calls refetchRatings", async () => {
    const poi = makePoi();
    let root: ReturnType<typeof create>;

    await act(async () => {
      root = create(<MapScreen />);
    });

    // Open bottom sheet by tapping a map POI
    act(() => {
      root!.root.findByType(PoiLayer).props.onPoiPress(poi);
    });
    expect(root!.root.findByType(PoiBottomSheet).props.poi).toEqual(poi);

    // Close the sheet
    act(() => {
      root!.root.findByType(PoiBottomSheet).props.onClose();
    });

    expect(root!.root.findByType(PoiBottomSheet).props.poi).toBeNull();
    expect(mockRefetchRatings).toHaveBeenCalledTimes(1);
  });

  it("handleListRowPress switches to map, opens bottom sheet, and flies camera to POI", async () => {
    const poi = makePoi({ id: "poi-fly", lat: 55.7, lng: 12.6 });
    let root: ReturnType<typeof create>;

    await act(async () => {
      root = create(<MapScreen />);
    });

    // Switch to list mode via the toggle button
    const toggle = root!.root.findAll(
      (n: ReactTestInstance) =>
        n.props.testID === "view-mode-toggle" && typeof n.props.onPress === "function",
    )[0];
    act(() => {
      toggle.props.onPress();
    });
    expect(root!.root.findAllByType(PoiListView).length).toBeGreaterThan(0);

    // Press a list row
    act(() => {
      root!.root.findByType(PoiListView).props.onPoiPress(poi);
    });

    // Map mode restored — list view is gone
    expect(root!.root.findAllByType(PoiListView).length).toBe(0);
    // Bottom sheet receives the pressed POI
    expect(root!.root.findByType(PoiBottomSheet).props.poi).toEqual(poi);
    // Camera flies to the POI's coordinates
    expect(mockSetCamera).toHaveBeenCalledWith({
      centerCoordinate: [poi.lng, poi.lat],
      zoomLevel: 15,
      animationDuration: 800,
    });
  });

  it("error banner shows POI connection message when usePois errors", async () => {
    (usePois as jest.Mock).mockReturnValue({ pois: [], error: "network error" });
    let root: ReturnType<typeof create>;

    await act(async () => {
      root = create(<MapScreen />);
    });

    const hasMessage = root!.root
      .findAllByType(Text)
      .some((n: ReactTestInstance) => String(n.props.children).includes("Couldn't load places"));
    expect(hasMessage).toBe(true);
  });

  it("error banner shows join status message when only usePresenceJoins errors", async () => {
    (usePresenceJoins as jest.Mock).mockReturnValue({
      joins: [],
      loading: false,
      error: "joins error",
      join: jest.fn(),
      cancel: jest.fn(),
      getJoinForPresence: jest.fn(() => undefined),
    });
    let root: ReturnType<typeof create>;

    await act(async () => {
      root = create(<MapScreen />);
    });

    const hasMessage = root!.root
      .findAllByType(Text)
      .some((n: ReactTestInstance) =>
        String(n.props.children).includes("Could not load join status"),
      );
    expect(hasMessage).toBe(true);
  });

  it("passes join, cancel, and getJoinForPresence from usePresenceJoins to PoiBottomSheet", async () => {
    const mockJoin = jest.fn();
    const mockCancel = jest.fn();
    const mockGetJoin = jest.fn(() => undefined);
    (usePresenceJoins as jest.Mock).mockReturnValue({
      joins: [],
      loading: false,
      error: null,
      join: mockJoin,
      cancel: mockCancel,
      getJoinForPresence: mockGetJoin,
    });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    const sheet = root!.root.findByType(PoiBottomSheet);
    expect(sheet.props.onJoinPresence).toBe(mockJoin);
    expect(sheet.props.onCancelJoin).toBe(mockCancel);
    expect(sheet.props.getJoinForPresence).toBe(mockGetJoin);
  });

  it("error banner shows ratings message when only useAllPoiRatings errors", async () => {
    (useAllPoiRatings as jest.Mock).mockReturnValue({
      avgRatings: {},
      loading: false,
      error: "ratings error",
      refetch: mockRefetchRatings,
    });
    let root: ReturnType<typeof create>;

    await act(async () => {
      root = create(<MapScreen />);
    });

    const hasMessage = root!.root
      .findAllByType(Text)
      .some((n: ReactTestInstance) => String(n.props.children).includes("Ratings unavailable"));
    expect(hasMessage).toBe(true);
  });

  it("return-to-location button calls setCamera with user coordinates", async () => {
    // render with async act so locationGranted flushes to true
    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    const btn = root!.root.findAll(
      (n: ReactTestInstance) =>
        n.props.testID === "return-to-location" && typeof n.props.onPress === "function",
    )[0];
    expect(btn).toBeDefined();

    await act(async () => {
      btn.props.onPress();
    });

    expect(mockSetCamera).toHaveBeenCalledWith({
      centerCoordinate: [12.5683, 55.6761],
      zoomLevel: 15,
      animationDuration: 800,
    });
  });

  it("hides LocationPuck and return-to-location button when permission is denied", async () => {
    const Location = require("expo-location");
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: "denied" });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    expect(root!.root.findAllByType(Mapbox.LocationPuck).length).toBe(0);
    const btns = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === "return-to-location",
    );
    expect(btns.length).toBe(0);
  });

  it("hides return-to-location button in list mode", async () => {
    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    // switch to list mode
    const toggle = root!.root.findAll(
      (n: ReactTestInstance) =>
        n.props.testID === "view-mode-toggle" && typeof n.props.onPress === "function",
    )[0];
    act(() => {
      toggle.props.onPress();
    });

    const btns = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === "return-to-location",
    );
    expect(btns.length).toBe(0);
  });

  it("renders LocationPuck when location permission is granted", async () => {
    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    expect(root!.root.findAllByType(Mapbox.LocationPuck).length).toBe(1);
  });

  it("passes unfiltered pois and presences from useLivePresences to PresenceLayer", async () => {
    const allPois = [
      makePoi({ id: "poi-1", category: "food_drink" }),
      makePoi({ id: "poi-2", category: "nightlife" }),
    ];
    const mockPresences = [
      {
        id: "p-1",
        userId: "u-2",
        poiId: "poi-1",
        displayName: "Jane",
        avatarUrl: null,
        message: null,
      },
    ];
    (usePois as jest.Mock).mockReturnValue({ pois: allPois, error: null });
    (useLivePresences as jest.Mock).mockReturnValue({
      presences: mockPresences,
      loading: false,
      error: null,
    });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    const layer = root!.root.findByType(PresenceLayer);
    // receives ALL pois, not filtered subset
    expect(layer.props.pois).toEqual(allPois);
    expect(layer.props.presences).toEqual(mockPresences);
  });

  it("passes handlePoiPress to PresenceLayer as onPoiPress and it opens the bottom sheet", async () => {
    const poi = makePoi();
    (usePois as jest.Mock).mockReturnValue({ pois: [poi], error: null });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    act(() => {
      root!.root.findByType(PresenceLayer).props.onPoiPress(poi);
    });

    expect(root!.root.findByType(PoiBottomSheet).props.poi).toEqual(poi);
  });

  // Fix 5: verify setBroadcast/clearBroadcast wiring through PoiBottomSheet props
  it("error banner shows friend list message when useFriendships errors", async () => {
    (useFriendships as jest.Mock).mockReturnValue({
      friends: [],
      incomingRequests: [],
      outgoingRequestMap: new Map(),
      sendRequest: jest.fn(),
      acceptRequest: jest.fn(),
      declineRequest: jest.fn(),
      cancelRequest: jest.fn(),
      unfriend: jest.fn(),
      getStatusForUser: jest.fn(() => "none"),
      getFriendshipId: jest.fn(() => null),
      error: "network error",
    });
    let root: ReturnType<typeof create>;

    await act(async () => {
      root = create(<MapScreen />);
    });

    const hasMessage = root!.root
      .findAllByType(Text)
      .some((n: ReactTestInstance) => String(n.props.children).includes("Friend list unavailable"));
    expect(hasMessage).toBe(true);
  });

  it("passes setBroadcast and clearBroadcast to PoiBottomSheet and they update activePresence", async () => {
    const mockPresence = {
      id: "presence-1",
      poi_id: "poi-1",
      message: "here now",
      visible_to: "friends" as const,
    };

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    const sheet = root!.root.findByType(PoiBottomSheet);

    // onBroadcast and onDismissBroadcast props must be functions
    expect(typeof sheet.props.onBroadcast).toBe("function");
    expect(typeof sheet.props.onDismissBroadcast).toBe("function");

    // Calling onBroadcast sets activePresence on the sheet
    act(() => {
      sheet.props.onBroadcast(mockPresence);
    });
    expect(root!.root.findByType(PoiBottomSheet).props.activePresence).toEqual(mockPresence);

    // Calling onDismissBroadcast clears it
    act(() => {
      sheet.props.onDismissBroadcast();
    });
    expect(root!.root.findByType(PoiBottomSheet).props.activePresence).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // BroadcastingPill visibility gating (AC 6, 7, 9)
  // ---------------------------------------------------------------------------

  // Helper: find the pill's End button by testID (present only when pill renders)
  function pillEndButton(root: ReturnType<typeof create>): ReactTestInstance | null {
    const results = root.root.findAll(
      (n: ReactTestInstance) => n.props.testID === "broadcasting-pill-end",
    );
    return results.length > 0 ? results[0] : null;
  }

  const MOCK_PRESENCE = {
    id: "presence-1",
    poi_id: "poi-1",
    message: null,
    visible_to: "friends" as const,
  };

  const MATCHING_POI = makePoi({ id: "poi-1", name: "Test Cafe" });

  it("pill is absent when activePresence is null (no active broadcast)", async () => {
    (usePois as jest.Mock).mockReturnValue({ pois: [MATCHING_POI], error: null });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    // No presence set — pill must not render
    expect(pillEndButton(root!)).toBeNull();
  });

  it("pill renders when activePresence is set and viewMode is map", async () => {
    (usePois as jest.Mock).mockReturnValue({ pois: [MATCHING_POI], error: null });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    // Set active presence via PoiBottomSheet's onBroadcast prop
    act(() => {
      root!.root.findByType(PoiBottomSheet).props.onBroadcast(MOCK_PRESENCE);
    });

    expect(pillEndButton(root!)).not.toBeNull();
  });

  it("pill is absent when viewMode is list even with an active presence", async () => {
    (usePois as jest.Mock).mockReturnValue({ pois: [MATCHING_POI], error: null });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    // Set active presence
    act(() => {
      root!.root.findByType(PoiBottomSheet).props.onBroadcast(MOCK_PRESENCE);
    });

    // Switch to list view
    const toggle = root!.root.findAll(
      (n: ReactTestInstance) =>
        n.props.testID === "view-mode-toggle" && typeof n.props.onPress === "function",
    )[0];
    act(() => {
      toggle.props.onPress();
    });

    expect(pillEndButton(root!)).toBeNull();
  });

  it("pill is absent when activePresence.poi_id does not match any loaded POI", async () => {
    // POIs loaded but none has id matching the presence's poi_id
    (usePois as jest.Mock).mockReturnValue({
      pois: [makePoi({ id: "poi-other", name: "Other Place" })],
      error: null,
    });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    act(() => {
      root!.root.findByType(PoiBottomSheet).props.onBroadcast(MOCK_PRESENCE); // poi_id: "poi-1" not in pois
    });

    expect(pillEndButton(root!)).toBeNull();
  });

  it("pill is absent when pois array is empty (startup race)", async () => {
    (usePois as jest.Mock).mockReturnValue({ pois: [], error: null });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    act(() => {
      root!.root.findByType(PoiBottomSheet).props.onBroadcast(MOCK_PRESENCE);
    });

    expect(pillEndButton(root!)).toBeNull();
  });

  it("pill displays the POI name resolved from pois array", async () => {
    (usePois as jest.Mock).mockReturnValue({
      pois: [makePoi({ id: "poi-1", name: "The Corner Café" })],
      error: null,
    });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    act(() => {
      root!.root.findByType(PoiBottomSheet).props.onBroadcast(MOCK_PRESENCE);
    });

    const textNodes = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "Text");
    const labelNode = textNodes.find((n) =>
      childrenToString(n.props.children).includes("The Corner Café"),
    );
    expect(labelNode).toBeDefined();
    expect(childrenToString(labelNode!.props.children)).toContain("At The Corner Café");
  });

  it("tapping pill End calls dismissPresence with the correct presenceId and then clearBroadcast", async () => {
    const { dismissPresence } = require("@/lib/presence");
    (usePois as jest.Mock).mockReturnValue({ pois: [MATCHING_POI], error: null });

    let root: ReturnType<typeof create>;
    await act(async () => {
      root = create(<MapScreen />);
    });

    act(() => {
      root!.root.findByType(PoiBottomSheet).props.onBroadcast(MOCK_PRESENCE);
    });

    // Pill is now visible — tap End
    await act(async () => {
      pillEndButton(root!)!.props.onPress();
    });

    expect(dismissPresence).toHaveBeenCalledTimes(1);
    expect(dismissPresence).toHaveBeenCalledWith(
      expect.anything(), // supabase client
      { presenceId: MOCK_PRESENCE.id },
    );

    // After dismissPresence resolves, clearBroadcast() sets activePresence to null,
    // so the pill should no longer be visible.
    expect(pillEndButton(root!)).toBeNull();
  });
});
