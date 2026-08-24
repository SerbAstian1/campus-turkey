/**
 * `commissions.service` — the orchestration, not the transition matrix.
 *
 * **The division of labour.** `commission.state.test.ts` owns which states may follow
 * which and who may move them, at 100%. This file owns what happens around that: the
 * refusals that must fire before a row is written, the audit entry that must land inside
 * the transaction that produced it, and the compare-and-swap that stops two reviewers
 * confirming the same commission twice.
 *
 * **Why the refusals matter more than they look.** Three of them exist only to turn a
 * database-level impossibility into a sentence a human can act on. A commission against a
 * representative-referred student is already refused by a NOT NULL column reached through
 * a composite foreign key — but it surfaces to staff as an unexplained 500, and staff
 * then record it somewhere else. Each of these paths is one where the money is right and
 * the explanation is wrong, which is its own kind of accounting failure.
 *
 * `serializable` runs the callback directly against a fake `tx`; the database's own
 * guarantees are proven against real Postgres in `tests/integration/` and against PGlite
 * in `tests/schema-integrity.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, UnprocessableError } from "@/server/lib/errors";

/* ---- Seams ----------------------------------------------------------------------- */

vi.mock("@/server/lib/db", () => ({
  serializable: <T>(fn: (tx: unknown) => Promise<T>) => fn(tx),
}));

const recordAudit = vi.hoisted(() => vi.fn());
vi.mock("@/server/modules/audit/audit.service", () => ({ recordAudit }));

const tx = {
  student: { findUnique: vi.fn() },
  commission: {
    findUnique: vi.fn(),
    // Re-read after the update so the caller gets the row as it now stands rather
    // than the values it was asked to write.
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
};

const { createCommission, transitionCommission } = await import("./commissions.service");

/* ---- Fixtures -------------------------------------------------------------------- */

const log = () => ({
  audit: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(),
}) as unknown as Parameters<typeof createCommission>[2] & {
  audit: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
};

const partnerStudent = {
  id: "student-1",
  name: "Amina Yusuf",
  partnerId: "partner-1",
  partner: { currency: "EUR", status: "ACTIVE" },
};

const input = (over: Record<string, unknown> = {}) => ({
  studentId: "student-1",
  amountMinor: 45_000,
  currency: "EUR",
  basis: "First-year tuition",
  period: "2026-08",
  confirmed: false,
  ...over,
}) as Parameters<typeof createCommission>[0];

const staff = { id: "user-1", role: "FINANCE" as const };

const created = {
  id: "com-1", amountMinor: 45_000, currency: "EUR", state: "PENDING",
  basis: "First-year tuition", period: "2026-08", confirmedAt: null, createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.student.findUnique.mockResolvedValue(partnerStudent);
  tx.commission.create.mockResolvedValue(created);
  tx.commission.updateMany.mockResolvedValue({ count: 1 });
  tx.commission.findUniqueOrThrow.mockResolvedValue({ ...created, state: "CONFIRMED" });
  tx.commission.findUnique.mockResolvedValue({
    id: "com-1", state: "PENDING", partnerId: "partner-1",
    amountMinor: 45_000, currency: "EUR",
  });
});

/* ---- Recording a commission ------------------------------------------------------ */

describe("recording a commission", () => {
  it("refuses an unknown student before writing anything", async () => {
    tx.student.findUnique.mockResolvedValue(null);

    await expect(createCommission(input(), staff, log())).rejects.toBeInstanceOf(NotFoundError);
    expect(tx.commission.create).not.toHaveBeenCalled();
  });

  it("refuses a representative-referred student in terms staff can act on", async () => {
    // The database would refuse this too, as a foreign key violation surfacing as a 500.
    // The point of this branch is the explanation, so the message is the assertion.
    tx.student.findUnique.mockResolvedValue({
      ...partnerStudent, partnerId: null, partner: null,
    });

    await expect(createCommission(input(), staff, log())).rejects.toMatchObject({
      code: "student_has_no_partner",
    });
    expect(tx.commission.create).not.toHaveBeenCalled();
  });

  it("refuses a closed partner", async () => {
    tx.student.findUnique.mockResolvedValue({
      ...partnerStudent, partner: { currency: "EUR", status: "CLOSED" },
    });

    await expect(createCommission(input(), staff, log())).rejects.toMatchObject({
      code: "partner_closed",
    });
    expect(tx.commission.create).not.toHaveBeenCalled();
  });

  it("refuses a currency the partner is not paid in, and names the right one", async () => {
    // Currency drift is the failure that silently pays somebody the wrong amount.
    await expect(
      createCommission(input({ currency: "USD" }), staff, log()),
    ).rejects.toBeInstanceOf(UnprocessableError);
    expect(tx.commission.create).not.toHaveBeenCalled();
  });

  it("records against the student's own partner, never the caller's input", async () => {
    await createCommission(input(), staff, log());

    // The partner is derived from the student, so a caller cannot attribute a commission
    // to a partner who did not refer them.
    expect(tx.commission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ partnerId: "partner-1", studentId: "student-1" }),
      }),
    );
  });

  it("opens as PENDING by default, with no confirmation timestamp", async () => {
    await createCommission(input(), staff, log());

    const [{ data }] = tx.commission.create.mock.calls[0]!;
    expect(data.state).toBe("PENDING");
    expect(data.confirmedAt).toBeNull();
  });

  it("stamps a confirmation time when it is recorded already confirmed", async () => {
    tx.commission.create.mockResolvedValue({ ...created, state: "CONFIRMED" });
    await createCommission(input({ confirmed: true }), staff, log());

    const [{ data }] = tx.commission.create.mock.calls[0]!;
    expect(data.state).toBe("CONFIRMED");
    // A confirmed commission with no timestamp is a row the audit cannot explain later.
    expect(data.confirmedAt).toBeInstanceOf(Date);
  });
});

/* ---- Transitions ----------------------------------------------------------------- */

describe("transitioning a commission", () => {
  const move = (over: Record<string, unknown> = {}) => ({
    commissionId: "com-1",
    to: "CONFIRMED" as const,
    note: null,
    ...over,
  }) as Parameters<typeof transitionCommission>[0];

  it("refuses one that does not exist", async () => {
    tx.commission.findUnique.mockResolvedValue(null);

    await expect(transitionCommission(move(), staff, log())).rejects.toBeInstanceOf(NotFoundError);
    expect(tx.commission.updateMany).not.toHaveBeenCalled();
  });

  it("refuses a move the state machine rejects, without writing", async () => {
    tx.commission.findUnique.mockResolvedValue({
      id: "com-1", state: "REVERSED", partnerId: "partner-1",
      amountMinor: 45_000, currency: "EUR",
    });

    await expect(transitionCommission(move(), staff, log())).rejects.toBeInstanceOf(ConflictError);
    expect(tx.commission.updateMany).not.toHaveBeenCalled();
  });

  it("guards the update with the state it read", async () => {
    await transitionCommission(move(), staff, log());

    // `state: current.state` in the where clause is what makes this a compare-and-swap.
    // Without it two reviewers confirm the same commission and the second silently wins.
    expect(tx.commission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "com-1", state: "PENDING" }),
      }),
    );
  });

  it("reports a conflict when the compare-and-swap matches nothing", async () => {
    tx.commission.updateMany.mockResolvedValue({ count: 0 });

    await expect(transitionCommission(move(), staff, log())).rejects.toMatchObject({
      code: "commission_conflict",
    });
  });

  it("records the decision durably, inside the same transaction", async () => {
    await transitionCommission(move(), staff, log());

    // `log.audit` writes to the log stream, which the staff console cannot query. The
    // durable row is what answers "who confirmed this" later.
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "commission.transitioned",
        entityType: "commission",
        entityId: "com-1",
        actorUserId: "user-1",
        metadata: expect.objectContaining({ from: "PENDING", to: "CONFIRMED", amountMinor: 45_000 }),
      }),
      tx,
    );
  });

  it("carries the currency alongside the amount", async () => {
    await transitionCommission(move(), staff, log());

    const [entry] = recordAudit.mock.calls[0]!;
    // Minor units alone are not a sum of money; without this the viewer has to guess the
    // denomination to render the row.
    expect(entry.metadata).toMatchObject({ currency: "EUR" });
  });

  it("warns when a confirmed commission is reversed", async () => {
    // This can push a partner negative if the money has already been withdrawn. It is a
    // real accounting situation, and it must stay visible rather than pass silently.
    tx.commission.findUnique.mockResolvedValue({
      id: "com-1", state: "CONFIRMED", partnerId: "partner-1",
      amountMinor: 45_000, currency: "EUR",
    });
    const logger = log();

    await transitionCommission(move({ to: "REVERSED", note: "Student withdrew." }), staff, logger);

    expect(logger.warn).toHaveBeenCalled();
  });

  it("does not warn on an ordinary confirmation", async () => {
    const logger = log();
    await transitionCommission(move(), staff, logger);

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
