/**
 * `requestLogger` — the correlation wrapper every request logs through.
 *
 * `logger.redaction.test.ts` covers `redact` as a pure function, which is the rule.
 * This covers the part that *applies* it. The distinction matters for the same reason
 * it did in `authorization.test.ts`: a redaction rule that is correct and not called is
 * indistinguishable, in the log, from having no rule at all.
 *
 * Three of these five methods were uncovered — `debug`, `error` and `audit` — and
 * `audit` is the one that matters most, because those lines are the operational half of
 * the money audit trail and their shape is what a filter selects on.
 *
 * pino is mocked at the module boundary so the assertions are about what this module
 * hands the logger, not about pino's serialisation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const child = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const childFactory = vi.hoisted(() => vi.fn(() => child));

vi.mock("pino", () => {
  const factory = vi.fn(() => ({ child: childFactory })) as unknown as {
    (): unknown;
    stdTimeFunctions: { isoTime: () => string };
  };
  // `logger.ts` reads this at module scope for its `timestamp` option; the mock has to
  // carry it or the module cannot be imported at all.
  factory.stdTimeFunctions = { isoTime: () => '"time":"2026-01-01T00:00:00.000Z"' };
  return { default: factory };
});

const { requestLogger } = await import("./logger");

beforeEach(() => {
  childFactory.mockClear();
  for (const spy of Object.values(child)) spy.mockClear();
});

describe("the bound context", () => {
  it("carries the correlation id onto the child logger", () => {
    requestLogger({ requestId: "req-1", route: "/api/leads", method: "POST" });

    expect(childFactory).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "req-1", route: "/api/leads", method: "POST" }),
    );
  });

  /**
   * The context is redacted too, not just the per-line data. It is caller-supplied, and
   * binding it unredacted would stamp the value onto every subsequent line of the
   * request rather than one.
   */
  it("redacts the bound context", () => {
    requestLogger({
      requestId: "req-2", route: "/api/leads", method: "POST", sessionId: "sess-abc",
    } as never);

    expect(childFactory).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "[redacted]" }),
    );
  });
});

describe("every level redacts its data", () => {
  const levels = ["debug", "info", "warn", "error"] as const;

  /**
   * Asserted with a *secret* key rather than a personal one, and the difference is a
   * deliberate design decision worth not tripping over: `redact`'s PII pass is gated on
   * `isProduction`, because in development the data is fake and being able to read it
   * is worth more than the exposure. Secrets are redacted unconditionally. A test
   * asserting `email: "[redacted]"` would therefore fail outside production and prove
   * nothing about the wiring — see the last case in this file, which pins that split.
   */
  it.each(levels)("%s redacts secrets before emitting", (level) => {
    const log = requestLogger({ requestId: "req-3", route: "/x", method: "GET" });

    log[level]("something happened", { password: "hunter2", count: 3 });

    expect(child[level]).toHaveBeenCalledWith(
      expect.objectContaining({ password: "[redacted]", count: 3 }),
      "something happened",
    );
  });

  /** No data argument must not become `{}` — pino treats the first argument as merge
   *  object or message depending on its type, and passing an empty object where a
   *  message belongs produces a line with no text. */
  it.each(levels)("%s passes no merge object when there is no data", (level) => {
    const log = requestLogger({ requestId: "req-4", route: "/x", method: "GET" });

    log[level]("bare message");

    expect(child[level]).toHaveBeenCalledWith(undefined, "bare message");
  });
});

describe("audit lines", () => {
  /**
   * The shape is the contract. `audit: true` and a stable `event` are what let these
   * lines be filtered into their own retention policy — they are the operational half
   * of the trail whose durable half is `withdrawal_event`, and a filter that stops
   * matching loses the half that can be searched.
   */
  it("emits at info with the audit marker, the event, and a prefixed message", () => {
    const log = requestLogger({ requestId: "req-5", route: "/api/partner/withdrawals", method: "POST" });

    log.audit("withdrawal.requested", { withdrawalId: "w-1", amountMinor: 40_000 });

    expect(child.info).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: true,
        event: "withdrawal.requested",
        withdrawalId: "w-1",
        amountMinor: 40_000,
      }),
      "audit:withdrawal.requested",
    );
  });

  /**
   * Ids and amounts survive; secrets do not. `providerRef` is in the secret list and
   * genuinely travels this path — `transitionWithdrawal` carries one — so an audit line
   * is a real place it could have leaked.
   */
  it("redacts secrets while keeping the ids and amounts the line exists for", () => {
    const log = requestLogger({ requestId: "req-6", route: "/x", method: "POST" });

    log.audit("withdrawal.approved", {
      withdrawalId: "w-2",
      amountMinor: 10_000,
      providerRef: "wise-abc-123",
    });

    expect(child.info).toHaveBeenCalledWith(
      expect.objectContaining({
        withdrawalId: "w-2",
        amountMinor: 10_000,
        providerRef: "[redacted]",
      }),
      "audit:withdrawal.approved",
    );
  });
});

/**
 * The environment-dependent half, pinned because it surprises people.
 *
 * Personal data is redacted **in production only**. Reading this as a bug and
 * "fixing" it would remove the ability to debug a lead form locally against fake data;
 * reading it as licence to log freely would put real addresses in production logs. The
 * split is the decision, so it gets an assertion rather than only a comment.
 */
describe("personal data outside production", () => {
  it("passes PII through in development, where the data is fake", () => {
    const log = requestLogger({ requestId: "req-7", route: "/x", method: "POST" });

    log.info("lead received", { email: "someone@example.com" });

    expect(child.info).toHaveBeenCalledWith(
      expect.objectContaining({ email: "someone@example.com" }),
      "lead received",
    );
  });

  it("redacts a secret in the same payload regardless", () => {
    const log = requestLogger({ requestId: "req-8", route: "/x", method: "POST" });

    log.info("lead received", { email: "someone@example.com", apiKey: "sk-live-xyz" });

    expect(child.info).toHaveBeenCalledWith(
      expect.objectContaining({ email: "someone@example.com", apiKey: "[redacted]" }),
      "lead received",
    );
  });
});
