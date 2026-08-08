/**
 * Balance arithmetic and the withdrawal admission rule.
 *
 * Pure. No database, no HTTP. The repository supplies three aggregates; everything
 * that decides whether a partner may withdraw happens here, where it can be tested
 * exhaustively without a Postgres instance.
 *
 * This file is the reason `WithdrawForm`'s client-side ceiling is safe to be wrong.
 * The client's number is a courtesy to the reader. This is the control, and it runs
 * inside the same transaction that creates the withdrawal — see withdrawals.service.ts.
 */

import { isValidMinor } from "@/server/lib/money";

/**
 * What the database supplies. Each is a `SUM` over one partner, served by a partial
 * covering index — see migrations/0002_integrity_constraints/migration.sql.
 */
export interface BalanceAggregates {
  /** SUM(amountMinor) WHERE state = CONFIRMED. Money earned and withdrawable. */
  confirmedCommissionMinor: number;
  /** SUM(amountMinor) WHERE state = PENDING. Earned, not yet confirmed. */
  pendingCommissionMinor: number;
  /**
   * SUM(amountMinor) WHERE status <> REJECTED. Money already withdrawn or in flight.
   * The predicate mirrors `isCommitted` in withdrawal.state.ts exactly; if one moves,
   * the other must.
   */
  committedWithdrawalMinor: number;
}

export interface Balance {
  /** What the partner may withdraw right now. */
  availableMinor: number;
  /** Earned but not yet confirmed. Shown separately so the number is explainable. */
  pendingMinor: number;
  /**
   * Total confirmed earnings, all time, whether or not already withdrawn. This is
   * "you have earned this much with us", not "this much is left" — the portal shows
   * both, and conflating them is the kind of thing that generates support tickets.
   */
  lifetimeMinor: number;
  /**
   * True when committed withdrawals exceed confirmed commissions. This should be
   * unreachable: the admission rule below refuses any request that would cause it, and
   * it runs inside the transaction that writes the row. If it is ever true, either a
   * commission was reversed after being withdrawn against, or something bypassed the
   * service layer. Both are incidents, and the caller is expected to alert rather than
   * quietly render a negative number as money.
   */
  isOverdrawn: boolean;
}

export function computeBalance(aggregates: BalanceAggregates): Balance {
  const { confirmedCommissionMinor, pendingCommissionMinor, committedWithdrawalMinor } =
    aggregates;

  for (const [name, value] of Object.entries(aggregates)) {
    if (!isValidMinor(value)) {
      throw new RangeError(`Balance aggregate ${name} is not a storable amount: ${value}`);
    }
    if (value < 0) {
      // A SUM of positive-constrained columns cannot be negative. If one is, the
      // aggregate is wrong and every number derived from it is too.
      throw new RangeError(`Balance aggregate ${name} is negative: ${value}`);
    }
  }

  const availableMinor = confirmedCommissionMinor - committedWithdrawalMinor;

  return {
    availableMinor,
    pendingMinor: pendingCommissionMinor,
    lifetimeMinor: confirmedCommissionMinor,
    isOverdrawn: availableMinor < 0,
  };
}

// ------------------------------------------------------------- admission rule

/** Everything the rule needs to know, gathered by the caller inside the transaction. */
export interface WithdrawalAdmission {
  amountMinor: number;
  currency: string;
  balance: Balance;
  partner: {
    currency: string;
    minimumMinor: number;
    status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  };
  /**
   * The payout method, already loaded and already confirmed to belong to this partner
   * by the repository. `null` when the id matched nothing the partner owns — which is
   * both "you deleted it" and "that is not yours", deliberately indistinguishable to
   * the caller so the endpoint cannot be used to probe for other partners' method ids.
   */
  payoutMethod: { archivedAt: Date | null } | null;
}

export type AdmissionRefusal =
  | { code: "partner-not-active"; status: "SUSPENDED" | "CLOSED" }
  | { code: "currency-mismatch"; expected: string }
  | { code: "below-minimum"; minimumMinor: number }
  | { code: "method-invalid" }
  | { code: "insufficient"; availableMinor: number };

export type AdmissionResult = { ok: true } | { ok: false; refusal: AdmissionRefusal };

/**
 * May this withdrawal be created?
 *
 * Order matters and is deliberate. Cheap identity and configuration checks come before
 * the balance comparison, so a suspended partner or an invalid method gets the accurate
 * reason rather than "insufficient funds" — an error message that sends someone to the
 * wrong support queue is a real cost.
 *
 * The one refusal that deliberately does *not* discriminate is `method-invalid`: an
 * archived method and a method belonging to another partner both produce it. Telling
 * the caller which would turn this endpoint into an oracle for enumerating other
 * partners' payout method ids.
 */
export function admitWithdrawal(input: WithdrawalAdmission): AdmissionResult {
  const { amountMinor, currency, balance, partner, payoutMethod } = input;

  if (partner.status !== "ACTIVE") {
    return { ok: false, refusal: { code: "partner-not-active", status: partner.status } };
  }

  if (currency !== partner.currency) {
    return { ok: false, refusal: { code: "currency-mismatch", expected: partner.currency } };
  }

  if (!payoutMethod || payoutMethod.archivedAt !== null) {
    return { ok: false, refusal: { code: "method-invalid" } };
  }

  if (amountMinor < partner.minimumMinor) {
    return { ok: false, refusal: { code: "below-minimum", minimumMinor: partner.minimumMinor } };
  }

  // The comparison the whole file exists for. `>` not `>=`: withdrawing the entire
  // available balance is legitimate and common — it is what "Withdraw all" does.
  if (amountMinor > balance.availableMinor) {
    return {
      ok: false,
      refusal: { code: "insufficient", availableMinor: balance.availableMinor },
    };
  }

  return { ok: true };
}

/**
 * Map a refusal onto the HTTP status and message the client already handles.
 *
 * `features/portal/withdrawals.ts` branches on 409, 422 and 429 and renders specific
 * copy for each. This function is where that contract is kept — changing a status here
 * silently changes what the partner reads, so the client's expected wording is quoted
 * beside each case.
 */
export function refusalToResponse(refusal: AdmissionRefusal): {
  status: 403 | 409 | 422;
  reason: "insufficient" | "method-invalid" | "limit" | "server";
  message: string;
} {
  switch (refusal.code) {
    case "partner-not-active":
      return {
        status: 403,
        reason: "server",
        message:
          "This account cannot request withdrawals at the moment. Your named contact can explain why.",
      };
    case "currency-mismatch":
      return {
        status: 422,
        reason: "method-invalid",
        message: `Withdrawals for this account are made in ${refusal.expected}.`,
      };
    case "method-invalid":
      // Client renders: "That payout method is no longer valid. Choose another."
      return {
        status: 422,
        reason: "method-invalid",
        message: "That payout method is no longer valid. Choose another.",
      };
    case "below-minimum":
      return {
        status: 422,
        reason: "method-invalid",
        message: "That amount is below the minimum withdrawal for this account.",
      };
    case "insufficient":
      // Client renders: "Your available balance has changed. Refresh and try again."
      return {
        status: 409,
        reason: "insufficient",
        message: "Your available balance has changed. Refresh and try again.",
      };
  }
}
