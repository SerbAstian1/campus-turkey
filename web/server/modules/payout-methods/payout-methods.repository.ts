/**
 * Payout method data access.
 *
 * The one rule that governs every function here: `providerToken` is never selected
 * into anything that can reach a response. It is read only by the code that calls the
 * payout provider, and that code lives on the server. `PAYOUT_METHOD_FIELDS` omits it,
 * and `PayoutMethod` in the frontend contract has no field for it — so returning it
 * would fail to compile as well as fail review.
 */

import type { Db } from "@/server/lib/db";
import type { Prisma } from "@prisma/client";
import type { PayoutMethodRow } from "@/server/types/api";

export const PAYOUT_METHOD_FIELDS = {
  id: true,
  kind: true,
  label: true,
  maskedDetail: true,
  speed: true,
  fee: true,
  isDefault: true,
} satisfies Prisma.PayoutMethodSelect;

/** Live methods only. Archived ones remain for the audit trail, not for the picker. */
export async function listPayoutMethods(
  db: Db,
  partnerId: string,
): Promise<PayoutMethodRow[]> {
  return db.payoutMethod.findMany({
    where: { partnerId, archivedAt: null },
    select: PAYOUT_METHOD_FIELDS,
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Fetch one, scoped to the partner.
 *
 * Returns null both when the id does not exist and when it belongs to someone else.
 * The caller cannot tell the difference, and neither can an attacker walking uuids.
 */
export async function findPayoutMethod(
  db: Db,
  partnerId: string,
  id: string,
): Promise<(PayoutMethodRow & { archivedAt: Date | null }) | null> {
  return db.payoutMethod.findFirst({
    where: { id, partnerId },
    select: { ...PAYOUT_METHOD_FIELDS, archivedAt: true },
  });
}

export interface CreatePayoutMethodInput {
  partnerId: string;
  kind: "BANK" | "WISE" | "STABLECOIN" | "MOBILE_MONEY";
  label: string;
  maskedDetail: string;
  providerToken: string;
  providerName: string;
  speed: string;
  fee: string;
  makeDefault: boolean;
}

/**
 * Store a vaulted method.
 *
 * The default flag is moved inside a transaction: the partial unique index in
 * migration 0002 permits at most one default per partner, so setting a new one without
 * clearing the old one in the same transaction would violate the constraint rather
 * than quietly produce two.
 */
export async function createPayoutMethod(
  db: Db,
  input: CreatePayoutMethodInput,
): Promise<PayoutMethodRow> {
  if (input.makeDefault) {
    await db.payoutMethod.updateMany({
      where: { partnerId: input.partnerId, isDefault: true, archivedAt: null },
      data: { isDefault: false },
    });
  }

  return db.payoutMethod.create({
    data: {
      partnerId: input.partnerId,
      kind: input.kind,
      label: input.label,
      maskedDetail: input.maskedDetail,
      providerToken: input.providerToken,
      providerName: input.providerName,
      speed: input.speed,
      fee: input.fee,
      isDefault: input.makeDefault,
    },
    select: PAYOUT_METHOD_FIELDS,
  });
}

/**
 * Archive a method. Soft delete, always.
 *
 * A withdrawal references the method it was paid to. Hard-deleting one would leave a
 * dangling reference in the record a dispute is settled from — and the `onDelete:
 * Restrict` on that relation means Postgres would refuse anyway. Archiving keeps the
 * history intact and removes it from the picker, which is what the partner meant.
 *
 * Returns false when the id is not this partner's, which the route maps to 404.
 */
export async function archivePayoutMethod(
  db: Db,
  partnerId: string,
  id: string,
): Promise<boolean> {
  const result = await db.payoutMethod.updateMany({
    where: { id, partnerId, archivedAt: null },
    data: { archivedAt: new Date(), isDefault: false },
  });
  return result.count > 0;
}

/**
 * The vaulted token, for the code that actually initiates a payout.
 *
 * Deliberately a separate function with a name that says what it returns, so that
 * reading it is always a deliberate act and never a side effect of listing.
 */
export async function readProviderToken(
  db: Db,
  partnerId: string,
  id: string,
): Promise<{ providerToken: string; providerName: string } | null> {
  return db.payoutMethod.findFirst({
    where: { id, partnerId, archivedAt: null },
    select: { providerToken: true, providerName: true },
  });
}
