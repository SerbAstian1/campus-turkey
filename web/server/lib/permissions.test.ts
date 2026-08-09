/**
 * The permission matrix.
 *
 * §89 makes a specific demand that most permission suites skip: a Partner must not gain
 * Representative permissions merely because the UI looks similar, and a Representative
 * must not gain Partner permissions merely because the endpoint names are similar. Those
 * two roles currently do identical work, which is exactly why the boundary needs a test —
 * nothing about running the product would reveal that it had been crossed.
 */

import { describe, expect, it } from "vitest";
import {
  canAct,
  hasPermission,
  isInternal,
  permissionsFor,
  PERMISSIONS,
  type Permission,
  type Principal,
  type UserRole,
} from "./permissions";

const principal = (role: UserRole, over: Partial<Principal> = {}): Principal => ({
  role,
  status: "ACTIVE",
  ...over,
});

describe("account status gates everything", () => {
  it.each(["PENDING", "INVITED", "SUSPENDED", "DEACTIVATED"] as const)(
    "a %s account holds no permissions at all",
    (status) => {
      // Checked against ADMIN specifically: if status is ever evaluated after role, the
      // most privileged role is where that mistake does the most damage.
      expect(permissionsFor(principal("ADMIN", { status })).size).toBe(0);
      expect(canAct({ status })).toBe(false);
    },
  );

  it("a suspended super admin cannot act", () => {
    expect(hasPermission(principal("SUPER_ADMIN", { status: "SUSPENDED" }), ["MANAGE_USERS"]))
      .toBe(false);
  });

  it("an active account can", () => {
    expect(hasPermission(principal("ADMIN"), ["MANAGE_USERS"])).toBe(true);
  });
});

describe("§89 — partner and representative do not leak into each other", () => {
  const partner = permissionsFor(principal("PARTNER"));
  const representative = permissionsFor(principal("REPRESENTATIVE"));

  it("a partner holds no representative permission", () => {
    const leaked = [...partner].filter((p) => p.startsWith("REPRESENTATIVE_"));
    expect(leaked).toEqual([]);
  });

  it("a representative holds no partner permission", () => {
    const leaked = [...representative].filter((p) => p.startsWith("PARTNER_"));
    expect(leaked).toEqual([]);
  });

  it("neither can read the other's referred students", () => {
    expect(hasPermission(principal("PARTNER"), ["REPRESENTATIVE_READ_OWN_REFERRED_STUDENTS"])).toBe(false);
    expect(hasPermission(principal("REPRESENTATIVE"), ["PARTNER_READ_OWN_REFERRED_STUDENTS"])).toBe(false);
  });

  it("both can still refer a student, through their own permission", () => {
    expect(hasPermission(principal("PARTNER"), ["PARTNER_CREATE_STUDENT_REFERRAL"])).toBe(true);
    expect(hasPermission(principal("REPRESENTATIVE"), ["REPRESENTATIVE_CREATE_STUDENT_REFERRAL"])).toBe(true);
  });
});

describe("§89 — staff do not automatically gain admin", () => {
  it.each([
    "MANAGE_USERS",
    "MANAGE_STAFF",
    "MANAGE_UNIVERSITIES",
    "MANAGE_SETTINGS",
    "APPROVE_PARTNER_APPLICATION",
  ] as Permission[])("staff cannot %s", (permission) => {
    expect(hasPermission(principal("STAFF"), [permission])).toBe(false);
  });

  it("but staff can do the operational work §30 grants them", () => {
    expect(hasPermission(principal("STAFF"), ["READ_LEADS", "UPDATE_LEADS", "REVIEW_DOCUMENTS"]))
      .toBe(true);
  });

  it("admin holds everything staff holds", () => {
    const staff = permissionsFor(principal("STAFF"));
    const admin = permissionsFor(principal("ADMIN"));
    for (const permission of staff) expect(admin.has(permission)).toBe(true);
  });
});

describe("students are confined to their own records", () => {
  const student = permissionsFor(principal("STUDENT"));

  it("holds only OWN-scoped or self-service permissions", () => {
    // Every student permission must name its scope. An unscoped verb like
    // READ_APPLICATIONS in this set would read every applicant's file.
    const unscoped = [...student].filter(
      (p) => !p.includes("OWN") && p !== "CREATE_APPLICATION",
    );
    expect(unscoped).toEqual([]);
  });

  it.each([
    "READ_APPLICATIONS",
    "READ_STUDENTS",
    "READ_PARTNERS",
    "READ_AUDIT_LOGS",
    "MANAGE_USERS",
  ] as Permission[])("cannot %s", (permission) => {
    expect(hasPermission(principal("STUDENT"), [permission])).toBe(false);
  });
});

describe("money permissions come from the department, not the role", () => {
  it("plain staff cannot move money", () => {
    expect(hasPermission(principal("STAFF"), ["MANAGE_PAYOUTS"])).toBe(false);
    expect(hasPermission(principal("STAFF"), ["CONFIRM_COMMISSIONS"])).toBe(false);
  });

  it("staff in Finance can", () => {
    const finance = principal("STAFF", { department: "FINANCE" });
    expect(hasPermission(finance, ["MANAGE_PAYOUTS", "CONFIRM_COMMISSIONS"])).toBe(true);
  });

  it("staff in any other department cannot", () => {
    for (const department of ["ADMISSIONS", "MARKETING", "OPERATIONS", "MANAGEMENT"] as const) {
      expect(hasPermission(principal("STAFF", { department }), ["MANAGE_PAYOUTS"])).toBe(false);
    }
  });

  it("admin can regardless of department, because §31 grants it by role", () => {
    expect(hasPermission(principal("ADMIN"), ["MANAGE_PAYOUTS"])).toBe(true);
  });

  /**
   * A partner row should never carry a department. If one ever does, it must not become
   * a grant — a partner who could approve payouts would be approving their own.
   */
  it("a department on a non-staff role grants nothing", () => {
    const partner = principal("PARTNER", { department: "FINANCE" });
    expect(hasPermission(partner, ["MANAGE_PAYOUTS"])).toBe(false);
  });
});

describe("super admin", () => {
  it("holds every declared permission", () => {
    const granted = permissionsFor(principal("SUPER_ADMIN"));
    for (const permission of PERMISSIONS) expect(granted.has(permission)).toBe(true);
  });

  it("holds the destructive ones nobody else does", () => {
    for (const role of ["STUDENT", "PARTNER", "REPRESENTATIVE", "STAFF", "ADMIN"] as UserRole[]) {
      expect(hasPermission(principal(role), ["DELETE_ACCOUNTS"])).toBe(false);
      expect(hasPermission(principal(role), ["MANAGE_ROLES"])).toBe(false);
    }
    expect(hasPermission(principal("SUPER_ADMIN"), ["DELETE_ACCOUNTS", "MANAGE_ROLES"])).toBe(true);
  });
});

describe("internal roles", () => {
  it.each(["STAFF", "ADMIN", "SUPER_ADMIN"] as UserRole[])("%s is internal", (role) => {
    expect(isInternal(role)).toBe(true);
  });

  it.each(["STUDENT", "PARTNER", "REPRESENTATIVE"] as UserRole[])("%s is not", (role) => {
    expect(isInternal(role)).toBe(false);
  });
});

describe("the catalogue itself", () => {
  it("has no duplicates", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it("grants every declared permission to somebody", () => {
    // A permission held by no role is either a missing grant or dead weight, and both
    // are worth knowing about the moment they appear rather than at the next audit.
    const everyone = new Set<Permission>();
    for (const role of ["STUDENT", "PARTNER", "REPRESENTATIVE", "STAFF", "ADMIN", "SUPER_ADMIN"] as UserRole[]) {
      for (const p of permissionsFor(principal(role, { department: "FINANCE" }))) everyone.add(p);
    }
    const orphaned = PERMISSIONS.filter((p) => !everyone.has(p));
    expect(orphaned).toEqual([]);
  });

  it("requires an empty permission list to still mean 'must be able to act'", () => {
    expect(hasPermission(principal("STUDENT"), [])).toBe(true);
    expect(hasPermission(principal("STUDENT", { status: "SUSPENDED" }), [])).toBe(false);
  });
});
