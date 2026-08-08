/**
 * The withdrawal state machine.
 *
 * Pure. No database, no HTTP, no Prisma import. Every rule about which status may
 * follow which, and which statuses hold money, is decided here and nowhere else — so
 * the rules can be tested exhaustively without a server, and so a second caller
 * (a provider webhook, a staff console, a reconciliation job) cannot invent a
 * different set by accident.
 *
 * The status names are `Withdrawal["status"]` from `app/src/content/types.ts`, upper
 * -cased for the database enum. They are the frontend's contract and are not
 * renegotiated here.
 *
 * Note for anyone reading BACKEND-PLAN.md alongside this file: that document proposed
 * `requested → approved → sent → settled | failed`. The shipped frontend type is
 * `Requested | Approved | Processing | Paid | Rejected`, and the frontend contract
 * wins — `WITHDRAWAL_STATUS` in features/portal/withdrawals.ts already renders copy
 * for exactly these five. Changing the names would break the portal to match a plan.
 */

export const WITHDRAWAL_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "PROCESSING",
  "PAID",
  "REJECTED",
] as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

/**
 * Who is permitted to drive each transition. Enforced by the service layer against the
 * caller's role; stated here so the answer to "who can approve a payout?" lives beside
 * the transition itself rather than in a route handler.
 */
export type TransitionActor = "PARTNER" | "FINANCE" | "SYSTEM";

interface Transition {
  readonly to: WithdrawalStatus;
  readonly by: readonly TransitionActor[];
  /** A rejection has to say why — it is the transition a partner will ask about. */
  readonly noteRequired: boolean;
}

/**
 * The whole machine, in one table.
 *
 * Money does not move until PROCESSING. A human at Campus Turkey moves REQUESTED to
 * APPROVED, which is what makes the portal's promise — "reviewed the same working
 * day" — a process rather than a slogan.
 *
 * REJECTED is reachable from every non-terminal state, including PROCESSING, because
 * a payout provider can refuse or bounce a transfer after accepting it. That edge is
 * the reason `isCommitted` exists: the amount is held against the balance from the
 * moment it is requested and released only on rejection.
 */
const TRANSITIONS: Readonly<Record<WithdrawalStatus, readonly Transition[]>> = {
  REQUESTED: [
    { to: "APPROVED", by: ["FINANCE"], noteRequired: false },
    { to: "REJECTED", by: ["FINANCE"], noteRequired: true },
  ],
  APPROVED: [
    { to: "PROCESSING", by: ["FINANCE", "SYSTEM"], noteRequired: false },
    { to: "REJECTED", by: ["FINANCE"], noteRequired: true },
  ],
  PROCESSING: [
    { to: "PAID", by: ["SYSTEM", "FINANCE"], noteRequired: false },
    // The provider refused or reversed it. The money returns to available.
    { to: "REJECTED", by: ["SYSTEM", "FINANCE"], noteRequired: true },
  ],
  PAID: [],
  REJECTED: [],
};

/** Terminal states record a finished outcome and never change again. */
export function isTerminal(status: WithdrawalStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/**
 * Does this status hold money against the partner's available balance?
 *
 * Everything except REJECTED. A requested withdrawal is not yet paid, but the partner
 * must not be able to request it twice — so it is committed from the moment it exists.
 * This single predicate is what the balance query's partial index mirrors; if one
 * changes, the other must.
 */
export function isCommitted(status: WithdrawalStatus): boolean {
  return status !== "REJECTED";
}

export type TransitionRefusal =
  | { code: "terminal"; from: WithdrawalStatus }
  | { code: "not-allowed"; from: WithdrawalStatus; to: WithdrawalStatus }
  | { code: "wrong-actor"; to: WithdrawalStatus; permitted: readonly TransitionActor[] }
  | { code: "note-required"; to: WithdrawalStatus };

export type TransitionCheck =
  | { ok: true }
  | { ok: false; refusal: TransitionRefusal };

/**
 * May `actor` move a withdrawal from `from` to `to`?
 *
 * Returns a reason rather than a boolean, because every caller needs to explain the
 * refusal — to a partner, to a staff user, or to a log line that someone will read at
 * 2am.
 */
export function checkTransition(
  from: WithdrawalStatus,
  to: WithdrawalStatus,
  actor: TransitionActor,
  note: string | null = null,
): TransitionCheck {
  if (isTerminal(from)) {
    return { ok: false, refusal: { code: "terminal", from } };
  }

  const transition = TRANSITIONS[from].find((t) => t.to === to);
  if (!transition) {
    return { ok: false, refusal: { code: "not-allowed", from, to } };
  }

  if (!transition.by.includes(actor)) {
    return { ok: false, refusal: { code: "wrong-actor", to, permitted: transition.by } };
  }

  if (transition.noteRequired && (note === null || note.trim() === "")) {
    return { ok: false, refusal: { code: "note-required", to } };
  }

  return { ok: true };
}

/** Every status reachable in one step, for rendering a staff console's action list. */
export function nextStatuses(
  from: WithdrawalStatus,
  actor: TransitionActor,
): readonly WithdrawalStatus[] {
  return TRANSITIONS[from].filter((t) => t.by.includes(actor)).map((t) => t.to);
}

/** Human-readable refusal, safe to return to a client. Leaks no internals. */
export function describeRefusal(refusal: TransitionRefusal): string {
  switch (refusal.code) {
    case "terminal":
      return `This withdrawal is already ${refusal.from.toLowerCase()} and cannot change.`;
    case "not-allowed":
      return `A withdrawal cannot go from ${refusal.from.toLowerCase()} to ${refusal.to.toLowerCase()}.`;
    case "wrong-actor":
      return `You do not have permission to move this withdrawal to ${refusal.to.toLowerCase()}.`;
    case "note-required":
      return "A reason is required when rejecting a withdrawal.";
  }
}
