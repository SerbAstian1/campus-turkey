/**
 * The commission state machine.
 *
 * Pure. No database, no HTTP — the same shape as `withdrawal.state.ts`, and for the
 * same reason: this decides when money becomes withdrawable, so it is tested
 * exhaustively without a server.
 *
 * Three states, and the whole business rule is in the transitions:
 *
 *   PENDING    earned, not yet confirmed. Counts toward `pendingMinor`.
 *   CONFIRMED  Campus Turkey has verified the registration. Counts toward
 *              `availableMinor` — this is the transition that lets a partner withdraw.
 *   REVERSED   the registration fell through. Counts toward nothing.
 *
 * `CONFIRMED → REVERSED` is deliberately allowed, and it is the uncomfortable one: a
 * university can cancel a registration after the fact. It is also the only way a
 * partner's balance can go negative, because the money may already have been withdrawn
 * against it — which is exactly why `computeBalance` reports `isOverdrawn` instead of
 * quietly rendering a negative number.
 */

export const COMMISSION_STATES = ["PENDING", "CONFIRMED", "REVERSED"] as const;

export type CommissionState = (typeof COMMISSION_STATES)[number];

/** Who may drive a transition. Confirming money is a finance decision, not support's. */
export type CommissionActor = "FINANCE" | "ADMIN" | "SYSTEM";

interface Transition {
  readonly to: CommissionState;
  readonly by: readonly CommissionActor[];
  /** A reversal takes money back. It has to say why. */
  readonly noteRequired: boolean;
}

const TRANSITIONS: Readonly<Record<CommissionState, readonly Transition[]>> = {
  PENDING: [
    { to: "CONFIRMED", by: ["FINANCE", "ADMIN"], noteRequired: false },
    { to: "REVERSED", by: ["FINANCE", "ADMIN"], noteRequired: true },
  ],
  CONFIRMED: [
    // The registration was cancelled after confirmation. Rare, and the reason it is
    // permitted at all is that pretending otherwise would leave the books wrong.
    { to: "REVERSED", by: ["FINANCE", "ADMIN"], noteRequired: true },
  ],
  REVERSED: [],
};

export function isTerminal(state: CommissionState): boolean {
  return TRANSITIONS[state].length === 0;
}

/** Does this state contribute to the partner's withdrawable balance? */
export function isWithdrawable(state: CommissionState): boolean {
  return state === "CONFIRMED";
}

/** Does this state contribute to `pendingMinor` — earned but not yet available? */
export function isPending(state: CommissionState): boolean {
  return state === "PENDING";
}

export type CommissionRefusal =
  | { code: "terminal"; from: CommissionState }
  | { code: "not-allowed"; from: CommissionState; to: CommissionState }
  | { code: "wrong-actor"; to: CommissionState; permitted: readonly CommissionActor[] }
  | { code: "note-required"; to: CommissionState };

export type CommissionCheck =
  | { ok: true }
  | { ok: false; refusal: CommissionRefusal };

export function checkCommissionTransition(
  from: CommissionState,
  to: CommissionState,
  actor: CommissionActor,
  note: string | null = null,
): CommissionCheck {
  if (isTerminal(from)) return { ok: false, refusal: { code: "terminal", from } };

  const transition = TRANSITIONS[from].find((t) => t.to === to);
  if (!transition) return { ok: false, refusal: { code: "not-allowed", from, to } };

  if (!transition.by.includes(actor)) {
    return { ok: false, refusal: { code: "wrong-actor", to, permitted: transition.by } };
  }

  if (transition.noteRequired && (note === null || note.trim() === "")) {
    return { ok: false, refusal: { code: "note-required", to } };
  }

  return { ok: true };
}

export function describeCommissionRefusal(refusal: CommissionRefusal): string {
  switch (refusal.code) {
    case "terminal":
      return `This commission is already ${refusal.from.toLowerCase()} and cannot change.`;
    case "not-allowed":
      return `A commission cannot go from ${refusal.from.toLowerCase()} to ${refusal.to.toLowerCase()}.`;
    case "wrong-actor":
      return `You do not have permission to move this commission to ${refusal.to.toLowerCase()}.`;
    case "note-required":
      return "A reason is required when reversing a commission.";
  }
}

/**
 * `confirmedAt` must be set if and only if the state is CONFIRMED — the database
 * enforces this with a CHECK constraint, and this is the one place that computes it so
 * no caller has to remember.
 */
export function confirmedAtFor(state: CommissionState, now: Date = new Date()): Date | null {
  return state === "CONFIRMED" ? now : null;
}
