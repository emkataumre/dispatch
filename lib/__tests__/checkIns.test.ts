import { insertCheckIn } from "../checkIns";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase";

const MOCK_USER_ID = "user-123";
const MOCK_POI_ID = "poi-456";
const MOCK_SEMESTER_ID = "sem-789";

type MockSupabase = {
  from: jest.Mock;
  auth: { getUser: jest.Mock };
};

function makeMockSupabase({
  profileResult = { data: { semester_id: MOCK_SEMESTER_ID }, error: null },
  insertResult = { error: null },
}: {
  profileResult?: {
    data: { semester_id: string | null } | null;
    error: { message: string } | null;
  };
  insertResult?: { error: { message: string; code?: string } | null };
} = {}): MockSupabase {
  const single = jest.fn().mockResolvedValue(profileResult);
  const eqProfile = jest.fn().mockReturnValue({ single });
  const selectProfile = jest.fn().mockReturnValue({ eq: eqProfile });

  const insert = jest.fn().mockResolvedValue(insertResult);

  const from = jest.fn().mockImplementation((table: string) => {
    if (table === "profiles") return { select: selectProfile };
    if (table === "check_ins") return { insert };
    return {};
  });

  const getUser = jest.fn().mockResolvedValue({
    data: { user: { id: MOCK_USER_ID } },
    error: null,
  });

  return { from, auth: { getUser } };
}

function asClient(mock: MockSupabase): SupabaseClient<Database> {
  return mock as unknown as SupabaseClient<Database>;
}

describe("insertCheckIn", () => {
  it("inserts a check-in with correct user_id, poi_id, and semester_id", async () => {
    const mock = makeMockSupabase();
    await insertCheckIn(asClient(mock), { poiId: MOCK_POI_ID });

    expect(mock.from).toHaveBeenCalledWith("check_ins");
    const checkInsFrom = mock.from.mock.results.find(
      (_r: { value: unknown }, i: number) => mock.from.mock.calls[i][0] === "check_ins",
    )!.value;
    expect(checkInsFrom.insert).toHaveBeenCalledWith({
      user_id: MOCK_USER_ID,
      poi_id: MOCK_POI_ID,
      semester_id: MOCK_SEMESTER_ID,
    });
  });

  it("handles null semester_id from profile", async () => {
    const mock = makeMockSupabase({
      profileResult: { data: { semester_id: null }, error: null },
    });
    await insertCheckIn(asClient(mock), { poiId: MOCK_POI_ID });

    const checkInsFrom = mock.from.mock.results.find(
      (_r: { value: unknown }, i: number) => mock.from.mock.calls[i][0] === "check_ins",
    )!.value;
    expect(checkInsFrom.insert).toHaveBeenCalledWith(
      expect.objectContaining({ semester_id: null }),
    );
  });

  it("throws when user is not authenticated", async () => {
    const mock = makeMockSupabase();
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(insertCheckIn(asClient(mock), { poiId: MOCK_POI_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws when auth returns an error", async () => {
    const mock = makeMockSupabase();
    mock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "auth error" },
    });

    await expect(insertCheckIn(asClient(mock), { poiId: MOCK_POI_ID })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws when profile fetch fails", async () => {
    const mock = makeMockSupabase({
      profileResult: { data: null, error: { message: "profile not found" } },
    });

    await expect(insertCheckIn(asClient(mock), { poiId: MOCK_POI_ID })).rejects.toThrow(
      "profile not found",
    );
  });

  it("throws when check-in insert fails", async () => {
    const mock = makeMockSupabase({
      insertResult: { error: { message: "insert failed" } },
    });

    await expect(insertCheckIn(asClient(mock), { poiId: MOCK_POI_ID })).rejects.toThrow(
      "insert failed",
    );
  });

  it("treats exclusion constraint violation (23P01) as success", async () => {
    const mock = makeMockSupabase({
      insertResult: {
        error: {
          code: "23P01",
          message: "conflicting key value violates exclusion constraint",
        } as any,
      },
    });

    // Should resolve without throwing — the first check-in already exists
    await expect(insertCheckIn(asClient(mock), { poiId: MOCK_POI_ID })).resolves.toBeUndefined();
  });
});
