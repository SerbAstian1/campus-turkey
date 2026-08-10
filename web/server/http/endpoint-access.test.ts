/**
 * Conformance: every endpoint declares the *right* kind of access.
 *
 * `authorization.test.ts` proves the guard refuses when the rule says no. This proves
 * the rules themselves are the ones intended — a different failure, and the one the type
 * system cannot catch. `access: { kind: "public" }` compiles just as happily on the
 * payout queue as on the university directory.
 *
 * The public list is an allowlist rather than a count. A count tells you *that* the
 * number changed; an allowlist tells you *which* endpoint changed and forces the person
 * making it public to say so in this file, in the same commit, where a reviewer will see
 * it next to the route. Making something public should cost a deliberate edit — that is
 * the entire mechanism here.
 *
 * Read off the source rather than by importing the routes: importing a route module
 * pulls in the database client, the storage adapter and the config guard, none of which
 * a conformance check needs, and any one of which failing would present as an
 * authorization failure.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const API_ROOT = join(process.cwd(), "app", "api");

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

type AccessKind = "public" | "partner" | "permission";

interface Endpoint {
  /** Posix-style path relative to app/api, e.g. `staff/leads/route.ts`. */
  path: string;
  kind: AccessKind | null;
  /** The permissions named, when the kind is `permission`. */
  require: string[];
}

const ENDPOINTS: Endpoint[] = routeFiles(API_ROOT).map((file) => {
  const source = readFileSync(file, "utf8");
  const path = relative(API_ROOT, file).split(sep).join("/");

  const kind = /access:\s*\{\s*kind:\s*"(public|partner|permission)"/.exec(source)?.[1] as
    | AccessKind
    | undefined;

  // `require: ["A", "B"]` — the permission names, in declaration order.
  const requireBlock = /require:\s*\[([^\]]*)\]/.exec(source)?.[1] ?? "";
  const require = [...requireBlock.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]!);

  return { path, kind: kind ?? null, require };
});

/**
 * The endpoints that may be reached with no session at all.
 *
 * Each one is here because it is either the public catalogue the marketing site renders
 * from, or a form an unauthenticated visitor is expected to submit. Adding to this list
 * is a security decision; the test exists so it cannot be an accident.
 */
const PUBLIC_ALLOWLIST = new Set([
  // Lead capture. Unauthenticated by necessity — rate limited and captcha-gated instead.
  "leads/route.ts",
  "representative-applications/route.ts",
  // The translation proxy the design system calls on every page.
  "translate/route.ts",
  // The university catalogue. Public content; the marketing pages render from it.
  "universities/route.ts",
  "universities/[slug]/route.ts",
  "universities/facets/route.ts",
  "universities/pins/route.ts",
]);

/**
 * Routes exempt from the "must declare access" rule, with the reason.
 *
 * Better Auth mounts its own handler and does its own authorization; health is an
 * unauthenticated liveness probe by design and is deliberately not in the public
 * allowlist, because it is infrastructure rather than product surface.
 */
const NOT_ROUTE_BUILDER = new Map([
  ["auth/[...all]/route.ts", "Better Auth's own handler"],
  ["health/route.ts", "liveness probe, no route() wrapper"],
  ["dev/last-code/route.ts", "development only; refuses to run in production"],
  ["cron/purge-leads/route.ts", "authenticated by CRON_SECRET, not by session"],
  /**
   * Authenticated by HMAC over `${timestamp}.${body}`. Deliberately outside `route()`,
   * because that wrapper's same-origin check is right for a browser and wrong for a
   * provider's server, which sends no `Origin` — every legitimate callback would be
   * refused. The signature does that job here, and `signature.test.ts` covers it.
   */
  ["webhooks/payouts/route.ts", "HMAC-signed provider callback, no session"],
]);

describe("every endpoint states an authorization rule", () => {
  it("finds the API surface at all", () => {
    // Guards against the walker silently returning nothing and every assertion below
    // passing vacuously — which is how a conformance suite becomes decoration.
    expect(ENDPOINTS.length).toBeGreaterThan(30);
  });

  it("declares an access kind on every route built with route()", () => {
    const missing = ENDPOINTS.filter(
      (e) => e.kind === null && !NOT_ROUTE_BUILDER.has(e.path),
    ).map((e) => e.path);

    expect(missing).toEqual([]);
  });
});

describe("public endpoints are exactly the allowlist", () => {
  const actual = ENDPOINTS.filter((e) => e.kind === "public").map((e) => e.path).sort();

  it("has not gained a public endpoint", () => {
    const unexpected = actual.filter((path) => !PUBLIC_ALLOWLIST.has(path));
    expect(unexpected).toEqual([]);
  });

  it("has not lost one without updating the list", () => {
    const stale = [...PUBLIC_ALLOWLIST].filter((path) => !actual.includes(path)).sort();
    expect(stale).toEqual([]);
  });
});

describe("access kind matches the area of the API", () => {
  /**
   * Nothing under `/api/staff` may be reachable without a permission.
   *
   * `partner` would be wrong here in a specific and dangerous way: it asserts the caller
   * has a partner record, which a staff account does not have — so the endpoint would
   * refuse the people who need it and the fix under time pressure is to widen it.
   */
  it("gates every staff endpoint on a permission", () => {
    const wrong = ENDPOINTS.filter(
      (e) => e.path.startsWith("staff/") && !NOT_ROUTE_BUILDER.has(e.path) && e.kind !== "permission",
    ).map((e) => `${e.path}: ${e.kind}`);

    expect(wrong).toEqual([]);
  });

  it("names at least one permission wherever the kind is permission", () => {
    const empty = ENDPOINTS.filter((e) => e.kind === "permission" && e.require.length === 0)
      .map((e) => e.path);

    // `require: []` satisfies `hasPermission` trivially — every signed-in account passes.
    expect(empty).toEqual([]);
  });

  it("never leaves a partner-facing endpoint public", () => {
    const wrong = ENDPOINTS.filter(
      (e) => e.path.startsWith("partner/") && e.kind === "public",
    ).map((e) => e.path);

    expect(wrong).toEqual([]);
  });

  it("never leaves a representative-facing endpoint public", () => {
    // `representative-applications/` is the public intake form and is intentionally not
    // under `representative/`, which is the authenticated portal surface.
    const wrong = ENDPOINTS.filter(
      (e) => e.path.startsWith("representative/") && e.kind === "public",
    ).map((e) => e.path);

    expect(wrong).toEqual([]);
  });
});
