import { afterEach, describe, expect, it, vi } from "vitest";
import { startApplication, updateStudentProfile } from "./data";

afterEach(() => vi.unstubAllGlobals());

describe("startApplication", () => {
  it("starts the application through the signed-in student endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

    await expect(startApplication()).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith("/api/student/applications", { method: "POST" });
  });

  it("returns the server's useful error message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Claim your student record first." } }),
    }));

    await expect(startApplication()).resolves.toEqual({
      ok: false,
      message: "Claim your student record first.",
    });
  });
});

describe("updateStudentProfile", () => {
  it("patches only the signed-in student's profile fields", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

    await expect(updateStudentProfile({ phone: null, address: "Lagos" })).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith("/api/student/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: null, address: "Lagos" }),
    });
  });

  it("returns a profile validation error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Use a valid date." } }),
    }));

    await expect(updateStudentProfile({ dateOfBirth: "tomorrow" })).resolves.toEqual({
      ok: false,
      message: "Use a valid date.",
    });
  });
});
