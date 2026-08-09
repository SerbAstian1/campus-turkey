/**
 * Permissions — brief §27 to §32.
 *
 * One idea holds this file together: **a permission answers "may this kind of user do
 * this kind of thing", and nothing else.** Whether *this particular* record belongs to
 * *this particular* user is a separate question, answered by the service that loads it.
 * Keeping them apart is what stops the familiar bug where a partner with
 * `READ_OWN_REFERRALS` can read everybody's referrals because the check stopped at the
 * verb.
 *
 * Every permission below is therefore scoped in its name. `READ_OWN_APPLICATIONS` is not
 * `READ_APPLICATIONS`, and the difference is load-bearing rather than stylistic.
 *
 * ## Why Partner and Representative have identical grants but separate namespaces
 *
 * §29 is explicit: the two roles currently do the same things, and must not share a
 * permission set. If they shared one, the first divergence — a representative reporting
 * on a territory, a partner seeing commission — would need every call site re-examined to
 * work out which role a check was really protecting. They are built apart while they are
 * cheap to keep apart.
 *
 * ## Where FINANCE went
 *
 * The brief has no FINANCE role because it has no payout system. Campus Turkey has one.
 * The money permissions are therefore granted by *department* rather than by role, which
 * keeps the brief's role vocabulary intact and still lets exactly the right people move
 * money. See `MONEY_PERMISSIONS`.
 */

export type UserRole =
  | "STUDENT"
  | "PARTNER"
  | "REPRESENTATIVE"
  | "STAFF"
  | "ADMIN"
  | "SUPER_ADMIN";

export type UserStatus = "PENDING" | "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type StaffDepartment =
  | "ADMISSIONS"
  | "STUDENT_SUPPORT"
  | "MEDICAL_TOURISM"
  | "BUSINESS"
  | "PARTNERSHIPS"
  | "OPERATIONS"
  | "MARKETING"
  | "MANAGEMENT"
  | "FINANCE";

export const PERMISSIONS = [
  // ── Student, §27 ────────────────────────────────────────────────────────────
  "READ_OWN_PROFILE",
  "UPDATE_OWN_PROFILE",
  "CREATE_APPLICATION",
  "READ_OWN_APPLICATIONS",
  "UPDATE_OWN_DRAFT_APPLICATION",
  "READ_OWN_DOCUMENTS",
  "UPLOAD_OWN_DOCUMENTS",
  "READ_OWN_NOTIFICATIONS",
  "READ_OWN_MESSAGES",
  /** Joining a referred record to this account. Held by STUDENT alone: it is the one
   *  act that changes who owns an application. */
  "CLAIM_STUDENT_RECORD",

  // ── Partner, §28 ────────────────────────────────────────────────────────────
  "PARTNER_CREATE_STUDENT_REFERRAL",
  "PARTNER_READ_OWN_REFERRALS",
  "PARTNER_READ_OWN_REFERRED_STUDENTS",
  "PARTNER_READ_RELEVANT_APPLICATION_STATUS",
  "PARTNER_READ_OWN_WALLET",
  "PARTNER_REQUEST_WITHDRAWAL",
  "PARTNER_ISSUE_CLAIM_CODE",

  // ── Representative, §29 ─────────────────────────────────────────────────────
  // Identical in effect to the partner block above, deliberately not shared.
  "REPRESENTATIVE_CREATE_STUDENT_REFERRAL",
  "REPRESENTATIVE_READ_OWN_REFERRALS",
  "REPRESENTATIVE_READ_OWN_REFERRED_STUDENTS",
  "REPRESENTATIVE_READ_RELEVANT_APPLICATION_STATUS",
  "REPRESENTATIVE_ISSUE_CLAIM_CODE",

  // ── Staff, §30 ──────────────────────────────────────────────────────────────
  "READ_APPLICATIONS",
  "UPDATE_APPLICATIONS",
  "REVIEW_DOCUMENTS",
  "READ_STUDENTS",
  "READ_PARTNERS",
  "READ_REPRESENTATIVES",
  "READ_LEADS",
  "UPDATE_LEADS",
  "READ_INQUIRIES",
  "UPDATE_INQUIRIES",
  "SEND_MESSAGES",
  "READ_AUDIT_LOGS",

  // ── Money. Not in the brief; see the header note. ───────────────────────────
  "READ_ALL_WALLETS",
  "CONFIRM_COMMISSIONS",
  "MANAGE_PAYOUTS",

  // ── Admin, §31 ──────────────────────────────────────────────────────────────
  "MANAGE_USERS",
  "MANAGE_STAFF",
  "MANAGE_PARTNERS",
  "MANAGE_REPRESENTATIVES",
  "MANAGE_APPLICATION_WORKFLOW",
  "MANAGE_UNIVERSITIES",
  "MANAGE_PROGRAMS",
  "MANAGE_SETTINGS",
  "APPROVE_PARTNER_APPLICATION",
  "APPROVE_REPRESENTATIVE_APPLICATION",

  // ── Super admin, §32 ────────────────────────────────────────────────────────
  // Deliberately few. "Full privileges" is expressed by SUPER_ADMIN holding every
  // permission, not by a wildcard — a wildcard cannot be audited, and an audit log
  // that says "had permission" without saying which is not evidence of anything.
  "MANAGE_ROLES",
  "DELETE_ACCOUNTS",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const STUDENT: Permission[] = [
  "READ_OWN_PROFILE",
  "UPDATE_OWN_PROFILE",
  "CREATE_APPLICATION",
  "READ_OWN_APPLICATIONS",
  "UPDATE_OWN_DRAFT_APPLICATION",
  "READ_OWN_DOCUMENTS",
  "UPLOAD_OWN_DOCUMENTS",
  "READ_OWN_NOTIFICATIONS",
  "READ_OWN_MESSAGES",
  "CLAIM_STUDENT_RECORD",
];

const PARTNER: Permission[] = [
  "READ_OWN_PROFILE",
  "UPDATE_OWN_PROFILE",
  "READ_OWN_NOTIFICATIONS",
  "PARTNER_CREATE_STUDENT_REFERRAL",
  "PARTNER_READ_OWN_REFERRALS",
  "PARTNER_READ_OWN_REFERRED_STUDENTS",
  "PARTNER_READ_RELEVANT_APPLICATION_STATUS",
  "PARTNER_READ_OWN_WALLET",
  "PARTNER_REQUEST_WITHDRAWAL",
  "PARTNER_ISSUE_CLAIM_CODE",
];

const REPRESENTATIVE: Permission[] = [
  "READ_OWN_PROFILE",
  "UPDATE_OWN_PROFILE",
  "READ_OWN_NOTIFICATIONS",
  "REPRESENTATIVE_CREATE_STUDENT_REFERRAL",
  "REPRESENTATIVE_READ_OWN_REFERRALS",
  "REPRESENTATIVE_READ_OWN_REFERRED_STUDENTS",
  "REPRESENTATIVE_READ_RELEVANT_APPLICATION_STATUS",
  "REPRESENTATIVE_ISSUE_CLAIM_CODE",
];

const STAFF: Permission[] = [
  "READ_OWN_PROFILE",
  "UPDATE_OWN_PROFILE",
  "READ_OWN_NOTIFICATIONS",
  "READ_APPLICATIONS",
  "UPDATE_APPLICATIONS",
  "REVIEW_DOCUMENTS",
  "READ_STUDENTS",
  "READ_PARTNERS",
  "READ_REPRESENTATIVES",
  "READ_LEADS",
  "UPDATE_LEADS",
  "READ_INQUIRIES",
  "UPDATE_INQUIRIES",
  "SEND_MESSAGES",
  "READ_AUDIT_LOGS",
  /**
   * Reading the payout queue, but not acting on it.
   *
   * The old `SUPPORT` role's documented power was "may read every partner's records, may
   * not approve payouts", and that distinction is preserved here rather than lost in the
   * move to permissions: every staff member can see what is owed, and only Finance and
   * admins can move it. Granting this by department instead would have quietly taken
   * the payout queue away from support staff who use it to answer partner questions.
   */
  "READ_ALL_WALLETS",
];

/** §31: admin is staff plus management. Composed rather than restated, so a permission
 *  added to staff cannot be forgotten here. */
const ADMIN: Permission[] = [
  ...STAFF,
  "MANAGE_USERS",
  "MANAGE_STAFF",
  "MANAGE_PARTNERS",
  "MANAGE_REPRESENTATIVES",
  "MANAGE_APPLICATION_WORKFLOW",
  "MANAGE_UNIVERSITIES",
  "MANAGE_PROGRAMS",
  "MANAGE_SETTINGS",
  "APPROVE_PARTNER_APPLICATION",
  "APPROVE_REPRESENTATIVE_APPLICATION",
  "READ_ALL_WALLETS",
  "CONFIRM_COMMISSIONS",
  "MANAGE_PAYOUTS",
];

/** §32. Every permission, enumerated rather than wildcarded — see the note above. */
const SUPER_ADMIN: Permission[] = [...PERMISSIONS];

const BY_ROLE: Record<UserRole, readonly Permission[]> = {
  STUDENT,
  PARTNER,
  REPRESENTATIVE,
  STAFF,
  ADMIN,
  SUPER_ADMIN,
};

/**
 * Permissions a staff member gains from their department rather than their role.
 *
 * Only Finance grants anything, and only over money. This is where the payout system —
 * which the brief does not model — attaches to the brief's role vocabulary without
 * distorting it.
 */
const MONEY_PERMISSIONS: readonly Permission[] = [
  // Only the two that *move* money. Reading the queue is a base staff permission — see
  // the note on `READ_ALL_WALLETS` in the STAFF list.
  "CONFIRM_COMMISSIONS",
  "MANAGE_PAYOUTS",
];

const BY_DEPARTMENT: Partial<Record<StaffDepartment, readonly Permission[]>> = {
  FINANCE: MONEY_PERMISSIONS,
};

export interface Principal {
  role: UserRole;
  status: UserStatus;
  department?: StaffDepartment | null;
}

/**
 * Is this account usable at all?
 *
 * Asked before any permission is considered, because the two questions are independent
 * and conflating them is how a suspended administrator keeps administering. A suspended
 * user holds exactly the permissions their role implies; they simply may not act.
 */
export function canAct(principal: Pick<Principal, "status">): boolean {
  return principal.status === "ACTIVE";
}

/** Everything this principal may do. Empty for an account that may not act at all. */
export function permissionsFor(principal: Principal): ReadonlySet<Permission> {
  if (!canAct(principal)) return new Set();

  const granted = new Set<Permission>(BY_ROLE[principal.role]);

  // Department grants apply only to staff-shaped roles. A partner with a department
  // should be impossible, but "impossible" is a claim about today's code, and this is
  // a money permission.
  const staffShaped =
    principal.role === "STAFF" || principal.role === "ADMIN" || principal.role === "SUPER_ADMIN";

  if (staffShaped && principal.department) {
    for (const permission of BY_DEPARTMENT[principal.department] ?? []) granted.add(permission);
  }

  return granted;
}

/** Does this principal hold every permission listed? */
export function hasPermission(
  principal: Principal,
  required: readonly Permission[],
): boolean {
  if (required.length === 0) return canAct(principal);
  const granted = permissionsFor(principal);
  return required.every((permission) => granted.has(permission));
}

/**
 * The one place that decides whether a role belongs to Campus Turkey's own staff.
 *
 * Used for "is this an internal user" questions — console access, internal notes — never
 * for "may they do X", which is what permissions are for.
 */
export function isInternal(role: UserRole): boolean {
  return role === "STAFF" || role === "ADMIN" || role === "SUPER_ADMIN";
}
