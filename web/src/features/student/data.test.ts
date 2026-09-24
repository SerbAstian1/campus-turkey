import { afterEach, describe, expect, it, vi } from "vitest";
import { startApplication } from "./data";

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
