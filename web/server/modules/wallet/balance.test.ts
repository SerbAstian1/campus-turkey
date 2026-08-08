/**
 * The withdrawal admission rule, tested exhaustively.
 *
 * This is a payment path, so the target is 100% — every branch, and for every refusal
 * a test that proves it refuses, not merely that the happy path passes. An admission
 * suite that only tests admission proves nothing.
 */

import { describe, it, expect } from "vitest";
import {
  computeBalance,
  admitWithdrawal,
  refusalToResponse,
  type BalanceAggregates,
  type WithdrawalAdmission,
} from "./balance";

const aggregates = (over: Partial<BalanceAggregates> = {}): BalanceAggregates => ({
  confirmedCommissionMinor: 500_00,
  pendingCommissionMinor: 120_00,
  committedWithdrawalMinor: 100_00,
  ...over,
});

const admission = (over: Partial<WithdrawalAdmission> = {}): WithdrawalAdmission => ({
  amountMinor: 250_00,
  currency: "USD",
  balance: computeBalance(aggregates()),
  partner: { currency: "USD", minimumMinor: 200_00, status: "ACTIVE" },
  payoutMethod: { archivedAt: null },
  ...over,
});

describe("computeBalance", () => {
  it("subtracts committed withdrawals from confirmed commissions", () => {
    const balance = computeBalance(aggregates());
    expect(balance.availableMinor).toBe(400_00);
  });

  it("reports lifetime as total confirmed earnings, not what is left", () => {
    // The distinction matters: a partner who has earned $500 and withdrawn $100 has
    // earned $500. Rendering $400 here would understate their lifetime relationship.
    const balance = computeBalance(aggregates());
    expect(balance.lifetimeMinor).toBe(500_00);
    expect(balance.availableMinor).toBe(400_00);
  });

  it("keeps pending commissions out of the available balance", () => {
    const balance = computeBalance(aggregates({ pendingCommissionMinor: 999_00 }));
    expect(balance.pendingMinor).toBe(999_00);
    expect(balance.availableMinor).toBe(400_00);
  });

  it("is exact at zero", () => {
    const balance = computeBalance({
      confirmedCommissionMinor: 0,
      pendingCommissionMinor: 0,
      committedWithdrawalMinor: 0,
    });
    expect(balance).toEqual({
      availableMinor: 0,
      pendingMinor: 0,
      lifetimeMinor: 0,
      isOverdrawn: false,
    });
  });

  it("flags an overdrawn balance rather than rendering it as money", () => {
    // Reachable only if a confirmed commission is reversed after being withdrawn
    // against. It is an incident, and the flag is what makes it visible.
    const balance = computeBalance(
      aggregates({ confirmedCommissionMinor: 50_00, committedWithdrawalMinor: 100_00 }),
    );
    expect(balance.availableMinor).toBe(-50_00);
    expect(balance.isOverdrawn).toBe(true);
  });

  it("refuses a negative aggregate — a SUM of positive columns cannot be negative", () => {
    expect(() => computeBalance(aggregates({ confirmedCommissionMinor: -1 }))).toThrow(
      /negative/,
    );
  });

  it("refuses a fractional aggregate — money is never a float here", () => {
    expect(() => computeBalance(aggregates({ confirmedCommissionMinor: 10.5 }))).toThrow(
      /not a storable amount/i,
    );
  });

  it("refuses NaN, which is what a failed parse looks like arriving as a number", () => {
    expect(() => computeBalance(aggregates({ committedWithdrawalMinor: Number.NaN })))
      .toThrow(/not a storable amount/i);
  });
});

describe("admitWithdrawal — admits", () => {
  it("a request within the available balance", () => {
    expect(admitWithdrawal(admission())).toEqual({ ok: true });
  });

  it("a request for exactly the available balance — this is what 'withdraw all' does", () => {
    expect(admitWithdrawal(admission({ amountMinor: 400_00 }))).toEqual({ ok: true });
  });

  it("a request for exactly the minimum", () => {
    expect(admitWithdrawal(admission({ amountMinor: 200_00 }))).toEqual({ ok: true });
  });
});

describe("admitWithdrawal — refuses", () => {
  it("one minor unit above the available balance", () => {
    // The off-by-one that matters. 400_01 against an available 400_00.
    const result = admitWithdrawal(admission({ amountMinor: 400_01 }));
    expect(result).toEqual({
      ok: false,
      refusal: { code: "insufficient", availableMinor: 400_00 },
    });
  });

  it("any withdrawal against a zero balance", () => {
    const balance = computeBalance({
      confirmedCommissionMinor: 0,
      pendingCommissionMinor: 0,
      committedWithdrawalMinor: 0,
    });
    const result = admitWithdrawal(admission({ balance, amountMinor: 200_00 }));
    expect(result).toMatchObject({ ok: false, refusal: { code: "insufficient" } });
  });

  it("one minor unit below the minimum", () => {
    const result = admitWithdrawal(admission({ amountMinor: 199_99 }));
    expect(result).toEqual({
      ok: false,
      refusal: { code: "below-minimum", minimumMinor: 200_00 },
    });
  });

  it("a suspended partner", () => {
    const result = admitWithdrawal(
      admission({ partner: { currency: "USD", minimumMinor: 200_00, status: "SUSPENDED" } }),
    );
    expect(result).toEqual({
      ok: false,
      refusal: { code: "partner-not-active", status: "SUSPENDED" },
    });
  });

  it("a closed partner", () => {
    const result = admitWithdrawal(
      admission({ partner: { currency: "USD", minimumMinor: 200_00, status: "CLOSED" } }),
    );
    expect(result).toMatchObject({ ok: false, refusal: { code: "partner-not-active" } });
  });

  it("a currency the partner does not hold", () => {
    const result = admitWithdrawal(admission({ currency: "EUR" }));
    expect(result).toEqual({
      ok: false,
      refusal: { code: "currency-mismatch", expected: "USD" },
    });
  });

  it("a payout method that does not exist or is not the partner's", () => {
    // The repository returns null for both cases on purpose.
    const result = admitWithdrawal(admission({ payoutMethod: null }));
    expect(result).toEqual({ ok: false, refusal: { code: "method-invalid" } });
  });

  it("an archived payout method", () => {
    const result = admitWithdrawal(
      admission({ payoutMethod: { archivedAt: new Date("2026-01-01") } }),
    );
    expect(result).toEqual({ ok: false, refusal: { code: "method-invalid" } });
  });
});

describe("admitWithdrawal — refusal precedence", () => {
  // Getting this order wrong sends people to the wrong support queue.

  it("reports suspension ahead of an insufficient balance", () => {
    const result = admitWithdrawal(
      admission({
        amountMinor: 10_000_00,
        partner: { currency: "USD", minimumMinor: 200_00, status: "SUSPENDED" },
      }),
    );
    expect(result).toMatchObject({ refusal: { code: "partner-not-active" } });
  });

  it("reports an invalid method ahead of an amount below the minimum", () => {
    const result = admitWithdrawal(admission({ amountMinor: 1, payoutMethod: null }));
    expect(result).toMatchObject({ refusal: { code: "method-invalid" } });
  });

  it("reports below-minimum ahead of insufficient when both are true", () => {
    // $1 requested against a $200 minimum and a $0 balance. The actionable message is
    // the minimum, not the balance.
    const balance = computeBalance({
      confirmedCommissionMinor: 0,
      pendingCommissionMinor: 0,
      committedWithdrawalMinor: 0,
    });
    const result = admitWithdrawal(admission({ amountMinor: 1, balance }));
    expect(result).toMatchObject({ refusal: { code: "below-minimum" } });
  });
});

describe("refusalToResponse — the contract the client branches on", () => {
  // features/portal/withdrawals.ts switches on these exact statuses. A change here
  // silently changes what a partner reads about their own money.

  it("maps insufficient to 409, which the client renders as a stale-balance message", () => {
    const response = refusalToResponse({ code: "insufficient", availableMinor: 0 });
    expect(response.status).toBe(409);
    expect(response.reason).toBe("insufficient");
  });

  it("maps method-invalid to 422", () => {
    expect(refusalToResponse({ code: "method-invalid" }).status).toBe(422);
  });

  it("maps below-minimum to 422 — the client treats it as a fixable input problem", () => {
    expect(refusalToResponse({ code: "below-minimum", minimumMinor: 200_00 }).status).toBe(422);
  });

  it("maps a suspended partner to 403, not 409", () => {
    const response = refusalToResponse({ code: "partner-not-active", status: "SUSPENDED" });
    expect(response.status).toBe(403);
  });

  it("never leaks an internal detail into the client-facing message", () => {
    const refusals = [
      { code: "insufficient", availableMinor: 12345 },
      { code: "method-invalid" },
      { code: "below-minimum", minimumMinor: 20000 },
      { code: "currency-mismatch", expected: "USD" },
      { code: "partner-not-active", status: "SUSPENDED" },
    ] as const;

    for (const refusal of refusals) {
      const { message } = refusalToResponse(refusal);
      expect(message).not.toMatch(/prisma|postgres|select|error:|stack/i);
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it("does not disclose the available balance in the insufficient-funds message", () => {
    // The status code carries the meaning; the number would tell an attacker probing
    // with varying amounts exactly where the ceiling sits.
    const { message } = refusalToResponse({ code: "insufficient", availableMinor: 40000 });
    expect(message).not.toMatch(/400|40000/);
  });
});
