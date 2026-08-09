/**
 * The development code-surfacing guard.
 *
 * This is tested more carefully than its size suggests because of how it fails. A
 * verification code that leaks does not throw, log, or look wrong from the outside —
 * the flow works perfectly, and the only symptom is that email verification has quietly
 * stopped proving anything. Nothing would report that, so the guard needs a test that
 * would.
 *
 * The suite runs with `MAIL_PROVIDER` unset and `NODE_ENV=test`, so
 * `codesMayBeShownOnScreen()` is true here and the storage behaviour is observable. The
 * production case is covered by mocking the guard directly.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { peekCode, rememberCode, resetHeldCodes, takeCode } from "./dev-codes";
import { codesMayBeShownOnScreen } from "./mail";

afterEach(() => {
  resetHeldCodes();
  vi.restoreAllMocks();
});

describe("the guard itself", () => {
  it("is open in this environment — no mail provider, not production", () => {
    expect(codesMayBeShownOnScreen()).toBe(true);
  });
});

describe("holding a code", () => {
  it("returns the code that was remembered", () => {
    rememberCode("partner@example.com", "123456");
    expect(peekCode("partner@example.com")).toBe("123456");
  });

  it("is case-insensitive on the address, because mailboxes are", () => {
    rememberCode("Partner@Example.com", "123456");
    expect(peekCode("partner@example.com")).toBe("123456");
  });

  it("keeps only the newest code for an address", () => {
    rememberCode("partner@example.com", "111111");
    rememberCode("partner@example.com", "222222");
    expect(peekCode("partner@example.com")).toBe("222222");
  });

  it("returns null for an address with no code", () => {
    expect(peekCode("nobody@example.com")).toBeNull();
  });

  it("consumes the code on take, so it cannot be read twice", () => {
    rememberCode("partner@example.com", "123456");
    expect(takeCode("partner@example.com")).toBe("123456");
    expect(takeCode("partner@example.com")).toBeNull();
  });

  it("evicts the oldest entry rather than growing without bound", () => {
    for (let i = 0; i < 60; i++) rememberCode(`p${i}@example.com`, "123456");
    // The first addresses are gone; the most recent survive.
    expect(peekCode("p0@example.com")).toBeNull();
    expect(peekCode("p59@example.com")).toBe("123456");
  });
});

describe("when the guard is closed", () => {
  /**
   * The case that matters. `codesMayBeShownOnScreen()` returning false must make this
   * module inert on *both* sides — nothing written and nothing readable — so that a
   * single missed check on one side cannot expose anything on its own.
   */
  it("stores nothing", async () => {
    const mail = await import("./mail");
    vi.spyOn(mail, "codesMayBeShownOnScreen").mockReturnValue(false);

    rememberCode("partner@example.com", "123456");

    vi.spyOn(mail, "codesMayBeShownOnScreen").mockReturnValue(true);
    expect(peekCode("partner@example.com")).toBeNull();
  });

  it("reads nothing, even for a code stored while it was open", async () => {
    rememberCode("partner@example.com", "123456");
    expect(peekCode("partner@example.com")).toBe("123456");

    const mail = await import("./mail");
    vi.spyOn(mail, "codesMayBeShownOnScreen").mockReturnValue(false);

    expect(peekCode("partner@example.com")).toBeNull();
    expect(takeCode("partner@example.com")).toBeNull();
  });
});
