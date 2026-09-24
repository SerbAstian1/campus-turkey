import { describe, expect, it } from "vitest";
import { portalPathForRole } from "./portal-route";

describe("portalPathForRole", () => {
  it.each([
    ["STUDENT", "/portal/student"],
    ["PARTNER", "/portal/dashboard"],
    ["REPRESENTATIVE", "/portal/representative"],
    ["STAFF", "/staff"],
    ["ADMIN", "/staff"],
    ["SUPER_ADMIN", "/staff"],
  ])("routes %s to %s", (role, path) => {
    expect(portalPathForRole(role)).toBe(path);
  });

  it("falls back to the sign-in entry point when the role is unavailable", () => {
    expect(portalPathForRole(undefined)).toBe("/portal");
  });
});
