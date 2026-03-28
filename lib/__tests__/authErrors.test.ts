import { friendlyAuthError, isEduEmail } from "../authErrors";

describe("isEduEmail", () => {
  it("accepts a standard .edu address", () => {
    expect(isEduEmail("student@university.edu")).toBe(true);
  });

  it("accepts .edu with leading/trailing whitespace", () => {
    expect(isEduEmail("  student@university.edu  ")).toBe(true);
  });

  it("accepts mixed-case .edu", () => {
    expect(isEduEmail("Student@University.EDU")).toBe(true);
  });

  it("rejects a non-.edu address", () => {
    expect(isEduEmail("student@gmail.com")).toBe(false);
  });

  it("rejects an address that contains .edu but does not end with it", () => {
    expect(isEduEmail("student@university.edu.co")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isEduEmail("")).toBe(false);
  });

  it("rejects a string with no @ symbol", () => {
    expect(isEduEmail(".edu")).toBe(false);
  });

  it("rejects an address starting with @", () => {
    expect(isEduEmail("@university.edu")).toBe(false);
  });
});

describe("friendlyAuthError", () => {
  it("maps an exact known error message", () => {
    expect(friendlyAuthError("Invalid login credentials")).toBe(
      "Incorrect email or password.",
    );
  });

  it("matches case-insensitively", () => {
    expect(friendlyAuthError("INVALID LOGIN CREDENTIALS")).toBe(
      "Incorrect email or password.",
    );
  });

  it("matches when the known key is a substring of a longer message", () => {
    expect(friendlyAuthError("AuthApiError: Email not confirmed")).toBe(
      "Please confirm your email before signing in.",
    );
  });

  it("maps over_email_send_rate_limit", () => {
    expect(friendlyAuthError("over_email_send_rate_limit")).toBe(
      "Too many attempts. Please try again later.",
    );
  });

  it("returns the fallback for an unrecognised error", () => {
    expect(friendlyAuthError("some totally unknown error")).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("returns the fallback for an empty string", () => {
    expect(friendlyAuthError("")).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
