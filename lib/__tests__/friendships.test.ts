import {
  fetchFriendships,
  sendRequest,
  cancelRequest,
  acceptRequest,
  declineRequest,
  unfriend,
} from "../friendships";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase";

const MOCK_USER_ID = "user-abc";
const MOCK_ADDRESSEE_ID = "user-xyz";
const MOCK_FRIENDSHIP_ID = "friendship-123";

const MOCK_ROW = {
  id: MOCK_FRIENDSHIP_ID,
  requester_id: MOCK_USER_ID,
  addressee_id: MOCK_ADDRESSEE_ID,
  status: "pending",
  created_at: "2026-01-01T00:00:00Z",
};

type MockSupabase = { from: jest.Mock; auth: { getUser: jest.Mock } };

function asClient(mock: MockSupabase): SupabaseClient<Database> {
  return mock as unknown as SupabaseClient<Database>;
}

function authedGetUser(userId = MOCK_USER_ID) {
  return jest.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null });
}

// ---------- fetchFriendships ----------

describe("fetchFriendships", () => {
  it("selects with embedded profile joins and user filter", async () => {
    const or = jest.fn().mockResolvedValue({ data: [MOCK_ROW], error: null });
    const select = jest.fn().mockReturnValue({ or });
    const from = jest.fn().mockReturnValue({ select });
    const mock: MockSupabase = { from, auth: { getUser: authedGetUser() } };

    const result = await fetchFriendships(asClient(mock));
    expect(mock.from).toHaveBeenCalledWith("friendships");
    expect(select).toHaveBeenCalledWith(expect.stringContaining("requester:requester_id"));
    expect(select).toHaveBeenCalledWith(expect.stringContaining("addressee:addressee_id"));
    expect(or).toHaveBeenCalledWith(expect.stringContaining(`requester_id.eq.${MOCK_USER_ID}`));
    expect(or).toHaveBeenCalledWith(expect.stringContaining(`addressee_id.eq.${MOCK_USER_ID}`));
    expect(result).toEqual([MOCK_ROW]);
  });

  it("throws when not authenticated", async () => {
    const from = jest.fn();
    const mock: MockSupabase = {
      from,
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    };
    await expect(fetchFriendships(asClient(mock))).rejects.toThrow("Not authenticated");
  });

  it("throws on Supabase error", async () => {
    const or = jest.fn().mockResolvedValue({ data: null, error: { message: "db error" } });
    const select = jest.fn().mockReturnValue({ or });
    const from = jest.fn().mockReturnValue({ select });
    const mock: MockSupabase = { from, auth: { getUser: authedGetUser() } };
    await expect(fetchFriendships(asClient(mock))).rejects.toThrow("db error");
  });
});

// ---------- sendRequest ----------

describe("sendRequest", () => {
  function makeSendMock(
    result: { data: typeof MOCK_ROW | null; error: unknown } = { data: MOCK_ROW, error: null },
  ) {
    const single = jest.fn().mockResolvedValue(result);
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const from = jest.fn().mockReturnValue({ insert });
    return { from, auth: { getUser: authedGetUser() } };
  }

  it("inserts with correct fields", async () => {
    const mock = makeSendMock();
    await sendRequest(asClient(mock), { addresseeId: MOCK_ADDRESSEE_ID });

    expect(mock.from).toHaveBeenCalledWith("friendships");
    const fromInstance = mock.from.mock.results[0].value;
    expect(fromInstance.insert).toHaveBeenCalledWith({
      requester_id: MOCK_USER_ID,
      addressee_id: MOCK_ADDRESSEE_ID,
      status: "pending",
    });
  });

  it("returns the created friendship row", async () => {
    const mock = makeSendMock();
    const result = await sendRequest(asClient(mock), { addresseeId: MOCK_ADDRESSEE_ID });
    expect(result).toEqual(MOCK_ROW);
  });

  it('throws "Friend request already exists" on unique violation (23505)', async () => {
    const mock = makeSendMock({ data: null, error: { message: "duplicate", code: "23505" } });
    await expect(sendRequest(asClient(mock), { addresseeId: MOCK_ADDRESSEE_ID })).rejects.toThrow(
      "Friend request already exists",
    );
  });

  it("throws Supabase message on other errors", async () => {
    const mock = makeSendMock({ data: null, error: { message: "insert failed" } });
    await expect(sendRequest(asClient(mock), { addresseeId: MOCK_ADDRESSEE_ID })).rejects.toThrow(
      "insert failed",
    );
  });

  it("throws when not authenticated", async () => {
    const mock = makeSendMock();
    mock.auth.getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
    await expect(sendRequest(asClient(mock), { addresseeId: MOCK_ADDRESSEE_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });
});

// ---------- cancelRequest ----------

describe("cancelRequest", () => {
  function makeDeleteMock(result = { count: 1, error: null }) {
    const eq = jest.fn().mockResolvedValue(result);
    const del = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ delete: del });
    return { from, auth: { getUser: authedGetUser() } };
  }

  it("deletes by friendshipId", async () => {
    const mock = makeDeleteMock();
    await cancelRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID });

    expect(mock.from).toHaveBeenCalledWith("friendships");
    const del = mock.from.mock.results[0].value.delete;
    expect(del).toHaveBeenCalledWith({ count: "exact" });
    const eq = del.mock.results[0].value.eq;
    expect(eq).toHaveBeenCalledWith("id", MOCK_FRIENDSHIP_ID);
  });

  it('throws "Request not found" when 0 rows deleted', async () => {
    const mock = makeDeleteMock({ count: 0, error: null });
    await expect(
      cancelRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID }),
    ).rejects.toThrow("Request not found or already cancelled");
  });

  it("throws Supabase error message on DB error", async () => {
    const mock = makeDeleteMock({
      count: null as never,
      error: { message: "delete failed" } as never,
    });
    await expect(
      cancelRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID }),
    ).rejects.toThrow("delete failed");
  });

  it("throws when not authenticated", async () => {
    const mock = makeDeleteMock();
    mock.auth.getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
    await expect(
      cancelRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID }),
    ).rejects.toThrow("Not authenticated");
  });
});

// ---------- acceptRequest ----------

describe("acceptRequest", () => {
  function makeUpdateMock(result = { count: 1, error: null }) {
    const eq = jest.fn().mockResolvedValue(result);
    const update = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ update });
    return { from, auth: { getUser: authedGetUser() } };
  }

  it("updates status to accepted by friendshipId with count check", async () => {
    const mock = makeUpdateMock();
    await acceptRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID });

    const upd = mock.from.mock.results[0].value.update;
    expect(upd).toHaveBeenCalledWith({ status: "accepted" }, { count: "exact" });
    const eq = upd.mock.results[0].value.eq;
    expect(eq).toHaveBeenCalledWith("id", MOCK_FRIENDSHIP_ID);
  });

  it('throws "Request not found or already handled" when 0 rows updated', async () => {
    const mock = makeUpdateMock({ count: 0, error: null });
    await expect(
      acceptRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID }),
    ).rejects.toThrow("Request not found or already handled");
  });

  it("throws Supabase error message on failure", async () => {
    const mock = makeUpdateMock({
      count: null as never,
      error: { message: "update failed" } as never,
    });
    await expect(
      acceptRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID }),
    ).rejects.toThrow("update failed");
  });

  it("throws when not authenticated", async () => {
    const mock = makeUpdateMock();
    mock.auth.getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
    await expect(
      acceptRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID }),
    ).rejects.toThrow("Not authenticated");
  });
});

// ---------- declineRequest ----------

describe("declineRequest", () => {
  function makeDeleteMock(result = { count: 1, error: null }) {
    const eq = jest.fn().mockResolvedValue(result);
    const del = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ delete: del });
    return { from, auth: { getUser: authedGetUser() } };
  }

  it("deletes by friendshipId", async () => {
    const mock = makeDeleteMock();
    await declineRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID });

    const del = mock.from.mock.results[0].value.delete;
    expect(del).toHaveBeenCalledWith({ count: "exact" });
  });

  it('throws "Request not found" when 0 rows deleted', async () => {
    const mock = makeDeleteMock({ count: 0, error: null });
    await expect(
      declineRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID }),
    ).rejects.toThrow("Request not found or already declined");
  });

  it("throws when not authenticated", async () => {
    const mock = makeDeleteMock();
    mock.auth.getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
    await expect(
      declineRequest(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID }),
    ).rejects.toThrow("Not authenticated");
  });
});

// ---------- unfriend ----------

describe("unfriend", () => {
  function makeDeleteMock(result = { count: 1, error: null }) {
    const eq = jest.fn().mockResolvedValue(result);
    const del = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ delete: del });
    return { from, auth: { getUser: authedGetUser() } };
  }

  it("deletes by friendshipId", async () => {
    const mock = makeDeleteMock();
    await unfriend(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID });

    expect(mock.from).toHaveBeenCalledWith("friendships");
    const del = mock.from.mock.results[0].value.delete;
    const eq = del.mock.results[0].value.eq;
    expect(eq).toHaveBeenCalledWith("id", MOCK_FRIENDSHIP_ID);
  });

  it('throws "Friendship not found" when 0 rows deleted', async () => {
    const mock = makeDeleteMock({ count: 0, error: null });
    await expect(unfriend(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID })).rejects.toThrow(
      "Friendship not found",
    );
  });

  it("throws Supabase error message on DB error", async () => {
    const mock = makeDeleteMock({
      count: null as never,
      error: { message: "delete failed" } as never,
    });
    await expect(unfriend(asClient(mock), { friendshipId: MOCK_FRIENDSHIP_ID })).rejects.toThrow(
      "delete failed",
    );
  });
});
