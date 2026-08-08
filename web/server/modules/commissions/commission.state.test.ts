/**
 * The commission state machine, tested exhaustively.
 *
 * All nine (from, to) pairs, not the three someone remembered. This machine decides
 * when a partner can withdraw, so its unintended paths matter as much as its intended
 * ones.
 */

import { describe, it, expect } from "vitest";
import {
  COMMISSION_STATES,
  checkCommissionTransition,
  confirmedAtFor,
  describeCommissionRefusal,
  isPending,
  isTerminal,
  isWithdrawable,
  type CommissionState,
} from "./commission.state";

const ALLOWED: ReadonlyArray<[CommissionState, CommissionState]> = [
  ["PENDING", "CONFIRMED"],
  ["PENDING", "REVERSED"],
  ["CONFIRMED", "REVERSED"],
];

const allowed = (from: CommissionState, to: CommissionState) =>
  ALLOWED.some(([f, t]) => f === from && t === to);

const note = (to: CommissionState) => (to === "REVERSED" ? "Registration cancelled." : null);

describe("the transition matrix, exhaustively", () => {
  for (const from of COMMISSION_STATES) {
    for (const to of COMMISSION_STATES) {
      const expected = allowed(from, to);
      it(`${expected ? "allows" : "refuses"} FINANCE: ${from} -> ${to}`, () => {
        expect(checkCommissionTransition(from, to, "FINANCE", note(to)).ok).toBe(expected);
      });
    }
  }

  it("covers all nine pairs", () => {
    expect(COMMISSION_STATES.length ** 2).toBe(9);
  });
});

describe("what counts toward a balance", () => {
  it("only CONFIRMED is withdrawable", () => {
    expect(isWithdrawable("CONFIRMED")).toBe(true);
    expect(isWithdrawable("PENDING")).toBe(false);
    expect(isWithdrawable("REVERSED")).toBe(false);
  });

  it("only PENDING counts as pending", () => {
    expect(isPending("PENDING")).toBe(true);
    expect(isPending("CONFIRMED")).toBe(false);
    expect(isPending("REVERSED")).toBe(false);
  });

  it("agrees with the partial indexes in migration 0002", () => {
    // The indexes are `WHERE state = 'CONFIRMED'` and `WHERE state = 'PENDING'`. If
    // these predicates and those disagree, the balance is summed over a different set
    // than it claims.
    expect(COMMISSION_STATES.filter(isWithdrawable)).toEqual(["CONFIRMED"]);
    expect(COMMISSION_STATES.filter(isPending)).toEqual(["PENDING"]);
  });
});

describe("reversal", () => {
  it("is permitted after confirmation — a university can cancel a registration", () => {
    expect(checkCommissionTransition("CONFIRMED", "REVERSED", "FINANCE", "Cancelled").ok).toBe(true);
  });

  it("requires a reason", () => {
    expect(checkCommissionTransition("CONFIRMED", "REVERSED", "FINANCE", null)).toEqual({
      ok: false,
      refusal: { code: "note-required", to: "REVERSED" },
    });
  });

  it("refuses a reason that is only whitespace", () => {
    expect(checkCommissionTransition("PENDING", "REVERSED", "FINANCE", "  \n ")).toMatchObject({
      ok: false,
      refusal: { code: "note-required" },
    });
  });

  it("is terminal", () => {
    expect(isTerminal("REVERSED")).toBe(true);
    for (const to of COMMISSION_STATES) {
      expect(checkCommissionTransition("REVERSED", to, "FINANCE", note(to))).toEqual({
        ok: false,
        refusal: { code: "terminal", from: "REVERSED" },
      });
    }
  });

  it("cannot be undone by re-confirming", () => {
    // A reversed commission stays reversed. Recording a fresh one is the correct way
    // to reinstate money, because it leaves both facts in the record.
    expect(checkCommissionTransition("REVERSED", "CONFIRMED", "ADMIN", null).ok).toBe(false);
  });
});

describe("who may act", () => {
  it("SYSTEM cannot confirm — money becoming withdrawable is a human decision", () => {
    expect(checkCommissionTransition("PENDING", "CONFIRMED", "SYSTEM")).toEqual({
      ok: false,
      refusal: { code: "wrong-actor", to: "CONFIRMED", permitted: ["FINANCE", "ADMIN"] },
    });
  });

  it("SYSTEM cannot reverse either", () => {
    expect(checkCommissionTransition("CONFIRMED", "REVERSED", "SYSTEM", "why")).toMatchObject({
      ok: false,
      refusal: { code: "wrong-actor" },
    });
  });

  it("ADMIN can do everything FINANCE can", () => {
    for (const [from, to] of ALLOWED) {
      expect(checkCommissionTransition(from, to, "ADMIN", note(to)).ok).toBe(true);
    }
  });
});

describe("confirmedAtFor", () => {
  const at = new Date("2026-08-08T12:00:00Z");

  it("sets a timestamp only for CONFIRMED", () => {
    expect(confirmedAtFor("CONFIRMED", at)).toEqual(at);
    expect(confirmedAtFor("PENDING", at)).toBeNull();
    expect(confirmedAtFor("REVERSED", at)).toBeNull();
  });

  it("satisfies the database CHECK in every state", () => {
    // `(state = 'CONFIRMED') = (confirmedAt IS NOT NULL)`. Computing it here rather
    // than at each call site is what stops a caller violating it.
    for (const state of COMMISSION_STATES) {
      const timestamp = confirmedAtFor(state, at);
      expect(state === "CONFIRMED").toBe(timestamp !== null);
    }
  });
});

describe("describeCommissionRefusal", () => {
  it("produces a client-safe sentence for every code", () => {
    const refusals = [
      { code: "terminal", from: "REVERSED" },
      { code: "not-allowed", from: "REVERSED", to: "CONFIRMED" },
      { code: "wrong-actor", to: "CONFIRMED", permitted: ["FINANCE"] },
      { code: "note-required", to: "REVERSED" },
    ] as const;

    for (const refusal of refusals) {
      const message = describeCommissionRefusal(refusal);
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/prisma|postgres|undefined|\[object/i);
    }
  });
});
