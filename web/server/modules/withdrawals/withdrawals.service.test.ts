/**
 * `withdrawals.service` — the orchestration, not the rules.
 *
 * **What this deliberately does not test.** `withdrawal.state.test.ts` owns the
 * transition matrix and `balance.test.ts` owns the admission rule, both at 100%. Nothing
 * here re-asserts which statuses may follow which, or how a minimum is applied. Those are
 * pure functions with their own suites, and duplicating them would double the cost of
 * every future change to them while proving nothing new.
 *
 * What was untested is everything *around* those decisions: whether a replayed
 * idempotency key returns the original row instead of creating a second withdrawal,
 * whether an overdrawn balance is refused before anything is inserted, whether a refusal
 * is mapped to the status the client actually branches on, and whether the unique-index
 * backstop recovers the original row when two requests interleave past the replay check.
 * Every one of those paths moves money or fails to, and none of them was measured.
 *
 * **The seam.** The service takes its transaction from `serializable` and its rows from
 * `./withdrawals.repository`. Both are mocked: `serializable` runs the callback against a
 * fake `tx`, and the repository returns whatever the case under test needs. That keeps
 * the subject the service's own control flow. The database's behaviour is asserted
 * against a real Postgres in `tests/integration/withdrawals.test.ts` and against PGlite
 * in `tests/schema-integrity.test.ts`; this file would only re-prove it more slowly.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError } from "@/server/lib/errors";

/* ---- Seams ----------------------------------------------------------------------- */

const uniqueViolation = vi.hoisted(() =>
  vi.fn((_error: unknown, _field: string) => false),
);

vi.mock("@/server/lib/db", () => ({
  // The callback is the unit under test; running it directly is what makes the
  // transaction boundary observable without a database.
  serializable: <T>(fn: (tx: unknown) => Promise<T>) => fn(tx),
  isUniqueViolation: (error: unknown, field: string) => uniqueViolation(error, field),
}));

const repo = vi.hoisted(() => ({
  findByIdempotencyKey: vi.fn(),
  balanceAggregates: vi.fn(),
  nextReference: vi.fn(),
  create: vi.fn(),
  transition: vi.fn(),
}));

vi.mock("./withdrawals.repository", () => repo);

/** The Prisma surface the service reaches for directly, rather than through the repo. */
const tx = {
  partner: { findUnique: vi.fn() },
  payoutMethod: { findFirst: vi.fn() },
  commission: { count: vi.fn() },
  withdrawal: { findUnique: vi.fn() },
};

const { requestWithdrawal, transitionWithdrawal } = await import("./withdrawals.service");

/* ---- Fixtures -------------------------------------------------------------------- */

const log = () => ({
  audit: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}) as unknown as Parameters<typeof requestWithdrawal>[1] & {
  audit: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const request = (over: Partial<Parameters<typeof requestWithdrawal>[0]> = {}) => ({
  partnerId: "partner-1",
  payoutMethodId: "method-1",
  amountMinor: 50_000,
  currency: "EUR",
  idempotencyKey: "key-1",
  ...over,
});

/** A partner who can be paid: active, EUR, minimum well below the request. */
const solventPartner = { id: "partner-1", currency: "EUR", minimumMinor: 1_000, status: "ACTIVE" };

/** Aggregates that clear the requested amount with room to spare. */
const healthyAggregates = {
  confirmedCommissionMinor: 200_000,
  pendingCommissionMinor: 0,
  committedWithdrawalMinor: 0,
};

const stored = {
  id: "wd-1",
  reference: "CT-W-000001",
  amountMinor: 50_000,
  currency: "EUR",
  status: "REQUESTED",
};

beforeEach(() => {
  vi.clearAllMocks();
  uniqueViolation.mockReturnValue(false);

  repo.findByIdempotencyKey.mockResolvedValue(null);
  repo.balanceAggregates.mockResolvedValue(healthyAggregates);
  repo.nextReference.mockResolvedValue("CT-W-000001");
  repo.create.mockResolvedValue(stored);

  tx.partner.findUnique.mockResolvedValue(solventPartner);
  tx.payoutMethod.findFirst.mockResolvedValue({ id: "method-1", archivedAt: null });
  tx.commission.count.mockResolvedValue(3);
});

/* ---- Idempotency ----------------------------------------------------------------- */

describe("a replayed idempotency key", () => {
  it("returns the original withdrawal and creates nothing", async () => {
    repo.findByIdempotencyKey.mockResolvedValue(stored);

    const result = await requestWithdrawal(request(), log());

    expect(result).toEqual({ withdrawal: stored, replayed: true });
    // The whole contract of the key: a double tap is one withdrawal, not two.
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("does not even read the balance on a replay", async () => {
    repo.findByIdempotencyKey.mockResolvedValue(stored);
    await requestWithdrawal(request(), log());

    // Replay is checked first so a retry costs one indexed lookup, not the whole
    // admission path.
    expect(repo.balanceAggregates).not.toHaveBeenCalled();
  });

  it("recovers the original row when two requests race past the replay check", async () => {
    // Possible when they interleave precisely: both miss at step 1, one insert wins, the
    // other hits the unique index. The correct answer is still the original withdrawal.
    repo.findByIdempotencyKey.mockResolvedValueOnce(null).mockResolvedValueOnce(stored);
    repo.create.mockRejectedValue(new Error("duplicate key"));
    uniqueViolation.mockReturnValue(true);

    const result = await requestWithdrawal(request(), log());

    expect(result).toEqual({ withdrawal: stored, replayed: true });
  });

  it("rethrows when the constraint fires but the original cannot be found", async () => {
    // Not a replay: something else violated the constraint, and swallowing it would
    // return success for a withdrawal that does not exist.
    repo.findByIdempotencyKey.mockResolvedValue(null);
    repo.create.mockRejectedValue(new Error("duplicate key"));
    uniqueViolation.mockReturnValue(true);

    await expect(requestWithdrawal(request(), log())).rejects.toThrow("duplicate key");
  });

  it("rethrows a failure that is not a constraint violation", async () => {
    repo.create.mockRejectedValue(new Error("connection reset"));
    uniqueViolation.mockReturnValue(false);

    await expect(requestWithdrawal(request(), log())).rejects.toThrow("connection reset");
    // No second lookup: this was never a replay.
    expect(repo.findByIdempotencyKey).toHaveBeenCalledOnce();
  });
});

/* ---- Refusals before any write --------------------------------------------------- */

describe("requests that must not reach an insert", () => {
  it("refuses an unknown partner", async () => {
    tx.partner.findUnique.mockResolvedValue(null);

    await expect(requestWithdrawal(request(), log())).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("refuses an overdrawn balance and says a human is involved", async () => {
    // Reachable only if a commission was reversed after being withdrawn against. That is
    // an accounting problem, and admitting another withdrawal would compound it.
    repo.balanceAggregates.mockResolvedValue({
      confirmedCommissionMinor: 10_000,
      pendingCommissionMinor: 0,
      committedWithdrawalMinor: 50_000,
    });
    const logger = log();

    await expect(requestWithdrawal(request(), logger)).rejects.toMatchObject({
      code: "balance_under_review",
    });
    expect(repo.create).not.toHaveBeenCalled();
    // Logged at error level: this is a state somebody has to go and resolve.
    expect(logger.error).toHaveBeenCalled();
  });

  it("maps a currency mismatch to 422 rather than a generic failure", async () => {
    // The refusal carries the status the client branches on; re-deriving it in the route
    // would be a second place for the mapping to drift.
    await expect(
      requestWithdrawal(request({ currency: "USD" }), log()),
    ).rejects.toBeInstanceOf(UnprocessableError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("maps a suspended partner to 403", async () => {
    tx.partner.findUnique.mockResolvedValue({ ...solventPartner, status: "SUSPENDED" });

    await expect(requestWithdrawal(request(), log())).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("refuses an amount above the available balance", async () => {
    repo.balanceAggregates.mockResolvedValue({
      confirmedCommissionMinor: 10_000,
      pendingCommissionMinor: 0,
      committedWithdrawalMinor: 0,
    });

    await expect(requestWithdrawal(request({ amountMinor: 50_000 }), log())).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("refuses a payout method belonging to someone else", async () => {
    // `findFirst` scopes by partner, so another partner's id comes back null rather than
    // a row the service would then have to remember to check.
    tx.payoutMethod.findFirst.mockResolvedValue(null);

    await expect(requestWithdrawal(request(), log())).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });
});

/* ---- The successful path --------------------------------------------------------- */

describe("an admitted request", () => {
  it("inserts once and reports itself as new", async () => {
    const result = await requestWithdrawal(request(), log());

    expect(result).toEqual({ withdrawal: stored, replayed: false });
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it("carries the caller's amount and the reserved reference into the row", async () => {
    await requestWithdrawal(request({ amountMinor: 42_000 }), log());

    expect(repo.create).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        partnerId: "partner-1",
        payoutMethodId: "method-1",
        amountMinor: 42_000,
        currency: "EUR",
        idempotencyKey: "key-1",
        reference: "CT-W-000001",
      }),
    );
  });

  it("records the balance as it stood before the withdrawal", async () => {
    const logger = log();
    await requestWithdrawal(request(), logger);

    // The figure that makes the decision reconstructable afterwards.
    expect(logger.audit).toHaveBeenCalledWith(
      "withdrawal.requested",
      expect.objectContaining({ availableBeforeMinor: 200_000 }),
    );
  });
});

/* ---- Transitions ----------------------------------------------------------------- */

describe("transitioning a withdrawal", () => {
  const inFlight = {
    id: "wd-1", status: "REQUESTED", partnerId: "partner-1",
    amountMinor: 50_000, reference: "CT-W-000001",
  };

  const move = (over: Record<string, unknown> = {}) => ({
    withdrawalId: "wd-1",
    to: "APPROVED" as const,
    actor: "FINANCE" as const,
    actorUserId: "user-1",
    note: null,
    ...over,
  });

  beforeEach(() => {
    tx.withdrawal.findUnique.mockResolvedValue(inFlight);
    repo.transition.mockResolvedValue({ ...inFlight, status: "APPROVED" });
  });

  it("refuses one that does not exist", async () => {
    tx.withdrawal.findUnique.mockResolvedValue(null);

    await expect(transitionWithdrawal(move(), log())).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it("refuses a move the state machine rejects, without writing", async () => {
    // A partner cannot approve their own payout. The matrix itself is tested in
    // `withdrawal.state.test.ts`; what matters here is that the refusal stops the write.
    await expect(
      transitionWithdrawal(move({ actor: "PARTNER" }), log()),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it("passes the status it read as the compare-and-swap's expected value", async () => {
    await transitionWithdrawal(move(), log());

    // `from` is what makes the update a compare-and-swap rather than a blind write.
    expect(repo.transition).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ withdrawalId: "wd-1", from: "REQUESTED", to: "APPROVED" }),
    );
  });

  it("reports a conflict when the compare-and-swap loses", async () => {
    // Someone moved it between the read and the write. Returning success here would tell
    // a reviewer their decision took effect when another one did.
    repo.transition.mockResolvedValue(null);

    await expect(transitionWithdrawal(move(), log())).rejects.toMatchObject({
      code: "transition_conflict",
    });
  });

  it("omits providerRef when the caller did not supply one", async () => {
    await transitionWithdrawal(move(), log());

    const [, payload] = repo.transition.mock.calls[0]!;
    // Absent rather than undefined: writing undefined would clear a reference the
    // provider had already given us on an earlier hop.
    expect(payload).not.toHaveProperty("providerRef");
  });

  it("carries providerRef through when it is supplied", async () => {
    tx.withdrawal.findUnique.mockResolvedValue({ ...inFlight, status: "PROCESSING" });
    repo.transition.mockResolvedValue({ ...inFlight, status: "PAID" });
    await transitionWithdrawal(
      move({ to: "PAID", actor: "SYSTEM", providerRef: "prov-99" }),
      log(),
    );

    expect(repo.transition).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ providerRef: "prov-99" }),
    );
  });

  it("records the amount and both ends of the move", async () => {
    const logger = log();
    await transitionWithdrawal(move(), logger);

    expect(logger.audit).toHaveBeenCalledWith(
      "withdrawal.transitioned",
      expect.objectContaining({
        from: "REQUESTED", to: "APPROVED", amountMinor: 50_000, reference: "CT-W-000001",
      }),
    );
  });
});
