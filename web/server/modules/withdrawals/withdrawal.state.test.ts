/**
 * The withdrawal state machine, tested exhaustively.
 *
 * The matrix below walks all 25 (from, to) pairs rather than testing the transitions
 * someone remembered. A state machine tested only on its intended paths is a state
 * machine whose unintended paths are undefined.
 */

import { describe, it, expect } from "vitest";
import {
  WITHDRAWAL_STATUSES,
  checkTransition,
  isCommitted,
  isTerminal,
  nextStatuses,
  describeRefusal,
  type WithdrawalStatus,
  type TransitionActor,
} from "./withdrawal.state";

/** Every transition FINANCE is permitted to make. Everything else must be refused. */
const FINANCE_ALLOWED: ReadonlyArray<[WithdrawalStatus, WithdrawalStatus]> = [
  ["REQUESTED", "APPROVED"],
  ["REQUESTED", "REJECTED"],
  ["APPROVED", "PROCESSING"],
  ["APPROVED", "REJECTED"],
  ["PROCESSING", "PAID"],
  ["PROCESSING", "REJECTED"],
];

const isAllowedForFinance = (from: WithdrawalStatus, to: WithdrawalStatus): boolean =>
  FINANCE_ALLOWED.some(([f, t]) => f === from && t === to);

/** A rejection always needs a note; nothing else does. */
const note = (to: WithdrawalStatus) => (to === "REJECTED" ? "Provider returned the transfer." : null);

describe("the transition matrix, exhaustively", () => {
  for (const from of WITHDRAWAL_STATUSES) {
    for (const to of WITHDRAWAL_STATUSES) {
      const expected = isAllowedForFinance(from, to);
      it(`${expected ? "allows" : "refuses"} FINANCE: ${from} -> ${to}`, () => {
        const result = checkTransition(from, to, "FINANCE", note(to));
        expect(result.ok).toBe(expected);
      });
    }
  }

  it("covers all 25 pairs", () => {
    expect(WITHDRAWAL_STATUSES.length ** 2).toBe(25);
  });
});

describe("terminal states", () => {
  it("PAID and REJECTED are terminal", () => {
    expect(isTerminal("PAID")).toBe(true);
    expect(isTerminal("REJECTED")).toBe(true);
  });

  it("nothing else is terminal", () => {
    for (const status of ["REQUESTED", "APPROVED", "PROCESSING"] as const) {
      expect(isTerminal(status)).toBe(false);
    }
  });

  it("refuses every transition out of a terminal state, including to itself", () => {
    for (const from of ["PAID", "REJECTED"] as const) {
      for (const to of WITHDRAWAL_STATUSES) {
        const result = checkTransition(from, to, "FINANCE", note(to));
        expect(result).toEqual({ ok: false, refusal: { code: "terminal", from } });
      }
    }
  });
});

describe("who may act", () => {
  it("a PARTNER may not approve anything — least of all their own withdrawal", () => {
    // The single most important negative test in this file. A partner who can drive
    // REQUESTED -> APPROVED has removed the human review the portal promises.
    const result = checkTransition("REQUESTED", "APPROVED", "PARTNER");
    expect(result).toEqual({
      ok: false,
      refusal: { code: "wrong-actor", to: "APPROVED", permitted: ["FINANCE"] },
    });
  });

  it("a PARTNER may not drive any transition at all", () => {
    for (const [from, to] of FINANCE_ALLOWED) {
      const result = checkTransition(from, to, "PARTNER", note(to));
      expect(result.ok).toBe(false);
    }
  });

  it("SYSTEM may settle a payout but may not approve one", () => {
    // A provider webhook can confirm money moved. It cannot decide money should move.
    expect(checkTransition("PROCESSING", "PAID", "SYSTEM").ok).toBe(true);
    expect(checkTransition("REQUESTED", "APPROVED", "SYSTEM")).toMatchObject({
      ok: false,
      refusal: { code: "wrong-actor" },
    });
  });

  it("SYSTEM may reject a transfer the provider bounced", () => {
    expect(checkTransition("PROCESSING", "REJECTED", "SYSTEM", "Bounced: account closed").ok)
      .toBe(true);
  });

  it("SYSTEM may not reject a withdrawal awaiting human review", () => {
    expect(checkTransition("REQUESTED", "REJECTED", "SYSTEM", "why")).toMatchObject({
      ok: false,
      refusal: { code: "wrong-actor" },
    });
  });
});

describe("rejection notes", () => {
  it("refuses a rejection with no note", () => {
    expect(checkTransition("REQUESTED", "REJECTED", "FINANCE", null)).toEqual({
      ok: false,
      refusal: { code: "note-required", to: "REJECTED" },
    });
  });

  it("refuses a rejection whose note is only whitespace", () => {
    expect(checkTransition("REQUESTED", "REJECTED", "FINANCE", "   \n\t ")).toMatchObject({
      ok: false,
      refusal: { code: "note-required" },
    });
  });

  it("does not require a note on an approval", () => {
    expect(checkTransition("REQUESTED", "APPROVED", "FINANCE", null).ok).toBe(true);
  });
});

describe("isCommitted — what holds money against the balance", () => {
  it("holds money in every state except REJECTED", () => {
    expect(isCommitted("REQUESTED")).toBe(true);
    expect(isCommitted("APPROVED")).toBe(true);
    expect(isCommitted("PROCESSING")).toBe(true);
    expect(isCommitted("PAID")).toBe(true);
  });

  it("releases money only on REJECTED", () => {
    expect(isCommitted("REJECTED")).toBe(false);
  });

  it("commits from the moment of request, so a second request cannot spend the same money", () => {
    // If REQUESTED did not commit, a partner could request their whole balance twice
    // before either was approved. This assertion is that bug's regression test.
    expect(isCommitted("REQUESTED")).toBe(true);
  });

  it("agrees with the partial index predicate in migration 0002", () => {
    // The index is `WHERE "status" <> 'REJECTED'`. If this list and that predicate
    // ever disagree, the balance is computed over a different set than it claims.
    const committed = WITHDRAWAL_STATUSES.filter(isCommitted);
    expect(committed).toEqual(["REQUESTED", "APPROVED", "PROCESSING", "PAID"]);
  });
});

describe("nextStatuses", () => {
  it("offers FINANCE approve or reject on a fresh request", () => {
    expect(nextStatuses("REQUESTED", "FINANCE")).toEqual(["APPROVED", "REJECTED"]);
  });

  it("offers a PARTNER nothing, in any state", () => {
    for (const status of WITHDRAWAL_STATUSES) {
      expect(nextStatuses(status, "PARTNER")).toEqual([]);
    }
  });

  it("offers nothing from a terminal state", () => {
    expect(nextStatuses("PAID", "FINANCE")).toEqual([]);
    expect(nextStatuses("REJECTED", "FINANCE")).toEqual([]);
  });
});

describe("describeRefusal", () => {
  it("produces a client-safe sentence for every refusal code", () => {
    const refusals = [
      { code: "terminal", from: "PAID" },
      { code: "not-allowed", from: "REQUESTED", to: "PAID" },
      { code: "wrong-actor", to: "APPROVED", permitted: ["FINANCE"] },
      { code: "note-required", to: "REJECTED" },
    ] as const;

    for (const refusal of refusals) {
      const message = describeRefusal(refusal);
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/prisma|postgres|undefined|\[object/i);
    }
  });
});

describe("the machine has no path that skips human approval", () => {
  it("cannot reach PAID from REQUESTED without passing through APPROVED", () => {
    // Walk every path of length <= 4 from REQUESTED and assert that any ending in PAID
    // contains APPROVED. This is the business rule the portal's copy promises.
    const actors: TransitionActor[] = ["PARTNER", "FINANCE", "SYSTEM"];
    const paths: WithdrawalStatus[][] = [["REQUESTED"]];
    const complete: WithdrawalStatus[][] = [];

    for (let depth = 0; depth < 4; depth++) {
      const next: WithdrawalStatus[][] = [];
      for (const path of paths) {
        const from = path[path.length - 1]!;
        for (const to of WITHDRAWAL_STATUSES) {
          const reachable = actors.some((a) => checkTransition(from, to, a, note(to)).ok);
          if (!reachable) continue;
          const extended = [...path, to];
          if (to === "PAID") complete.push(extended);
          else next.push(extended);
        }
      }
      paths.length = 0;
      paths.push(...next);
    }

    expect(complete.length).toBeGreaterThan(0);
    for (const path of complete) {
      expect(path).toContain("APPROVED");
    }
  });
});
