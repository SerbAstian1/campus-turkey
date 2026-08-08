/**
 * Withdrawal data access. The only module that issues Prisma calls for withdrawals.
 *
 * Every function takes a `Db` rather than importing the client, so the same code runs
 * standalone or inside the serialisable transaction that creates a withdrawal.
 *
 * Every read is scoped by `partnerId` in the query itself, not filtered afterwards.
 * That is the difference between an authorisation check and an authorisation habit:
 * a future caller who forgets to check inherits the scoping because there is no
 * unscoped function to call by mistake.
 */

import type { Db } from "@/server/lib/db";
import type { WithdrawalStatus } from "./withdrawal.state";
import type { Prisma } from "@prisma/client";

/** The narrow shape the portal renders. Deliberately not the full row. */
export const WITHDRAWAL_FIELDS = {
  id: true,
  reference: true,
  period: true,
  basis: true,
  amountMinor: true,
  currency: true,
  status: true,
  requestedAt: true,
} satisfies Prisma.WithdrawalSelect;

export type WithdrawalRecord = Prisma.WithdrawalGetPayload<{
  select: typeof WITHDRAWAL_FIELDS;
}>;

/**
 * The three aggregates the balance is computed from, in one round trip.
 *
 * `SUM` over an empty set is NULL in SQL, not 0 — a partner with no commissions would
 * otherwise produce `NaN` two lines later. `COALESCE` is doing real work here.
 *
 * Returned as strings because Postgres `SUM(integer)` is `bigint`, which the driver
 * hands back as a JS `BigInt` or a string depending on version. Converting explicitly
 * at this boundary is safer than letting a `BigInt` leak into arithmetic that assumes
 * `number`.
 */
export async function balanceAggregates(
  db: Db,
  partnerId: string,
): Promise<{
  confirmedCommissionMinor: number;
  pendingCommissionMinor: number;
  committedWithdrawalMinor: number;
}> {
  const rows = await db.$queryRaw<
    Array<{ confirmed: bigint; pending: bigint; committed: bigint }>
  >`
    SELECT
      COALESCE((
        SELECT SUM("amountMinor") FROM "commission"
        WHERE "partnerId" = ${partnerId}::uuid AND "state" = 'CONFIRMED'
      ), 0) AS confirmed,
      COALESCE((
        SELECT SUM("amountMinor") FROM "commission"
        WHERE "partnerId" = ${partnerId}::uuid AND "state" = 'PENDING'
      ), 0) AS pending,
      COALESCE((
        SELECT SUM("amountMinor") FROM "withdrawal"
        WHERE "partnerId" = ${partnerId}::uuid AND "status" <> 'REJECTED'
      ), 0) AS committed
  `;

  const row = rows[0];
  if (!row) {
    // A scalar aggregate query always returns exactly one row. No row means the query
    // did not run as written, and guessing zero would silently grant a partner a
    // balance of nothing — or, worse, let a withdrawal through against a phantom one.
    throw new Error(`Balance aggregate returned no row for partner ${partnerId}`);
  }

  return {
    confirmedCommissionMinor: Number(row.confirmed),
    pendingCommissionMinor: Number(row.pending),
    committedWithdrawalMinor: Number(row.committed),
  };
}

/** Replay lookup. Scoped to the partner: one partner's key can never match another's. */
export async function findByIdempotencyKey(
  db: Db,
  partnerId: string,
  idempotencyKey: string,
): Promise<WithdrawalRecord | null> {
  return db.withdrawal.findUnique({
    where: { partnerId_idempotencyKey: { partnerId, idempotencyKey } },
    select: WITHDRAWAL_FIELDS,
  });
}

export async function listForPartner(
  db: Db,
  partnerId: string,
  options: { limit: number; cursor?: string },
): Promise<{ items: WithdrawalRecord[]; nextCursor: string | null }> {
  // Fetch one extra to learn whether another page exists without a second COUNT query.
  const rows = await db.withdrawal.findMany({
    where: { partnerId },
    select: WITHDRAWAL_FIELDS,
    orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const items = rows.slice(0, options.limit);
  const nextCursor = rows.length > options.limit ? (items[items.length - 1]?.id ?? null) : null;

  return { items, nextCursor };
}

/**
 * Generate the next human-readable reference, e.g. `WD-2026-000431`.
 *
 * Derived from a Postgres sequence rather than from `COUNT(*) + 1`, which is the
 * classic way to mint duplicate references under concurrency. The sequence is created
 * in migration 0002 and is monotonic regardless of transaction outcome — a gap after a
 * rolled-back request is fine, a collision is not.
 */
export async function nextReference(db: Db): Promise<string> {
  const rows = await db.$queryRaw<Array<{ value: bigint }>>`
    SELECT nextval('withdrawal_reference_seq') AS value
  `;
  const value = rows[0]?.value;
  if (value === undefined) throw new Error("withdrawal_reference_seq returned no value");
  return `WD-${new Date().getUTCFullYear()}-${String(value).padStart(6, "0")}`;
}

export interface CreateWithdrawalInput {
  partnerId: string;
  payoutMethodId: string;
  amountMinor: number;
  currency: string;
  period: string;
  basis: string;
  idempotencyKey: string;
  reference: string;
}

/**
 * Insert the withdrawal and its creation event together.
 *
 * Both writes are in whatever transaction the caller passes. A withdrawal that exists
 * without its opening audit event would be a row nobody can account for, which is
 * precisely the thing the audit trail exists to prevent.
 */
export async function create(
  db: Db,
  input: CreateWithdrawalInput,
): Promise<WithdrawalRecord> {
  const withdrawal = await db.withdrawal.create({
    data: {
      partnerId: input.partnerId,
      payoutMethodId: input.payoutMethodId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      period: input.period,
      basis: input.basis,
      idempotencyKey: input.idempotencyKey,
      reference: input.reference,
      status: "REQUESTED",
    },
    select: WITHDRAWAL_FIELDS,
  });

  await db.withdrawalEvent.create({
    data: {
      withdrawalId: withdrawal.id,
      fromStatus: null,
      toStatus: "REQUESTED",
      // The partner acted, but the actor column references `user`, and the audit
      // question that matters here is "which staff member moved this?" — creation is
      // attributable to the partner through `withdrawal.partnerId` already.
      actorUserId: null,
      note: null,
    },
  });

  return withdrawal;
}

/**
 * Move a withdrawal to a new status, writing the audit event in the same transaction.
 *
 * The `status` guard in the `where` clause is a compare-and-swap: if another request
 * changed the status between the caller's read and this write, zero rows update and
 * the caller learns it lost the race. Without it, two staff members clicking Approve
 * and Reject simultaneously would both succeed and the last write would win silently.
 */
export async function transition(
  db: Db,
  input: {
    withdrawalId: string;
    from: WithdrawalStatus;
    to: WithdrawalStatus;
    actorUserId: string | null;
    note: string | null;
    providerRef?: string;
  },
): Promise<WithdrawalRecord | null> {
  const updated = await db.withdrawal.updateMany({
    where: { id: input.withdrawalId, status: input.from },
    data: {
      status: input.to,
      ...(input.providerRef ? { providerRef: input.providerRef } : {}),
    },
  });

  if (updated.count === 0) return null;

  await db.withdrawalEvent.create({
    data: {
      withdrawalId: input.withdrawalId,
      fromStatus: input.from,
      toStatus: input.to,
      actorUserId: input.actorUserId,
      note: input.note,
    },
  });

  return db.withdrawal.findUniqueOrThrow({
    where: { id: input.withdrawalId },
    select: WITHDRAWAL_FIELDS,
  });
}
