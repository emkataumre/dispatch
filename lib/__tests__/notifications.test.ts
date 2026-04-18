import { registerForPushNotifications } from "../notifications";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: "test-project-id" } } },
  },
}));

jest.mock("../supabase", () => {
  const upsert = jest.fn();
  const getUser = jest.fn();
  return {
    supabase: {
      from: jest.fn(() => ({ upsert })),
      auth: { getUser },
    },
    __upsert: upsert,
    __getUser: getUser,
  };
});

import * as Notifications from "expo-notifications";
const supabaseMock = jest.requireMock("../supabase");
const mockUpsert: jest.Mock = supabaseMock.__upsert;
const mockGetUser: jest.Mock = supabaseMock.__getUser;

const mockedGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockedRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockedGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;

const MOCK_USER_ID = "user-123";
const MOCK_TOKEN = "ExpoPushToken[abc-123]";
let warnSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  mockUpsert.mockResolvedValue({ error: null });
  mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } }, error: null });
  mockedGetPermissions.mockResolvedValue({ status: "granted", granted: true, canAskAgain: true });
  mockedGetToken.mockResolvedValue({ data: MOCK_TOKEN });
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe("registerForPushNotifications", () => {
  it("upserts the token for the current user on the happy path", async () => {
    await registerForPushNotifications();

    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: MOCK_USER_ID, expo_push_token: MOCK_TOKEN },
      { onConflict: "user_id" },
    );
  });

  it("requests permission when status is undetermined", async () => {
    mockedGetPermissions.mockResolvedValueOnce({
      status: "undetermined",
      granted: false,
      canAskAgain: true,
    });
    mockedRequestPermissions.mockResolvedValueOnce({
      status: "granted",
      granted: true,
      canAskAgain: true,
    });

    await registerForPushNotifications();

    expect(mockedRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("requests permission on Android 13+ fresh install (denied + canAskAgain)", async () => {
    // Android 13+ reports a never-asked install as denied (not undetermined),
    // so a strict status check would skip the prompt forever.
    mockedGetPermissions.mockResolvedValueOnce({
      status: "denied",
      granted: false,
      canAskAgain: true,
    });
    mockedRequestPermissions.mockResolvedValueOnce({
      status: "granted",
      granted: true,
      canAskAgain: true,
    });

    await registerForPushNotifications();

    expect(mockedRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("bails without DB write when permission is hard-denied (canAskAgain false)", async () => {
    mockedGetPermissions.mockResolvedValueOnce({
      status: "denied",
      granted: false,
      canAskAgain: false,
    });

    await registerForPushNotifications();

    expect(mockedRequestPermissions).not.toHaveBeenCalled();
    expect(mockedGetToken).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Push permission not granted"));
  });

  it("bails without DB write when getExpoPushTokenAsync throws (simulator / no APNs)", async () => {
    mockedGetToken.mockRejectedValueOnce(new Error("DeviceNotRegistered"));

    await registerForPushNotifications();

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("getExpoPushTokenAsync failed"),
      expect.any(Error),
    );
  });

  it("bails without DB write when there is no authenticated user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await registerForPushNotifications();

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("logs but does not throw when the upsert returns an error", async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: "rls denied" } });

    await expect(registerForPushNotifications()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("push_tokens upsert failed"),
      "rls denied",
    );
  });
});
