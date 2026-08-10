/**
 * That the authorization rule is actually enforced — not merely correct.
 *
 * `permissions.test.ts` proves `hasPermission` returns the right answer for every role
 * and grant. That is a different claim from the one production depends on, which is that
 * `route()` *asks it* and *refuses when it says no*. The audit counted "0 / 13
 * authorization rules with a negative test" against exactly this gap: the rule was
 * proven, the wiring was not, and a wiring bug is invisible to a test of the rule.
 *
 * It is worth being concrete about how that fails. Delete the `hasPermission` block from
 * `handler.ts` and every test in `permissions.test.ts` still passes, every type still
 * checks, and all 31 permission-gated endpoints are open to any signed-in user. This
 * file is what turns that from a silent catastrophe into a red build.
 *
 * Tested at the `route()` seam rather than per endpoint, because that is where the
 * decision is made. Thirty-one near-identical route tests would assert the same branch
 * thirty-one times and still not cover it better; what they would catch is an endpoint
 * declaring the *wrong* permission, and that is a conformance question rather than an
 * enforcement one — see `endpoint-access.test.ts`.
 *
 * The load-bearing assertion in each case is `handlerRan`. A 403 with the handler having
 * already executed is not a refusal; it is a leak with an error page stapled to it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const resolveSession = vi.hoisted(() => vi.fn());
vi.mock("./session", () => ({ resolveSession }));

// Rate limiting is a separate concern with its own tests, and without Redis configured
// it would otherwise make every case here depend on its fail-open behaviour.
vi.mock("@/server/lib/ratelimit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/lib/ratelimit")>()),
  enforceRateLimit: vi.fn(async () => {}),
}));

const { route } = await import("./handler");
const { RATE_LIMITS } = await import("@/server/lib/ratelimit");
const { env } = await import("@/server/lib/config");

type Role = "PARTNER" | "STAFF" | "ADMIN" | "SUPER_ADMIN" | "STUDENT" | "REPRESENTATIVE";
type Status = "ACTIVE" | "SUSPENDED" | "PENDING";

function sessionFor(
  user: { role: Role; status: Status; department?: string | null } | null,
  extra: { partner?: unknown; representative?: unknown } = {},
) {
  return {
    user: user ? { id: "user-1", ...user, department: user.department ?? null } : null,
    partner: extra.partner ?? null,
    representative: extra.representative ?? null,
  };
}

/** A GET, so `assertSameOrigin` short-circuits and does not need an Origin header. */
function get(path = "/api/test"): NextRequest {
  return new NextRequest(new URL(path, env.SITE_ORIGIN), { method: "GET" });
}

beforeEach(() => resolveSession.mockReset());
afterEach(() => vi.clearAllMocks());

describe("permission-gated endpoints", () => {
  /** Builds an endpoint requiring one permission, and reports whether it ever ran. */
  function endpoint(require: Parameters<typeof route>[0] extends never ? never : string[]) {
    const state = { handlerRan: false };
    const handler = route({
      access: { kind: "permission", require: require as never },
      rateLimit: RATE_LIMITS.none,
      handler: async () => {
        state.handlerRan = true;
        return { ok: true };
      },
    });
    return { handler, state };
  }

  it("refuses an anonymous caller with 401, without running the handler", async () => {
    resolveSession.mockResolvedValue(sessionFor(null));
    const { handler, state } = endpoint(["READ_LEADS"]);

    const response = await handler(get());

    expect(response.status).toBe(401);
    expect(state.handlerRan).toBe(false);
  });

  it("refuses a signed-in user who lacks the permission, without running the handler", async () => {
    // A partner is a real, active, authenticated account. This is the case that matters:
    // not an attacker, but an ordinary user reaching a staff endpoint.
    resolveSession.mockResolvedValue(sessionFor({ role: "PARTNER", status: "ACTIVE" }));
    const { handler, state } = endpoint(["READ_LEADS"]);

    const response = await handler(get());

    expect(response.status).toBe(403);
    expect(state.handlerRan).toBe(false);
  });

  /**
   * Status and permission are separate questions, and the order is deliberate: a
   * suspended administrator holds every permission their role implies and may still not
   * act. Checking the permission first would let them through.
   */
  it("refuses a suspended account that does hold the permission", async () => {
    resolveSession.mockResolvedValue(sessionFor({ role: "SUPER_ADMIN", status: "SUSPENDED" }));
    const { handler, state } = endpoint(["READ_LEADS"]);

    const response = await handler(get());

    expect(response.status).toBe(403);
    expect(state.handlerRan).toBe(false);
    // The two refusals must be distinguishable — support needs to tell "barred" from
    // "not permitted", and one generic message cannot.
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/not active/i);
  });

  /**
   * The positive control. Without it every assertion above is satisfied by a guard that
   * refuses everybody, which is a broken endpoint rather than a secure one.
   */
  it("admits a caller who holds the permission, and runs the handler", async () => {
    resolveSession.mockResolvedValue(sessionFor({ role: "SUPER_ADMIN", status: "ACTIVE" }));
    const { handler, state } = endpoint(["READ_LEADS"]);

    const response = await handler(get());

    expect(response.status).toBe(200);
    expect(state.handlerRan).toBe(true);
  });

  it("requires every permission when several are named, not merely one", async () => {
    // STAFF can read leads but cannot approve payouts. An `any`-style check would let
    // this through, and the difference is a support agent moving money.
    resolveSession.mockResolvedValue(sessionFor({ role: "STAFF", status: "ACTIVE" }));
    const { handler, state } = endpoint(["READ_LEADS", "APPROVE_WITHDRAWALS"]);

    const response = await handler(get());

    expect(response.status).toBe(403);
    expect(state.handlerRan).toBe(false);
  });
});

describe("partner-gated endpoints", () => {
  function partnerEndpoint() {
    const state = { handlerRan: false };
    const handler = route({
      access: { kind: "partner" },
      rateLimit: RATE_LIMITS.none,
      handler: async () => {
        state.handlerRan = true;
        return { ok: true };
      },
    });
    return { handler, state };
  }

  it("refuses an anonymous caller with 401", async () => {
    resolveSession.mockResolvedValue(sessionFor(null));
    const { handler, state } = partnerEndpoint();

    expect((await handler(get())).status).toBe(401);
    expect(state.handlerRan).toBe(false);
  });

  /**
   * Authenticated but not a partner. A student or a staff account has a valid session
   * and no partner record, and the partner portal must not treat "signed in" as "is a
   * partner" — that conflation is the whole reason this is a separate access kind.
   */
  it("refuses a signed-in non-partner with 403", async () => {
    resolveSession.mockResolvedValue(sessionFor({ role: "STUDENT", status: "ACTIVE" }));
    const { handler, state } = partnerEndpoint();

    expect((await handler(get())).status).toBe(403);
    expect(state.handlerRan).toBe(false);
  });

  it("admits a caller with a partner record", async () => {
    resolveSession.mockResolvedValue(
      sessionFor({ role: "PARTNER", status: "ACTIVE" }, { partner: { id: "partner-1" } }),
    );
    const { handler, state } = partnerEndpoint();

    expect((await handler(get())).status).toBe(200);
    expect(state.handlerRan).toBe(true);
  });
});

describe("public endpoints", () => {
  /**
   * A `public` declaration must not cost a session lookup. This was a real finding once
   * — `resolveSession` ran on every translate call to discard the result — and the only
   * thing keeping it fixed is an assertion that it is not called.
   */
  it("runs without resolving a session at all", async () => {
    let handlerRan = false;
    const handler = route({
      access: { kind: "public" },
      rateLimit: RATE_LIMITS.none,
      handler: async () => {
        handlerRan = true;
        return { ok: true };
      },
    });

    const response = await handler(get());

    expect(response.status).toBe(200);
    expect(handlerRan).toBe(true);
    expect(resolveSession).not.toHaveBeenCalled();
  });
});
