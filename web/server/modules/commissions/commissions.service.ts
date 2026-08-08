/**
 * Commissions — the path that makes money withdrawable.
 *
 * This is the mechanism behind the open question "what event confirms a registration,
 * and who records it?". The *policy* is still the client's to set; what this provides is
 * the operation that policy will call. Until a commission reaches CONFIRMED, a partner's
 * available balance is zero no matter how many students they have referred.
 *
 * Every write is an explicit, attributed action by a named staff user. There is no
 * bulk-confirm and no automatic confirmation on a stage change: money becoming
 * withdrawable is a decision, and a decision has an author.
 */

import { serializable, type Db } from "@/server/lib/db";
import { ConflictError, NotFoundError, UnprocessableError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import {
  checkCommissionTransition,
  confirmedAtFor,
  describeCommissionRefusal,
  type CommissionActor,
  type CommissionState,
} from "./commission.state";

export interface CreateCommissionInput {
  studentId: string;
  amountMinor: number;
  currency: string;
  basis: string;
  /** `YYYY-MM`. The database CHECK rejects anything else. */
  period: string;
  /** Created CONFIRMED only when the registration is already verified. */
  confirmed: boolean;
}

/**
 * Record a commission against a student.
 *
 * The partner is read from the student rather than accepted from the caller. That is
 * not convenience — `commission.partnerId` is denormalised, and the composite foreign
 * key requires it to match the student's. Taking it from the request would let a typo
 * become a foreign-key error at best and a misattributed payment at worst.
 *
 * The currency comes from the partner for the same reason: the composite key ties
 * `(partnerId, currency)` to the partner's own, so a commission cannot be denominated in
 * anything else.
 */
export async function createCommission(
  input: CreateCommissionInput,
  actor: { id: string; role: CommissionActor },
  log: RequestLogger,
) {
  return serializable(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: {
        id: true,
        name: true,
        partnerId: true,
        partner: { select: { currency: true, status: true } },
      },
    });
    if (!student) throw new NotFoundError("We could not find that student.");

    if (student.partner.status === "CLOSED") {
      throw new UnprocessableError(
        "partner_closed",
        "That partner's account is closed. Reopen it before recording a commission.",
      );
    }

    if (input.currency !== student.partner.currency) {
      throw new UnprocessableError(
        "currency_mismatch",
        `That partner is paid in ${student.partner.currency}.`,
      );
    }

    const state: CommissionState = input.confirmed ? "CONFIRMED" : "PENDING";

    const commission = await tx.commission.create({
      data: {
        studentId: student.id,
        partnerId: student.partnerId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        state,
        basis: input.basis,
        period: input.period,
        confirmedAt: confirmedAtFor(state),
      },
      select: {
        id: true, amountMinor: true, currency: true, state: true,
        basis: true, period: true, confirmedAt: true, createdAt: true,
      },
    });

    log.audit("commission.created", {
      commissionId: commission.id,
      partnerId: student.partnerId,
      studentId: student.id,
      amountMinor: commission.amountMinor,
      state,
      actorUserId: actor.id,
    });

    return commission;
  });
}

/**
 * Move a commission through its states.
 *
 * Runs at SERIALIZABLE because confirming changes a partner's available balance, and a
 * withdrawal request may be reading that balance at the same moment. Without it, a
 * confirmation and a withdrawal can interleave such that the withdrawal is admitted
 * against a balance that is being rewritten underneath it.
 *
 * The `state` guard in the update is a compare-and-swap: two staff users acting on the
 * same commission at once produce one winner and one clear refusal, rather than a last
 * -write-wins that silently discards somebody's decision.
 */
export async function transitionCommission(
  input: {
    commissionId: string;
    to: CommissionState;
    note: string | null;
  },
  actor: { id: string; role: CommissionActor },
  log: RequestLogger,
) {
  return serializable(async (tx) => {
    const current = await tx.commission.findUnique({
      where: { id: input.commissionId },
      select: { id: true, state: true, partnerId: true, amountMinor: true },
    });
    if (!current) throw new NotFoundError("We could not find that commission.");

    const check = checkCommissionTransition(current.state, input.to, actor.role, input.note);
    if (!check.ok) {
      throw new ConflictError(
        `commission_${check.refusal.code.replace(/-/g, "_")}`,
        describeCommissionRefusal(check.refusal),
      );
    }

    const updated = await tx.commission.updateMany({
      where: { id: input.commissionId, state: current.state },
      data: { state: input.to, confirmedAt: confirmedAtFor(input.to) },
    });

    if (updated.count === 0) {
      throw new ConflictError(
        "commission_conflict",
        "Someone else updated this commission a moment ago. Reload and try again.",
      );
    }

    log.audit("commission.transitioned", {
      commissionId: current.id,
      partnerId: current.partnerId,
      from: current.state,
      to: input.to,
      amountMinor: current.amountMinor,
      actorUserId: actor.id,
      note: input.note,
    });

    /*
     * Reversing a confirmed commission can push a partner negative if the money has
     * already been withdrawn. That is a real accounting situation, not a bug to hide —
     * so it is logged at error level and left visible. The withdrawal endpoint refuses
     * new requests while a balance is overdrawn; a human resolves the rest.
     */
    if (current.state === "CONFIRMED" && input.to === "REVERSED") {
      log.warn("confirmed commission reversed — partner balance may now be overdrawn", {
        commissionId: current.id,
        partnerId: current.partnerId,
        amountMinor: current.amountMinor,
      });
    }

    return tx.commission.findUniqueOrThrow({
      where: { id: input.commissionId },
      select: {
        id: true, amountMinor: true, currency: true, state: true,
        basis: true, period: true, confirmedAt: true, createdAt: true,
      },
    });
  });
}

/** A partner's commissions, newest first, for the staff console. */
export async function listCommissions(
  db: Db,
  filter: { partnerId?: string; state?: CommissionState },
  options: { limit: number; cursor?: string },
) {
  const rows = await db.commission.findMany({
    where: {
      ...(filter.partnerId ? { partnerId: filter.partnerId } : {}),
      ...(filter.state ? { state: filter.state } : {}),
    },
    select: {
      id: true, amountMinor: true, currency: true, state: true, basis: true,
      period: true, confirmedAt: true, createdAt: true,
      student: { select: { id: true, name: true, universityName: true } },
      partner: { select: { id: true, org: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const items = rows.slice(0, options.limit);
  return {
    items,
    nextCursor: rows.length > options.limit ? (items[items.length - 1]?.id ?? null) : null,
  };
}
