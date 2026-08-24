/**
 * `wallet.service` — the third money service, and the only one that writes nothing.
 *
 * It assembles what a partner sees about their own money. That makes it read-only and,
 * on the face of it, low stakes — but it is the surface a partner reads *before* deciding
 * to withdraw, and the balance it renders comes from the same `computeBalance` the
 * withdrawal path admits against. A wallet that showed a different number from the one
 * the withdrawal endpoint enforces would produce a refusal the partner cannot explain,
 * which is a support problem rather than an accounting one but is still this module's
 * fault.
 *
 * `balance.test.ts` owns the arithmetic at 100%. What is tested here is the assembly: the
 * two queries running as one round trip rather than in series, the overdrawn case staying
 * readable instead of throwing, and the note matching the account's actual standing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/server/lib/errors";

const balanceAggregates = vi.hoisted(() => vi.fn());
const listPayoutMethods = vi.hoisted(() => vi.fn());

vi.mock("@/server/modules/withdrawals/withdrawals.repository", () => ({ balanceAggregates }));
vi.mock("@/server/modules/payout-methods/payout-methods.repository", () => ({ listPayoutMethods }));

const { getWallet } = await import("./wallet.service");

const db = { partner: { findUnique: vi.fn() } } as unknown as Parameters<typeof getWallet>[0];

const log = () => ({
  audit: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(),
}) as unknown as Parameters<typeof getWallet>[2] & { error: ReturnType<typeof vi.fn> };

const activePartner = { currency: "EUR", minimumMinor: 5_000, status: "ACTIVE" };

const solvent = {
  confirmedCommissionMinor: 120_000,
  pendingCommissionMinor: 30_000,
  committedWithdrawalMinor: 20_000,
};

beforeEach(() => {
  vi.clearAllMocks();
  (db.partner.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activePartner);
  balanceAggregates.mockResolvedValue(solvent);
  listPayoutMethods.mockResolvedValue([{ id: "method-1", kind: "BANK", label: "Main account" }]);
});

describe("assembling a wallet", () => {
  it("refuses an account that does not exist", async () => {
    (db.partner.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(getWallet(db, "partner-1", log())).rejects.toBeInstanceOf(NotFoundError);
    // Nothing is aggregated for an account we have not found.
    expect(balanceAggregates).not.toHaveBeenCalled();
  });

  it("reports the balance, the partner's currency and their minimum", async () => {
    const wallet = await getWallet(db, "partner-1", log());

    expect(wallet.currency).toBe("EUR");
    expect(wallet.minimumMinor).toBe(5_000);
    // 120,000 confirmed less 20,000 committed. The arithmetic itself is balance.test.ts.
    expect(wallet.balance.availableMinor).toBe(100_000);
  });

  it("fetches the aggregates and the payout methods concurrently", async () => {
    let aggregatesSettled = false;
    balanceAggregates.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => { aggregatesSettled = true; resolve(solvent); }, 20)),
    );
    // If these ran in series the methods query would start only after the aggregates
    // resolved. Two round trips in series is the shape this path exists to avoid.
    listPayoutMethods.mockImplementation(async () => {
      expect(aggregatesSettled).toBe(false);
      return [];
    });

    await getWallet(db, "partner-1", log());
    expect(listPayoutMethods).toHaveBeenCalledOnce();
  });

  it("passes the partner's own methods through", async () => {
    const wallet = await getWallet(db, "partner-1", log());
    expect(wallet.methods).toHaveLength(1);
  });
});

describe("an overdrawn account", () => {
  const overdrawn = {
    confirmedCommissionMinor: 10_000,
    pendingCommissionMinor: 0,
    committedWithdrawalMinor: 50_000,
  };

  it("stays readable rather than throwing", async () => {
    balanceAggregates.mockResolvedValue(overdrawn);

    // The withdrawal path is where this becomes a refusal. Throwing here would take the
    // portal away from a partner at exactly the moment they need to see why.
    const wallet = await getWallet(db, "partner-1", log());
    expect(wallet.balance.isOverdrawn).toBe(true);
  });

  it("is logged at error level, because somebody has to resolve it", async () => {
    balanceAggregates.mockResolvedValue(overdrawn);
    const logger = log();

    await getWallet(db, "partner-1", logger);
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("the note beside the balance", () => {
  it("promises same-day review on an active account", async () => {
    const wallet = await getWallet(db, "partner-1", log());
    expect(wallet.note).toMatch(/same working day/i);
  });

  it("says withdrawals are paused when the account is not active", async () => {
    // Saying "reviewed the same working day" to a suspended partner is a promise the
    // withdrawal endpoint will then refuse to keep.
    (db.partner.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activePartner, status: "SUSPENDED",
    });

    const wallet = await getWallet(db, "partner-1", log());
    expect(wallet.note).toMatch(/paused/i);
  });
});
