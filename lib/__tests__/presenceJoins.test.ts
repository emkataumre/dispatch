jest.mock("../pushDelivery", () => ({
  sendPresencePush: jest.fn().mockResolvedValue({ sent: 1, failed: 0, missing_tokens: 0 }),
}));

import { joinPresence, cancelJoin, confirmJoins } from "../presenceJoins";
import { sendPresencePush } from "../pushDelivery";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase";

const mockSendPresencePush = sendPresencePush as jest.Mock;

beforeEach(() => {
  mockSendPresencePush.mockClear();
});

const MOCK_USER_ID = "user-123";
const MOCK_PRESENCE_ID = "presence-456";
const MOCK_JOIN_ID = "join-789";

const MOCK_JOIN_ROW = {
  id: MOCK_JOIN_ID,
  presence_id: MOCK_PRESENCE_ID,
  joiner_user_id: MOCK_USER_ID,
  joined_at: "2026-01-01T00:00:00Z",
  confirmed: false,
};

type MockSupabase = {
  from: jest.Mock;
  auth: { getUser: jest.Mock };
};

function makeJoinMock({
  insertResult = { data: MOCK_JOIN_ROW, error: null },
}: {
  insertResult?: {
    data: typeof MOCK_JOIN_ROW | null;
    error: { message: string; code?: string } | null;
  };
} = {}): MockSupabase {
  const single = jest.fn().mockResolvedValue(insertResult);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  const from = jest.fn().mockReturnValue({ insert });
  const getUser = jest.fn().mockResolvedValue({
    data: { user: { id: MOCK_USER_ID } },
    error: null,
  });
  return { from, auth: { getUser } };
}

function makeCancelMock({
  deleteResult = { count: 1, error: null },
}: {
  deleteResult?: { count: number | null; error: { message: string } | null };
} = {}): MockSupabase {
  const eqUser = jest.fn().mockResolvedValue(deleteResult);
  const eqId = jest.fn().mockReturnValue({ eq: eqUser });
  const del = jest.fn().mockReturnValue({ eq: eqId });
  const from = jest.fn().mockReturnValue({ delete: del });
  const getUser = jest.fn().mockResolvedValue({
    data: { user: { id: MOCK_USER_ID } },
    error: null,
  });
  return { from, auth: { getUser } };
}

function asClient(mock: MockSupabase): SupabaseClient<Database> {
  return mock as unknown as SupabaseClient<Database>;
}

const MOCK_POI_ID = "poi-001";
const MOCK_PRESENCE_IDS = ["presence-1", "presence-2"];

type ConfirmMockOptions = {
  authUser?: { id: string } | null;
  authError?: { message: string } | null;
  presencesResult?: { data: { id: string }[] | null; error: { message: string } | null };
  updateResult?: { data?: { id: string }[] | null; error: { message: string } | null };
};

const MOCK_JOIN_IDS = ["join-a", "join-b"];

function makeConfirmMock({
  authUser = { id: MOCK_USER_ID },
  authError = null,
  presencesResult = { data: MOCK_PRESENCE_IDS.map((id) => ({ id })), error: null },
  updateResult = { data: MOCK_JOIN_IDS.map((id) => ({ id })), error: null },
}: ConfirmMockOptions = {}): MockSupabase {
  const getUser = jest.fn().mockResolvedValue({ data: { user: authUser }, error: authError });

  // Step 1 chain: from('live_presence').select('id').eq(...).is(...)
  const isPresence = jest.fn().mockResolvedValue(presencesResult);
  const eqPresence = jest.fn().mockReturnValue({ is: isPresence });
  const selectPresence = jest.fn().mockReturnValue({ eq: eqPresence });

  // Step 2 chain: from('presence_joins').update({...}).eq(...).eq(...).in(...).select("id")
  const selectJoins = jest.fn().mockResolvedValue(updateResult);
  const inJoins = jest.fn().mockReturnValue({ select: selectJoins });
  const eqConfirmed = jest.fn().mockReturnValue({ in: inJoins });
  const eqJoinerId = jest.fn().mockReturnValue({ eq: eqConfirmed });
  const updateJoins = jest.fn().mockReturnValue({ eq: eqJoinerId });

  const from = jest.fn().mockImplementation((table: string) => {
    if (table === "live_presence") return { select: selectPresence };
    if (table === "presence_joins") return { update: updateJoins };
    return {};
  });

  return { from, auth: { getUser } };
}

describe("joinPresence", () => {
  it("inserts with correct fields", async () => {
    const mock = makeJoinMock();
    await joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID });

    expect(mock.from).toHaveBeenCalledWith("presence_joins");
    const fromInstance = mock.from.mock.results[0].value;
    expect(fromInstance.insert).toHaveBeenCalledWith({
      presence_id: MOCK_PRESENCE_ID,
      joiner_user_id: MOCK_USER_ID,
    });
  });

  it("returns the created join row", async () => {
    const mock = makeJoinMock();
    const result = await joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID });
    expect(result).toEqual(MOCK_JOIN_ROW);
  });

  it("throws when user is not authenticated", async () => {
    const mock = makeJoinMock();
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws when getUser returns an auth error even with user present", async () => {
    const mock = makeJoinMock();
    mock.auth.getUser.mockResolvedValue({
      data: { user: { id: MOCK_USER_ID } },
      error: { message: "session expired" },
    });
    await expect(joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws user-friendly message on unique constraint violation", async () => {
    const mock = makeJoinMock({
      insertResult: { data: null, error: { message: "duplicate key value", code: "23505" } },
    });
    await expect(joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })).rejects.toThrow(
      "You have already joined this person.",
    );
  });

  it("throws with Supabase error message when insert fails with other error", async () => {
    const mock = makeJoinMock({
      insertResult: { data: null, error: { message: "insert failed" } },
    });
    await expect(joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })).rejects.toThrow(
      "insert failed",
    );
  });

  it("invokes sendPresencePush with the inserted join id", async () => {
    const mock = makeJoinMock();
    await joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID });
    expect(mockSendPresencePush).toHaveBeenCalledWith("presence_join", MOCK_JOIN_ID);
  });

  it("does not send push when insert fails", async () => {
    const mock = makeJoinMock({
      insertResult: { data: null, error: { message: "insert failed" } },
    });
    await expect(joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })).rejects.toThrow();
    expect(mockSendPresencePush).not.toHaveBeenCalled();
  });
});

describe("cancelJoin", () => {
  it("deletes with correct joinId and user filter", async () => {
    const mock = makeCancelMock();
    await cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID });

    expect(mock.from).toHaveBeenCalledWith("presence_joins");
    const fromInstance = mock.from.mock.results[0].value;
    expect(fromInstance.delete).toHaveBeenCalled();

    const deleteResult = fromInstance.delete.mock.results[0].value;
    expect(deleteResult.eq).toHaveBeenCalledWith("id", MOCK_JOIN_ID);

    const firstEqResult = deleteResult.eq.mock.results[0].value;
    expect(firstEqResult.eq).toHaveBeenCalledWith("joiner_user_id", MOCK_USER_ID);
  });

  it("throws when user is not authenticated", async () => {
    const mock = makeCancelMock();
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws when getUser returns an auth error even with user present", async () => {
    const mock = makeCancelMock();
    mock.auth.getUser.mockResolvedValue({
      data: { user: { id: MOCK_USER_ID } },
      error: { message: "session expired" },
    });
    await expect(cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws with Supabase error message when delete fails", async () => {
    const mock = makeCancelMock({
      deleteResult: { count: null, error: { message: "delete failed" } },
    });
    await expect(cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })).rejects.toThrow(
      "delete failed",
    );
  });

  it("throws when join is not found (zero rows deleted)", async () => {
    const mock = makeCancelMock({ deleteResult: { count: 0, error: null } });
    await expect(cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })).rejects.toThrow(
      "Join not found or already cancelled",
    );
  });

  it("invokes sendPresencePush with the joinId", async () => {
    const mock = makeCancelMock();
    await cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID });
    expect(mockSendPresencePush).toHaveBeenCalledWith("presence_cancel", MOCK_JOIN_ID);
  });

  it("awaits sendPresencePush to fully resolve BEFORE starting the delete", async () => {
    // Regression test for race: `void sendPresencePush(...)` would start both
    // the edge-fn invocation and the delete concurrently — the delete could
    // commit before the edge fn's row lookup, silently dropping the push.
    // This test deliberately delays push resolution and asserts that delete
    // has NOT been called until push has resolved.
    const mock = makeCancelMock();
    let pushResolved = false;
    let deleteCalledBeforePushResolved: boolean | null = null;

    mockSendPresencePush.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            pushResolved = true;
            resolve({ sent: 1, failed: 0, missing_tokens: 0 });
          }, 20);
        }),
    );

    const origFrom = mock.from;
    mock.from = jest.fn().mockImplementation((table: string) => {
      const result = origFrom(table);
      const origDelete = result.delete;
      result.delete = jest.fn().mockImplementation((...args: unknown[]) => {
        if (deleteCalledBeforePushResolved === null) {
          deleteCalledBeforePushResolved = !pushResolved;
        }
        return origDelete(...args);
      });
      return result;
    });

    await cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID });
    expect(deleteCalledBeforePushResolved).toBe(false);
  });
});

describe("confirmJoins", () => {
  it("throws when not authenticated", async () => {
    const mock = makeConfirmMock({ authUser: null });
    await expect(confirmJoins(asClient(mock), { poiId: MOCK_POI_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws when getUser returns an auth error", async () => {
    const mock = makeConfirmMock({ authError: { message: "session expired" } });
    await expect(confirmJoins(asClient(mock), { poiId: MOCK_POI_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("returns early without calling update when no active presences at POI", async () => {
    const mock = makeConfirmMock({ presencesResult: { data: [], error: null } });
    await confirmJoins(asClient(mock), { poiId: MOCK_POI_ID });
    // update should never be called
    expect(mock.from).not.toHaveBeenCalledWith("presence_joins");
  });

  it("returns early when presences data is null", async () => {
    const mock = makeConfirmMock({ presencesResult: { data: null, error: null } });
    await confirmJoins(asClient(mock), { poiId: MOCK_POI_ID });
    expect(mock.from).not.toHaveBeenCalledWith("presence_joins");
  });

  it("queries live_presence with correct poi_id and dismissed_at filters", async () => {
    const mock = makeConfirmMock();
    await confirmJoins(asClient(mock), { poiId: MOCK_POI_ID });

    expect(mock.from).toHaveBeenCalledWith("live_presence");
    const lpFrom = mock.from.mock.results.find(
      (r: { value?: { select?: unknown } }) => typeof r.value?.select === "function",
    )!.value;
    expect(lpFrom.select).toHaveBeenCalledWith("id");
    const eqResult = lpFrom.select.mock.results[0].value;
    expect(eqResult.eq).toHaveBeenCalledWith("poi_id", MOCK_POI_ID);
    const isResult = eqResult.eq.mock.results[0].value;
    expect(isResult.is).toHaveBeenCalledWith("dismissed_at", null);
  });

  it("calls update on presence_joins with correct filters", async () => {
    const mock = makeConfirmMock();
    await confirmJoins(asClient(mock), { poiId: MOCK_POI_ID });

    expect(mock.from).toHaveBeenCalledWith("presence_joins");
    const pjFrom = mock.from.mock.results.find(
      (r: { value?: { update?: unknown } }) => typeof r.value?.update === "function",
    )!.value;
    expect(pjFrom.update).toHaveBeenCalledWith({ confirmed: true });

    const eqJoiner = pjFrom.update.mock.results[0].value;
    expect(eqJoiner.eq).toHaveBeenCalledWith("joiner_user_id", MOCK_USER_ID);

    const eqConfirmed = eqJoiner.eq.mock.results[0].value;
    expect(eqConfirmed.eq).toHaveBeenCalledWith("confirmed", false);

    const inResult = eqConfirmed.eq.mock.results[0].value;
    expect(inResult.in).toHaveBeenCalledWith("presence_id", MOCK_PRESENCE_IDS);
  });

  it("throws when live_presence query fails", async () => {
    const mock = makeConfirmMock({
      presencesResult: { data: null, error: { message: "network error" } },
    });
    await expect(confirmJoins(asClient(mock), { poiId: MOCK_POI_ID })).rejects.toThrow(
      "network error",
    );
  });

  it("throws when presence_joins update fails", async () => {
    const mock = makeConfirmMock({ updateResult: { error: { message: "update failed" } } });
    await expect(confirmJoins(asClient(mock), { poiId: MOCK_POI_ID })).rejects.toThrow(
      "update failed",
    );
  });

  it("invokes sendPresencePush once per confirmed join id", async () => {
    const mock = makeConfirmMock();
    await confirmJoins(asClient(mock), { poiId: MOCK_POI_ID });
    expect(mockSendPresencePush).toHaveBeenCalledTimes(MOCK_JOIN_IDS.length);
    for (const id of MOCK_JOIN_IDS) {
      expect(mockSendPresencePush).toHaveBeenCalledWith("presence_arrived", id);
    }
  });

  it("does not invoke sendPresencePush when no rows were updated", async () => {
    const mock = makeConfirmMock({ updateResult: { data: [], error: null } });
    await confirmJoins(asClient(mock), { poiId: MOCK_POI_ID });
    expect(mockSendPresencePush).not.toHaveBeenCalled();
  });

  it("does not invoke sendPresencePush when updatedRows data is null", async () => {
    const mock = makeConfirmMock({ updateResult: { data: null, error: null } });
    await confirmJoins(asClient(mock), { poiId: MOCK_POI_ID });
    expect(mockSendPresencePush).not.toHaveBeenCalled();
  });
});
