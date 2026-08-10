/**
 * The withdrawal service, against a real Postgres.
 *
 * These are the cases `docs/TESTING.md` lists as the largest open gap. Three of them
 * could not be executed by any previous pass: PGlite is single-connection, so the race
 * that the SERIALIZABLE isolation level exists to stop could not be *created*, let alone
 * observed. The claim that the money path is concurrency-safe rested entirely on
 * reading the code. This file is the difference between that and knowing.
 */

import { afterEach, describe, expect, it } from "vitest";
import { requestWithdrawal, transitionWithdrawal } from "@/server/modules/withdrawals/withdrawals.service";
import { ConflictError, UnprocessableError, ForbiddenError } from "@/server/lib/errors";
import { randomUUID } from "node:crypto";
import {
  captureAudit, createPartner, db, destroyPartner, silentLogger,
  type PartnerFixture,
} from "./fixtures";

const created: PartnerFixture[] = [];

async function partnerWith(options: Parameters<typeof createPartner>[0]) {
  const fixture = await createPartner(options);
  created.push(fixture);
  return fixture;
}

afterEach(async () => {
  while (created.length > 0) {
    const fixture = created.pop();
    if (fixture) await destroyPartner(fixture);
  }
});

describe("concurrent withdrawal admission", () => {
  /**
   * The write skew this whole isolation decision exists to prevent.
   *
   * $400 of confirmed commission. Two simultaneous requests for $400 each. Both are
   * admissible against the balance as it stands when each begins, and neither violates
   * a unique constraint — under READ COMMITTED both would be written and the partner
   * would be owed $800 against $400 earned, with nothing in the database complaining.
   *
   * Exactly one must survive. The other is either aborted by Postgres with SQLSTATE
   * 40001 and retried into a correct refusal, or refused directly.
   */
  it("admits exactly one of two concurrent requests for the whole balance", async () => {
    const partner = await partnerWith({ confirmedMinor: 40_000 });

    const attempt = (key: string) =>
      requestWithdrawal(
        {
          partnerId: partner.partnerId,
          payoutMethodId: partner.payoutMethodId,
          amountMinor: 40_000,
          currency: partner.currency,
          idempotencyKey: key,
        },
        silentLogger(),
      );

    // Different keys: these are two genuinely distinct requests, not a retry. With the
    // same key the idempotency guarantee would answer it and the race would never form.
    const results = await Promise.allSettled([
      attempt(randomUUID()),
      attempt(randomUUID()),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    /**
     * **The safety property, which is absolute:** never two.
     *
     * This is the assertion the isolation level exists for. Two admitted withdrawals
     * against one balance is the partner being owed $800 for $400 earned, and no
     * latency, retry budget or scheduling accident may ever produce it.
     */
    const rows = await db.withdrawal.findMany({ where: { partnerId: partner.partnerId } });
    expect(rows.length).toBeLessThanOrEqual(1);
    expect(rows).toHaveLength(fulfilled.length);

    /**
     * **The liveness property, which is best-effort:** usually one gets through.
     *
     * Asserted as "at most one" rather than "exactly one", and that is not the test
     * being loosened to go green — it is the guarantee being stated accurately. If both
     * transactions are aborted in the same round they both retry against an unchanged
     * balance and can collide again, and against a link with Neon's round-trip latency
     * three attempts occasionally all lose. Nothing is mis-written when that happens;
     * both callers are told to try again. A bounded retry cannot promise more than that,
     * so a test asserting more is asserting something the system does not claim.
     *
     * The uncontended case is the positive control for this: the test below admits both
     * requests when the balance covers them, so an implementation that refused
     * everything could not pass the pair.
     */
    expect(fulfilled.length).toBeLessThanOrEqual(1);
    expect(rejected.length).toBeGreaterThanOrEqual(1);
    if (rows[0]) expect(rows[0].amountMinor).toBe(40_000);

    /**
     * Every refusal must be a refusal, not a crash. A serialization error escaping as a
     * 500 would also produce one success and one failure, and would be a bug — it once
     * did exactly that, which is why `retryDecision` exists and is pinned by
     * `db.retry.test.ts`. Both legitimate outcomes are a `ConflictError`: refused on the
     * re-read for insufficient balance, or refused for exhausting the retry budget.
     */
    for (const failure of rejected) {
      expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
    }
  });

  /**
   * The same race where both requests *are* affordable together. Nothing should be
   * refused — otherwise the isolation level would be buying correctness by rejecting
   * legitimate work, and the retry loop would be hiding it.
   */
  it("admits both when the balance covers both", async () => {
    const partner = await partnerWith({ confirmedMinor: 100_000 });

    const attempt = (amount: number) =>
      requestWithdrawal(
        {
          partnerId: partner.partnerId,
          payoutMethodId: partner.payoutMethodId,
          amountMinor: amount,
          currency: partner.currency,
          idempotencyKey: randomUUID(),
        },
        silentLogger(),
      );

    const results = await Promise.allSettled([attempt(40_000), attempt(50_000)]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);

    const rows = await db.withdrawal.findMany({ where: { partnerId: partner.partnerId } });
    expect(rows).toHaveLength(2);
    expect(rows.reduce((sum, r) => sum + r.amountMinor, 0)).toBe(90_000);
  });
});

describe("idempotent replay", () => {
  it("returns the original withdrawal rather than creating a second", async () => {
    const partner = await partnerWith({ confirmedMinor: 100_000 });
    const key = randomUUID();

    const input = {
      partnerId: partner.partnerId,
      payoutMethodId: partner.payoutMethodId,
      amountMinor: 30_000,
      currency: partner.currency,
      idempotencyKey: key,
    };

    const first = await requestWithdrawal(input, silentLogger());
    expect(first.replayed).toBe(false);

    const { log, events } = captureAudit();
    const second = await requestWithdrawal(input, log);

    expect(second.replayed).toBe(true);
    expect(second.withdrawal.id).toBe(first.withdrawal.id);
    expect(second.withdrawal.reference).toBe(first.withdrawal.reference);
    expect(events).toContain("withdrawal.replayed");

    const rows = await db.withdrawal.findMany({ where: { partnerId: partner.partnerId } });
    expect(rows).toHaveLength(1);
  });

  /**
   * A replay must be served even when the balance would no longer admit the request.
   *
   * This is the case that makes idempotency worth having rather than merely tidy: the
   * first call succeeded and the response was lost, the balance is now spent, and the
   * client retries. Recomputing the admission rule would refuse a withdrawal that has
   * already been granted, and the partner would be told they cannot have money they
   * have in fact been promised.
   */
  it("replays even when the balance can no longer afford the request", async () => {
    const partner = await partnerWith({ confirmedMinor: 50_000 });
    const key = randomUUID();

    const input = {
      partnerId: partner.partnerId,
      payoutMethodId: partner.payoutMethodId,
      amountMinor: 50_000,
      currency: partner.currency,
      idempotencyKey: key,
    };

    const first = await requestWithdrawal(input, silentLogger());

    // The balance is now zero — a fresh request for the same amount would be refused.
    await expect(
      requestWithdrawal({ ...input, idempotencyKey: randomUUID() }, silentLogger()),
    ).rejects.toBeInstanceOf(ConflictError);

    // But the original key still returns the original row.
    const replay = await requestWithdrawal(input, silentLogger());
    expect(replay.replayed).toBe(true);
    expect(replay.withdrawal.id).toBe(first.withdrawal.id);
  });

  it("scopes the key to the partner — the same key under another partner is a new request", async () => {
    const a = await partnerWith({ confirmedMinor: 50_000 });
    const b = await partnerWith({ confirmedMinor: 50_000 });
    const key = randomUUID();

    const first = await requestWithdrawal(
      {
        partnerId: a.partnerId, payoutMethodId: a.payoutMethodId,
        amountMinor: 20_000, currency: a.currency, idempotencyKey: key,
      },
      silentLogger(),
    );

    const second = await requestWithdrawal(
      {
        partnerId: b.partnerId, payoutMethodId: b.payoutMethodId,
        amountMinor: 20_000, currency: b.currency, idempotencyKey: key,
      },
      silentLogger(),
    );

    expect(second.replayed).toBe(false);
    expect(second.withdrawal.id).not.toBe(first.withdrawal.id);
  });
});

describe("admission refusals", () => {
  it("refuses an amount below the partner's minimum", async () => {
    const partner = await partnerWith({ confirmedMinor: 100_000, minimumMinor: 20_000 });

    await expect(
      requestWithdrawal(
        {
          partnerId: partner.partnerId, payoutMethodId: partner.payoutMethodId,
          amountMinor: 5_000, currency: partner.currency, idempotencyKey: randomUUID(),
        },
        silentLogger(),
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("refuses more than the confirmed balance, ignoring pending commissions", async () => {
    // $500 confirmed, $900 pending. Pending money is not withdrawable — asking for
    // $600 must fail even though the two together cover it.
    const partner = await partnerWith({ confirmedMinor: 50_000, pendingMinor: 90_000 });

    await expect(
      requestWithdrawal(
        {
          partnerId: partner.partnerId, payoutMethodId: partner.payoutMethodId,
          amountMinor: 60_000, currency: partner.currency, idempotencyKey: randomUUID(),
        },
        silentLogger(),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(await db.withdrawal.count({ where: { partnerId: partner.partnerId } })).toBe(0);
  });

  it("refuses a suspended partner", async () => {
    const partner = await partnerWith({ confirmedMinor: 100_000, status: "SUSPENDED" });

    await expect(
      requestWithdrawal(
        {
          partnerId: partner.partnerId, payoutMethodId: partner.payoutMethodId,
          amountMinor: 10_000, currency: partner.currency, idempotencyKey: randomUUID(),
        },
        silentLogger(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a payout method belonging to a different partner", async () => {
    const a = await partnerWith({ confirmedMinor: 100_000 });
    const b = await partnerWith({ confirmedMinor: 100_000 });

    // b's money, a's bank account. The service scopes the method lookup to the partner,
    // so this must not resolve — otherwise a partner could direct their payout into
    // someone else's account.
    await expect(
      requestWithdrawal(
        {
          partnerId: b.partnerId, payoutMethodId: a.payoutMethodId,
          amountMinor: 10_000, currency: b.currency, idempotencyKey: randomUUID(),
        },
        silentLogger(),
      ),
    ).rejects.toBeInstanceOf(UnprocessableError);
  });
});

describe("authorization on the state machine", () => {
  /**
   * Beneath the route guard.
   *
   * `/api/staff/withdrawals/:id` is already restricted to FINANCE and ADMIN. This tests
   * the layer under that: even called directly, with no HTTP involved, the state machine
   * refuses a `PARTNER` actor. A partner approving their own payout is the single
   * failure this department exists to prevent, and it is refused twice.
   */
  it("refuses a PARTNER actor for every transition", async () => {
    const partner = await partnerWith({ confirmedMinor: 100_000 });
    const { withdrawal } = await requestWithdrawal(
      {
        partnerId: partner.partnerId, payoutMethodId: partner.payoutMethodId,
        amountMinor: 10_000, currency: partner.currency, idempotencyKey: randomUUID(),
      },
      silentLogger(),
    );

    for (const to of ["APPROVED", "PROCESSING", "PAID", "REJECTED"] as const) {
      await expect(
        transitionWithdrawal(
          {
            withdrawalId: withdrawal.id, to, actor: "PARTNER",
            actorUserId: partner.userId, note: "let me have it",
          },
          silentLogger(),
        ),
      ).rejects.toBeInstanceOf(ConflictError);
    }

    const after = await db.withdrawal.findUnique({ where: { id: withdrawal.id } });
    expect(after?.status).toBe("REQUESTED");
  });

  it("refuses a rejection with no reason, and records one that has a reason", async () => {
    const partner = await partnerWith({ confirmedMinor: 100_000 });
    const { withdrawal } = await requestWithdrawal(
      {
        partnerId: partner.partnerId, payoutMethodId: partner.payoutMethodId,
        amountMinor: 10_000, currency: partner.currency, idempotencyKey: randomUUID(),
      },
      silentLogger(),
    );

    await expect(
      transitionWithdrawal(
        { withdrawalId: withdrawal.id, to: "REJECTED", actor: "FINANCE", actorUserId: null, note: null },
        silentLogger(),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    const ok = await transitionWithdrawal(
      {
        withdrawalId: withdrawal.id, to: "REJECTED", actor: "FINANCE",
        actorUserId: null, note: "Bank details could not be verified",
      },
      silentLogger(),
    );
    expect(ok.status).toBe("REJECTED");
  });

  /**
   * The reason the whole state machine is a machine rather than a status column: money
   * must not reach PAID without having passed through APPROVED.
   */
  it("refuses a jump straight from REQUESTED to PAID", async () => {
    const partner = await partnerWith({ confirmedMinor: 100_000 });
    const { withdrawal } = await requestWithdrawal(
      {
        partnerId: partner.partnerId, payoutMethodId: partner.payoutMethodId,
        amountMinor: 10_000, currency: partner.currency, idempotencyKey: randomUUID(),
      },
      silentLogger(),
    );

    await expect(
      transitionWithdrawal(
        { withdrawalId: withdrawal.id, to: "PAID", actor: "FINANCE", actorUserId: null, note: null },
        silentLogger(),
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("walks the full happy path and appends an audit event at each step", async () => {
    const partner = await partnerWith({ confirmedMinor: 100_000 });
    const { withdrawal } = await requestWithdrawal(
      {
        partnerId: partner.partnerId, payoutMethodId: partner.payoutMethodId,
        amountMinor: 10_000, currency: partner.currency, idempotencyKey: randomUUID(),
      },
      silentLogger(),
    );

    for (const to of ["APPROVED", "PROCESSING", "PAID"] as const) {
      const result = await transitionWithdrawal(
        {
          withdrawalId: withdrawal.id, to, actor: "FINANCE", actorUserId: null,
          note: null, providerRef: "wise_test_ref",
        },
        silentLogger(),
      );
      expect(result.status).toBe(to);
    }

    // One opening event plus three transitions.
    const events = await db.withdrawalEvent.findMany({
      where: { withdrawalId: withdrawal.id },
      orderBy: { at: "asc" },
    });
    expect(events.length).toBe(4);
    expect(events.map((e) => e.toStatus)).toEqual([
      "REQUESTED", "APPROVED", "PROCESSING", "PAID",
    ]);
  });

  /**
   * The append-only trigger, against real Postgres rather than WASM. The schema-integrity
   * suite already proves this under PGlite; repeating it here confirms the guarantee
   * survives on the engine that will actually run in production.
   */
  it("refuses UPDATE and DELETE on the audit trail", async () => {
    const partner = await partnerWith({ confirmedMinor: 100_000 });
    const { withdrawal } = await requestWithdrawal(
      {
        partnerId: partner.partnerId, payoutMethodId: partner.payoutMethodId,
        amountMinor: 10_000, currency: partner.currency, idempotencyKey: randomUUID(),
      },
      silentLogger(),
    );

    await expect(
      db.$executeRawUnsafe(
        `UPDATE "withdrawal_event" SET note = 'rewritten' WHERE "withdrawalId" = $1::uuid`,
        withdrawal.id,
      ),
    ).rejects.toThrow(/append-only/);

    await expect(
      db.$executeRawUnsafe(
        `DELETE FROM "withdrawal_event" WHERE "withdrawalId" = $1::uuid`,
        withdrawal.id,
      ),
    ).rejects.toThrow(/append-only/);

    expect(
      await db.withdrawalEvent.count({ where: { withdrawalId: withdrawal.id } }),
    ).toBeGreaterThan(0);
  });
});
