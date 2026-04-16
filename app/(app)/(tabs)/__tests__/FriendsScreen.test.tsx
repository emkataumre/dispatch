import React from "react";
import { act, create, ReactTestInstance } from "react-test-renderer";

const mockUseUserSearch = jest.fn();
const mockUseFriendships = jest.fn();

jest.mock("@/hooks/useUserSearch", () => ({
  useUserSearch: (...args: unknown[]) => mockUseUserSearch(...args),
}));

jest.mock("@/hooks/useFriendships", () => ({
  useFriendships: () => mockUseFriendships(),
}));

jest.mock("@/components/friends/UserSearchResult", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    UserSearchResult: ({ user }: { user: { display_name: string } }) =>
      React.createElement(Text, null, user.display_name),
  };
});

jest.mock("@/components/friends/FriendRow", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    FriendRow: ({ entry }: { entry: { displayName: string } }) =>
      React.createElement(Text, null, entry.displayName),
  };
});

jest.mock("@/components/friends/IncomingRequestsSection", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    IncomingRequestsSection: ({ requests }: { requests: { displayName: string }[] }) =>
      requests.length > 0
        ? React.createElement(Text, null, `${requests.length} incoming request(s)`)
        : null,
  };
});

import FriendsScreen from "../friends";

const EMPTY_FRIENDSHIPS = {
  friends: [],
  incomingRequests: [],
  outgoingRequestMap: new Map<string, string>() as ReadonlyMap<string, string>,
  pendingCount: 0,
  loading: false,
  error: null,
  sendRequest: jest.fn(),
  cancelRequest: jest.fn(),
  acceptRequest: jest.fn(),
  declineRequest: jest.fn(),
  unfriend: jest.fn(),
  getStatusForUser: jest.fn().mockReturnValue("none"),
  getFriendshipId: jest.fn().mockReturnValue(null),
};

const IDLE_SEARCH = { results: [], state: "idle" as const, error: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseFriendships.mockReturnValue(EMPTY_FRIENDSHIPS);
  mockUseUserSearch.mockReturnValue(IDLE_SEARCH);
});

describe("FriendsScreen", () => {
  it("renders a search input", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<FriendsScreen />);
    });

    const inputs = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "TextInput");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('shows "Search for friends by name" hint when idle with no friends', () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<FriendsScreen />);
    });

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "Text");
    expect(texts.some((n) => String(n.props.children) === "Search for friends by name")).toBe(true);
  });

  it("renders friends list entries when friends exist", () => {
    mockUseFriendships.mockReturnValue({
      ...EMPTY_FRIENDSHIPS,
      friends: [{ friendshipId: "fs-1", userId: "u1", displayName: "Alice", avatarUrl: null }],
    });

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<FriendsScreen />);
    });

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "Text");
    expect(texts.some((n) => String(n.props.children) === "Alice")).toBe(true);
  });

  it("shows IncomingRequestsSection when incoming requests exist", () => {
    mockUseFriendships.mockReturnValue({
      ...EMPTY_FRIENDSHIPS,
      incomingRequests: [
        { friendshipId: "fs-req-1", requesterId: "u2", displayName: "Bob", avatarUrl: null },
      ],
      pendingCount: 1,
    });

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<FriendsScreen />);
    });

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "Text");
    expect(texts.some((n) => String(n.props.children) === "1 incoming request(s)")).toBe(true);
  });

  it("hides IncomingRequestsSection when no incoming requests", () => {
    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<FriendsScreen />);
    });

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "Text");
    expect(texts.some((n) => String(n.props.children).includes("incoming request"))).toBe(false);
  });

  it("shows ActivityIndicator while friendships are loading", () => {
    mockUseFriendships.mockReturnValue({ ...EMPTY_FRIENDSHIPS, loading: true });

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<FriendsScreen />);
    });

    const spinners = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === "ActivityIndicator",
    );
    expect(spinners.length).toBeGreaterThan(0);
  });

  it("shows search results when query is non-empty", () => {
    mockUseUserSearch.mockReturnValue({
      state: "results",
      results: [{ id: "u-1", display_name: "Jane Doe", avatar_url: null }],
      error: null,
    });

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<FriendsScreen />);
    });

    // Simulate typing in the search bar
    const inputs = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "TextInput");
    act(() => {
      inputs[0].props.onChangeText("jane");
    });

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "Text");
    expect(texts.some((n) => String(n.props.children) === "Jane Doe")).toBe(true);
  });

  it('shows "No users found" when search returns empty results', () => {
    mockUseUserSearch.mockReturnValue({ state: "results", results: [], error: null });

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<FriendsScreen />);
    });

    const inputs = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "TextInput");
    act(() => {
      inputs[0].props.onChangeText("xyz");
    });

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "Text");
    expect(texts.some((n) => String(n.props.children) === "No users found")).toBe(true);
  });

  it("shows error text when search state is error", () => {
    mockUseUserSearch.mockReturnValue({ state: "error", results: [], error: "network failure" });

    let root: ReturnType<typeof create>;
    act(() => {
      root = create(<FriendsScreen />);
    });

    const inputs = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "TextInput");
    act(() => {
      inputs[0].props.onChangeText("a");
    });

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === "Text");
    expect(texts.some((n) => String(n.props.children) === "network failure")).toBe(true);
  });
});
