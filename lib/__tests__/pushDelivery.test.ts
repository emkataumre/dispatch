import { sendPresencePush } from "../pushDelivery";

jest.mock("../supabase", () => {
  const invoke = jest.fn();
  return {
    supabase: { functions: { invoke } },
    __invoke: invoke,
  };
});

const supabaseMock = jest.requireMock("../supabase");
const mockInvoke: jest.Mock = supabaseMock.__invoke;

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe("sendPresencePush", () => {
  it("invokes send-push with the expected payload shape", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { sent: 1, failed: 0, missing_tokens: 0 },
      error: null,
    });

    const result = await sendPresencePush("presence_join", "pj-123");

    expect(mockInvoke).toHaveBeenCalledWith("send-push", {
      body: { kind: "presence_join", presence_join_id: "pj-123" },
    });
    expect(result).toEqual({ sent: 1, failed: 0, missing_tokens: 0 });
  });

  it.each(["presence_join", "presence_cancel", "presence_arrived"] as const)(
    "forwards kind=%s verbatim",
    async (kind) => {
      mockInvoke.mockResolvedValueOnce({
        data: { sent: 0, failed: 0, missing_tokens: 0 },
        error: null,
      });

      await sendPresencePush(kind, "pj-1");

      expect(mockInvoke).toHaveBeenCalledWith("send-push", {
        body: { kind, presence_join_id: "pj-1" },
      });
    },
  );

  it("logs and returns null when invoke returns an error", async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: "network down" } });

    const result = await sendPresencePush("presence_arrived", "pj-1");

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("send-push invoke failed"),
      "network down",
    );
  });

  it("returns null when invoke resolves without data", async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: null });

    const result = await sendPresencePush("presence_join", "pj-1");

    expect(result).toBeNull();
  });
});
