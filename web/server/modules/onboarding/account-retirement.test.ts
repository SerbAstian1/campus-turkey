import { describe, expect, it, vi } from "vitest";
import type { Db } from "@/server/lib/db";
import { isPublicAccountRole, retiredAccountEmail, retirePublicAccount } from "./account-retirement";

describe("public account retirement", () => {
  it.each(["STUDENT", "PARTNER", "REPRESENTATIVE"])("allows the %s role", (role) => {
    expect(isPublicAccountRole(role)).toBe(true);
  });

  it.each(["STAFF", "ADMIN", "SUPER_ADMIN"])("protects the %s role", (role) => {
    expect(isPublicAccountRole(role)).toBe(false);
  });

  it("moves the unique email to a reserved non-deliverable address", () => {
    const userId = "0f6d5c2e-2f3a-4a1b-9c7d-9a1f2b3c4d5e";
    expect(retiredAccountEmail(userId)).toBe(`deleted+${userId}@accounts.invalid`);
  });

  it("revokes authentication and frees the original email", async () => {
    const userId = "0f6d5c2e-2f3a-4a1b-9c7d-9a1f2b3c4d5e";
    const tx = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: userId,
          role: "STUDENT",
          status: "ACTIVE",
          partner: null,
          representative: null,
        }),
        update: vi.fn().mockResolvedValue({ id: userId }),
      },
      session: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      account: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      partner: { update: vi.fn() },
      representativeProfile: { update: vi.fn() },
    } as unknown as Db;

    await retirePublicAccount(tx, userId);

    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    expect(tx.account.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        email: retiredAccountEmail(userId),
        emailVerified: false,
        name: "Deleted account",
        image: null,
        status: "DEACTIVATED",
      },
    });
  });
});
