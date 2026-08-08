/**
 * Withdrawals — business logic.
 *
 * No HTTP in this file. It throws domain errors; `withdrawals.routes.ts` turns them
 * into status codes. That split is what lets the concurrency behaviour below be tested
 * against a real database without a server.
 *
 * The three rules `features/portal/withdrawals.ts` documents as non-optional are all
 * enforced here, and none of them anywhere else:
 *
 *   1. The balance is recomputed server-side inside the transaction that writes the row.
 *   2. The idempotency key makes a retry return the original rather than create a second.
 *   3. A withdrawal is a request. Nothing in this file moves money.
 */

import { serializable, isUniqueViolation, type Db } from "@/server/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import { computeBalance, admitWithdrawal, refusalToResponse } from "@/server/modules/wallet/balance";
import * as repo from "./withdrawals.repository";
import type { WithdrawalRecord } from "./withdrawals.repository";
import { checkTransition, describeRefusal, type TransitionActor, type WithdrawalStatus } from "./withdrawal.state";

export interface RequestWithdrawalInput {
  partnerId: string;
  payoutMethodId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
}

export interface RequestWithdrawalOutput {
  withdrawal: WithdrawalRecord;
  /** True when this call replayed an existing request rather than creating one. */
  replayed: boolean;
}

/**
 * Build the display labels stored on the withdrawal.
 *
 * Snapshotted at request time rather than derived on read: they describe what the
 * partner was told they were withdrawing. Recomputing them later would rewrite history
 * every time a commission was confirmed or reversed.
 */
function describeBasis(confirmedCount: number, period: string): { period: string; basis: string } {
  return {
    period,
    basis:
      confirmedCount === 1
        ? "1 confirmed registration"
        : `${confirmedCount} confirmed registrations`,
  };
}

/**
 * Create a withdrawal request.
 *
 * The whole thing runs in one SERIALIZABLE transaction. The ordering is deliberate:
 *
 *   1. Replay check first — a retry must not do any of the work below twice, and must
 *      not be refused because the balance has since moved.
 *   2. Load the partner and the payout method, both scoped to this partner.
 *   3. Recompute the balance from the commissions and withdrawals as they are *now*.
 *   4. Apply the admission rule.
 *   5. Insert, with the idempotency key, plus the opening audit event.
 *
 * Step 3 is the one that matters. It reads inside the same transaction that writes, at
 * SERIALIZABLE, so two concurrent requests cannot both see the same balance and both
 * be admitted — see the isolation note in `server/lib/db.ts`.
 */
export async function requestWithdrawal(
  input: RequestWithdrawalInput,
  log: RequestLogger,
): Promise<RequestWithdrawalOutput> {
  return serializable(async (tx) => {
    // 1. Replay. Returning the original is the entire contract of the idempotency key:
    //    a dropped response, a double tap, a flaky connection — one withdrawal, not two.
    const existing = await repo.findByIdempotencyKey(tx, input.partnerId, input.idempotencyKey);
    if (existing) {
      log.audit("withdrawal.replayed", {
        withdrawalId: existing.id,
        partnerId: input.partnerId,
        amountMinor: existing.amountMinor,
      });
      return { withdrawal: existing, replayed: true };
    }

    // 2. Partner and method, both scoped. `findFirst` with the partner in the where
    //    clause rather than `findUnique` by id: an id belonging to another partner
    //    returns null here rather than a row we would then have to remember to check.
    const partner = await tx.partner.findUnique({
      where: { id: input.partnerId },
      select: { id: true, currency: true, minimumMinor: true, status: true },
    });
    if (!partner) throw new NotFoundError("We could not find that account.");

    const payoutMethod = await tx.payoutMethod.findFirst({
      where: { id: input.payoutMethodId, partnerId: input.partnerId },
      select: { id: true, archivedAt: true },
    });

    // 3. The balance, as it is right now, inside this transaction.
    const aggregates = await repo.balanceAggregates(tx, input.partnerId);
    const balance = computeBalance(aggregates);

    if (balance.isOverdrawn) {
      // Should be unreachable. If it happens, a commission was reversed after being
      // withdrawn against — a real accounting problem that a human has to resolve, and
      // one that must not be compounded by admitting another withdrawal on top of it.
      log.error("partner balance is overdrawn", {
        partnerId: input.partnerId,
        availableMinor: balance.availableMinor,
      });
      throw new ConflictError(
        "balance_under_review",
        "This account's balance is being reviewed. Your named contact will be in touch.",
      );
    }

    // 4. The admission rule.
    const admission = admitWithdrawal({
      amountMinor: input.amountMinor,
      currency: input.currency,
      balance,
      partner: {
        currency: partner.currency,
        minimumMinor: partner.minimumMinor,
        status: partner.status,
      },
      payoutMethod,
    });

    if (!admission.ok) {
      const response = refusalToResponse(admission.refusal);
      log.audit("withdrawal.refused", {
        partnerId: input.partnerId,
        reason: admission.refusal.code,
        amountMinor: input.amountMinor,
      });

      // The refusal already carries the status the client branches on. Re-deriving it
      // in the route would be a second place for the mapping to drift.
      if (response.status === 409) {
        throw new ConflictError(admission.refusal.code, response.message);
      }
      if (response.status === 403) {
        throw new ForbiddenError(response.message);
      }
      throw new UnprocessableError(admission.refusal.code, response.message);
    }

    // 5. Insert.
    const confirmedCount = await tx.commission.count({
      where: { partnerId: input.partnerId, state: "CONFIRMED" },
    });
    const period = new Date().toISOString().slice(0, 7);
    const labels = describeBasis(confirmedCount, period);
    const reference = await repo.nextReference(tx);

    try {
      const withdrawal = await repo.create(tx, {
        partnerId: input.partnerId,
        payoutMethodId: input.payoutMethodId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        period: labels.period,
        basis: labels.basis,
        idempotencyKey: input.idempotencyKey,
        reference,
      });

      log.audit("withdrawal.requested", {
        withdrawalId: withdrawal.id,
        reference: withdrawal.reference,
        partnerId: input.partnerId,
        amountMinor: withdrawal.amountMinor,
        currency: withdrawal.currency,
        availableBeforeMinor: balance.availableMinor,
      });

      return { withdrawal, replayed: false };
    } catch (error) {
      // Two requests carrying the same key that got past the replay check at step 1 —
      // possible if they interleave precisely. The unique constraint is the backstop,
      // and the correct response is still the original row, not an error.
      if (isUniqueViolation(error, "idempotencyKey")) {
        const original = await repo.findByIdempotencyKey(
          tx,
          input.partnerId,
          input.idempotencyKey,
        );
        if (original) return { withdrawal: original, replayed: true };
      }
      throw error;
    }
  });
}

/**
 * List a partner's withdrawals, newest first, paginated.
 *
 * Paginated because "every withdrawal this partner has ever made" is unbounded, and an
 * unbounded collection is an outage scheduled for whenever the data grows.
 */
export async function listWithdrawals(
  db: Db,
  partnerId: string,
  options: { limit: number; cursor?: string },
): Promise<{ items: WithdrawalRecord[]; nextCursor: string | null }> {
  return repo.listForPartner(db, partnerId, options);
}

/**
 * Move a withdrawal through the state machine. Staff and system callers only.
 *
 * The partner-facing API has no route into this function — approving one's own payout
 * is the failure this whole department exists to prevent, and the state machine refuses
 * `PARTNER` as an actor for every transition. This is belt and braces: the route is
 * staff-gated *and* the machine refuses.
 */
export async function transitionWithdrawal(
  input: {
    withdrawalId: string;
    to: WithdrawalStatus;
    actor: TransitionActor;
    actorUserId: string | null;
    note: string | null;
    providerRef?: string;
  },
  log: RequestLogger,
): Promise<WithdrawalRecord> {
  return serializable(async (tx) => {
    const current = await tx.withdrawal.findUnique({
      where: { id: input.withdrawalId },
      select: { id: true, status: true, partnerId: true, amountMinor: true, reference: true },
    });
    if (!current) throw new NotFoundError("We could not find that withdrawal.");

    const check = checkTransition(current.status, input.to, input.actor, input.note);
    if (!check.ok) {
      throw new ConflictError(
        `transition_${check.refusal.code.replace(/-/g, "_")}`,
        describeRefusal(check.refusal),
      );
    }

    const updated = await repo.transition(tx, {
      withdrawalId: input.withdrawalId,
      from: current.status,
      to: input.to,
      actorUserId: input.actorUserId,
      note: input.note,
      ...(input.providerRef ? { providerRef: input.providerRef } : {}),
    });

    if (!updated) {
      // Compare-and-swap lost: someone else moved it between our read and our write.
      throw new ConflictError(
        "transition_conflict",
        "Someone else updated this withdrawal a moment ago. Reload and try again.",
      );
    }

    log.audit("withdrawal.transitioned", {
      withdrawalId: current.id,
      reference: current.reference,
      partnerId: current.partnerId,
      from: current.status,
      to: input.to,
      actor: input.actor,
      amountMinor: current.amountMinor,
    });

    return updated;
  });
}
