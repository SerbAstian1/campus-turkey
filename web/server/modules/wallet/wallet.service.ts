/**
 * Wallet — the partner's view of their own money.
 *
 * Read-only. Everything that changes a balance lives in the withdrawals module; this
 * one assembles what the portal renders and nothing else.
 */

import type { Db } from "@/server/lib/db";
import { NotFoundError } from "@/server/lib/errors";
import type { RequestLogger } from "@/server/lib/logger";
import { balanceAggregates } from "@/server/modules/withdrawals/withdrawals.repository";
import { computeBalance, type Balance } from "./balance";
import { listPayoutMethods } from "@/server/modules/payout-methods/payout-methods.repository";
import type { PayoutMethodRow } from "@/server/types/api";

export interface WalletView {
  balance: Balance;
  currency: string;
  minimumMinor: number;
  note: string;
  methods: PayoutMethodRow[];
}

/**
 * Assemble the wallet.
 *
 * Two queries, not N: the aggregates come back in one round trip (three correlated
 * subqueries in a single statement — see `balanceAggregates`), and the payout methods
 * in another. There is no per-commission or per-withdrawal query anywhere in this path,
 * which is what keeps it inside the p95 target as a partner's history grows.
 */
export async function getWallet(
  db: Db,
  partnerId: string,
  log: RequestLogger,
): Promise<WalletView> {
  const partner = await db.partner.findUnique({
    where: { id: partnerId },
    select: { currency: true, minimumMinor: true, status: true },
  });
  if (!partner) throw new NotFoundError("We could not find that account.");

  const [aggregates, methods] = await Promise.all([
    balanceAggregates(db, partnerId),
    listPayoutMethods(db, partnerId),
  ]);

  const balance = computeBalance(aggregates);

  if (balance.isOverdrawn) {
    // Surfaced as a log line rather than an error: the partner should still be able to
    // read their portal. The withdrawal path is where it becomes a refusal.
    log.error("partner balance is overdrawn", {
      partnerId,
      availableMinor: balance.availableMinor,
    });
  }

  return {
    balance,
    currency: partner.currency,
    minimumMinor: partner.minimumMinor,
    note:
      partner.status === "ACTIVE"
        ? "Withdrawals are reviewed the same working day."
        : "Withdrawals are paused on this account. Your named contact can explain why.",
    methods,
  };
}
