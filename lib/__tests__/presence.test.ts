import { broadcastPresence, dismissPresence } from "../presence";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase";

const MOCK_USER_ID = "user-123";
const MOCK_POI_ID = "poi-456";
const MOCK_PRESENCE_ID = "presence-789";

const MOCK_PRESENCE_ROW = {
  id: MOCK_PRESENCE_ID,
  poi_id: MOCK_POI_ID,
  message: "grabbing coffee",
  visible_to: "friends" as const,
};

type MockSupabase = {
  from: jest.Mock;
  auth: { getUser: jest.Mock };
};

function makeMockSupabase({
  updateResult = { error: null },
  insertResult = { data: MOCK_PRESENCE_ROW, error: null },
}: {
  updateResult?: { error: { message: string } | null };
  insertResult?: { data: typeof MOCK_PRESENCE_ROW | null; error: { message: string } | null };
} = {}): MockSupabase {
  const single = jest.fn().mockResolvedValue(insertResult);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });

  const is = jest.fn().mockResolvedValue(updateResult);
  const eqUser = jest.fn().mockReturnValue({ is });
  const eqId = jest
    .fn()
    .mockReturnValue({ eq: eqUser, is: jest.fn().mockResolvedValue(updateResult) });
  const update = jest.fn().mockReturnValue({ eq: eqId });

  const from = jest.fn().mockReturnValue({ update, insert });
  const getUser = jest.fn().mockResolvedValue({
    data: { user: { id: MOCK_USER_ID } },
    error: null,
  });

  return { from, auth: { getUser } };
}

function asClient(mock: MockSupabase): SupabaseClient<Database> {
  return mock as unknown as SupabaseClient<Database>;
}

describe("broadcastPresence", () => {
  const baseArgs = {
    poiId: MOCK_POI_ID,
    message: "grabbing coffee",
    visibleTo: "friends" as const,
  };

  it("inserts the correct fields", async () => {
    const mock = makeMockSupabase();
    await broadcastPresence(asClient(mock), baseArgs);

    expect(mock.from).toHaveBeenCalledWith("live_presence");
    const fromInstance =
      mock.from.mock.results[
        mock.from.mock.calls.findIndex((c: string[]) => c[0] === "live_presence")
      ].value;
    expect(fromInstance.insert).toHaveBeenCalledWith({
      poi_id: MOCK_POI_ID,
      user_id: MOCK_USER_ID,
      message: "grabbing coffee",
      visible_to: "friends",
    });
  });

  // Fix 2: assert that update was called with the correct dismissed_at payload
  it("calls update to auto-dismiss previous broadcast before insert", async () => {
    const mock = makeMockSupabase();
    await broadcastPresence(asClient(mock), baseArgs);

    // update is called on live_presence to dismiss old broadcast
    expect(mock.from).toHaveBeenCalledWith("live_presence");
    const fromCalls = mock.from.mock.results;
    const hasUpdate = fromCalls.some((r) => r.value?.update);
    expect(hasUpdate).toBe(true);

    // Assert update was called with a dismissed_at ISO string
    const fromInstance = mock.from.mock.results[0].value;
    expect(fromInstance.update).toHaveBeenCalledWith({ dismissed_at: expect.any(String) });
  });

  it("passes null message when message is an empty string", async () => {
    const mock = makeMockSupabase();
    await broadcastPresence(asClient(mock), { poiId: MOCK_POI_ID, message: "" });

    const fromInstance =
      mock.from.mock.results[
        mock.from.mock.calls.findIndex((c: string[]) => c[0] === "live_presence")
      ].value;
    expect(fromInstance.insert).toHaveBeenCalledWith(expect.objectContaining({ message: null }));
  });

  it("passes null message when message is only whitespace", async () => {
    const mock = makeMockSupabase();
    await broadcastPresence(asClient(mock), { poiId: MOCK_POI_ID, message: "   " });

    const fromInstance =
      mock.from.mock.results[
        mock.from.mock.calls.findIndex((c: string[]) => c[0] === "live_presence")
      ].value;
    expect(fromInstance.insert).toHaveBeenCalledWith(expect.objectContaining({ message: null }));
  });

  it("passes null message when message is omitted", async () => {
    const mock = makeMockSupabase();
    await broadcastPresence(asClient(mock), { poiId: MOCK_POI_ID });

    const fromInstance =
      mock.from.mock.results[
        mock.from.mock.calls.findIndex((c: string[]) => c[0] === "live_presence")
      ].value;
    expect(fromInstance.insert).toHaveBeenCalledWith(expect.objectContaining({ message: null }));
  });

  it("defaults visible_to to 'friends' when omitted", async () => {
    const mock = makeMockSupabase();
    await broadcastPresence(asClient(mock), { poiId: MOCK_POI_ID });

    const fromInstance =
      mock.from.mock.results[
        mock.from.mock.calls.findIndex((c: string[]) => c[0] === "live_presence")
      ].value;
    expect(fromInstance.insert).toHaveBeenCalledWith(
      expect.objectContaining({ visible_to: "friends" }),
    );
  });

  it("throws when message exceeds 140 characters", async () => {
    const mock = makeMockSupabase();
    const longMessage = "a".repeat(141);
    await expect(
      broadcastPresence(asClient(mock), { poiId: MOCK_POI_ID, message: longMessage }),
    ).rejects.toThrow("Message must be 140 characters or less");
    expect(mock.from).not.toHaveBeenCalled();
  });

  it("throws when user is not authenticated", async () => {
    const mock = makeMockSupabase();
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(broadcastPresence(asClient(mock), baseArgs)).rejects.toThrow("Not authenticated");
  });

  it("throws with Supabase error message when insert fails", async () => {
    const mock = makeMockSupabase({
      insertResult: { data: null, error: { message: "insert failed" } },
    });
    await expect(broadcastPresence(asClient(mock), baseArgs)).rejects.toThrow("insert failed");
  });
});

describe("dismissPresence", () => {
  it("throws when user is not authenticated", async () => {
    const mock = makeMockSupabase();
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(dismissPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws with Supabase error message when update fails", async () => {
    const mock = makeMockSupabase({
      updateResult: { error: { message: "update failed" } },
    });
    await expect(dismissPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })).rejects.toThrow(
      "update failed",
    );
  });

  // Fix 7: verify that eq is called with the correct presenceId and user_id filter args
  it("calls update with correct presenceId and user_id", async () => {
    const mock = makeMockSupabase();
    await dismissPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID });

    // Chain: .from('live_presence').update({dismissed_at:…}).eq('id', presenceId).eq('user_id', userId).is('dismissed_at', null)
    const fromInstance = mock.from.mock.results[0].value;

    // update should have been called with a dismissed_at string
    expect(fromInstance.update).toHaveBeenCalledWith({ dismissed_at: expect.any(String) });

    // First .eq call is .eq('id', presenceId)
    const updateResult = fromInstance.update.mock.results[0].value;
    expect(updateResult.eq).toHaveBeenCalledWith("id", MOCK_PRESENCE_ID);

    // Second .eq call is .eq('user_id', userId) — called on the result of the first eq
    const firstEqResult = updateResult.eq.mock.results[0].value;
    expect(firstEqResult.eq).toHaveBeenCalledWith("user_id", MOCK_USER_ID);
  });
});
