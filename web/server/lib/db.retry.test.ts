/**
 * What `serializable()` does about a failed attempt.
 *
 * These rules governed the money path from the day it was written and were covered by
 * nothing. The integration suite eventually exercised the interesting branch by losing a
 * real race three times in a row against Neon — which is the right way to *discover* it
 * and a hopeless way to *keep* it covered, because it only happens when the timing
 * cooperates. The decision is pure, so it is pinned here instead.
 *
 * The branch that matters is `exhausted`. Before it existed, a conflict that used up its
 * retries left `PrismaClientKnownRequestError` to escape as a 500 — the server reporting
 * itself broken because the database did exactly what SERIALIZABLE promises. It is a 409
 * now: transient, the caller's to retry, and honest about which of the two it is.
 */

import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { isSerialisationConflict, retryBackoffMs, retryDecision } from "./db";

/** A Prisma error with the code and pg SQLSTATE a real conflict carries. */
function prismaError(code: string, pgCode?: string) {
  return new Prisma.PrismaClientKnownRequestError("conflict", {
    code,
    clientVersion: "test",
    ...(pgCode ? { meta: { code: pgCode } } : {}),
  });
}

describe("isSerialisationConflict", () => {
  it("recognises Prisma's write-conflict wrapper", () => {
    expect(isSerialisationConflict(prismaError("P2034"))).toBe(true);
  });

  it("recognises a raw serialisation failure and a deadlock", () => {
    expect(isSerialisationConflict(prismaError("P2010", "40001"))).toBe(true);
    expect(isSerialisationConflict(prismaError("P2010", "40P01"))).toBe(true);
  });

  it("does not treat an ordinary Prisma error as contention", () => {
    // A unique violation is a real refusal, not a transient one. Retrying it would turn
    // a clean 409 into three attempts at the same impossible write.
    expect(isSerialisationConflict(prismaError("P2002"))).toBe(false);
    expect(isSerialisationConflict(prismaError("P2025"))).toBe(false);
  });

  it("does not treat an arbitrary throw as contention", () => {
    expect(isSerialisationConflict(new Error("boom"))).toBe(false);
    expect(isSerialisationConflict(null)).toBe(false);
    expect(isSerialisationConflict(undefined)).toBe(false);
    expect(isSerialisationConflict("40001")).toBe(false);
  });
});

describe("retryDecision", () => {
  it("retries a conflict while attempts remain", () => {
    expect(retryDecision(prismaError("P2034"), 1, 3)).toBe("retry");
    expect(retryDecision(prismaError("P2034"), 2, 3)).toBe("retry");
  });

  it("reports exhaustion on the last attempt rather than retrying forever", () => {
    expect(retryDecision(prismaError("P2034"), 3, 3)).toBe("exhausted");
  });

  /**
   * Defensive: an attempt counter past the maximum must not read as "retry". A loop
   * bound edited to run one extra pass would otherwise start retrying past its budget,
   * silently, against the money path.
   */
  it("treats an over-run attempt counter as exhausted", () => {
    expect(retryDecision(prismaError("P2034"), 4, 3)).toBe("exhausted");
  });

  it("exhausts immediately when only one attempt was allowed", () => {
    expect(retryDecision(prismaError("P2034"), 1, 1)).toBe("exhausted");
  });

  it("propagates anything that is not contention, on any attempt", () => {
    expect(retryDecision(prismaError("P2002"), 1, 3)).toBe("propagate");
    expect(retryDecision(new Error("boom"), 1, 3)).toBe("propagate");
    // Including on the last one — an unrelated failure must not be relabelled a
    // conflict just because the budget happened to run out at the same moment.
    expect(retryDecision(new Error("boom"), 3, 3)).toBe("propagate");
  });
});

describe("retryBackoffMs", () => {
  it("grows with the attempt and never returns a negative wait", () => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const wait = retryBackoffMs(attempt);
      expect(wait).toBeGreaterThanOrEqual(0);
      expect(wait).toBeLessThanOrEqual(25 * 2 ** (attempt - 1));
    }
  });

  /**
   * Full jitter, not fixed backoff. Two transactions that collide and then wait the
   * same amount collide again — the randomness is the mechanism, so a constant here
   * would be the bug.
   */
  it("is randomised rather than constant", () => {
    const waits = new Set(Array.from({ length: 50 }, () => retryBackoffMs(3)));
    expect(waits.size).toBeGreaterThan(1);
  });
});
