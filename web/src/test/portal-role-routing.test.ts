/**
 * Where each role lands after signing in, and the loop that proves it matters.
 *
 * **The bug this exists to prevent.** `PartnerLogin` navigates to `/portal/dashboard`
 * unconditionally after a successful sign-in — it cannot branch on role, because the
 * browser has no session to read until the server resolves one. So that page is not one
 * guarded route among four; it is the junction every sign-in passes through.
 *
 * It used to look for a `Partner` row and send everyone else to `/portal`. But `/portal`
 * is the door and deliberately has no session check, so it re-rendered the login form.
 * A representative, student or staff member therefore signed in **successfully** and
 * arrived back at an empty login page with no error — indistinguishable from a wrong
 * password, and identical again on the next attempt. Three of the four roles could not
 * reach their own portal at all, and nothing in the type system or the existing suite
 * had an opinion about it.
 *
 * **Why this is asserted as reachability rather than as four redirect assertions.** A
 * test that says "staff go to /staff" passes just as happily when `/staff` bounces them
 * straight back. What actually has to be true is that following the redirects
 * *terminates* — so the test walks them, exactly as a browser would, and fails on a
 * cycle or a chain that never renders anything. That property is what was broken, and it
 * is what stays broken if someone adds a fifth role and forgets the junction.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

type Role = "STUDENT" | "PARTNER" | "REPRESENTATIVE" | "STAFF" | "ADMIN" | "SUPER_ADMIN";

/** The signed-in user each page will see. Set per walk. */
let current: { role: Role; hasPartner: boolean; hasRepresentative: boolean } | null = null;

/** `redirect()` throws in Next so nothing after it runs; the mock preserves that. */
class Redirected extends Error {
  constructor(public readonly to: string) {
    super(`redirect:${to}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));

vi.mock("next/headers", () => ({ headers: () => Promise.resolve(new Headers()) }));

vi.mock("@/server/lib/auth", () => ({
  auth: {
    api: {
      getSession: () =>
        Promise.resolve(current ? { user: { id: "user-1" } } : null),
    },
  },
}));

/**
 * The user lookup, answering whichever `select` the page asked for.
 *
 * Each page selects a different shape — the dashboard wants `partner`, the
 * representative page wants `representative`, the staff page wants `staffProfile` — so
 * one stub returns the superset and lets each page read what it needs.
 */
vi.mock("@/server/lib/db", () => ({
  db: {
    user: {
      findUnique: () =>
        Promise.resolve(
          current
            ? {
                role: current.role,
                name: "Test Person",
                email: "test@campusturkey.org",
                partner: current.hasPartner ? { id: "partner-1" } : null,
                representative: current.hasRepresentative ? { id: "rep-1" } : null,
                staffProfile: { department: "SUPPORT" },
              }
            : null,
        ),
    },
    partner: { findUnique: () => Promise.resolve(current?.hasPartner ? { id: "partner-1" } : null) },
  },
}));

/** The four authenticated entry points, by the path a browser would ask for. */
const PAGES: Record<string, () => Promise<{ default: () => Promise<unknown> }>> = {
  "/portal/dashboard": () => import("../../app/[locale]/portal/dashboard/page"),
  "/portal/representative": () => import("../../app/[locale]/portal/representative/page"),
  "/portal/student": () => import("../../app/[locale]/portal/student/page"),
  "/staff": () => import("../../app/[locale]/staff/page"),
};

/**
 * Ask one page what it does with the current user: render, or redirect where.
 *
 * `/portal` is terminal by definition — it is the login form and has no guard — so a
 * walk that reaches it has stopped, correctly or otherwise.
 */
async function visit(path: string): Promise<{ rendered: true } | { to: string }> {
  const mod = await PAGES[path]!();
  try {
    await mod.default();
    return { rendered: true };
  } catch (error) {
    if (error instanceof Redirected) return { to: error.to };
    throw error;
  }
}

/**
 * Follow the redirects from the sign-in landing page, as a browser would.
 *
 * Returns the trail so a failure names the cycle rather than merely reporting one.
 */
async function walkFromSignIn(user: NonNullable<typeof current>): Promise<string[]> {
  current = user;
  const trail: string[] = ["/portal/dashboard"];

  for (let hop = 0; hop < 6; hop++) {
    const at = trail[trail.length - 1]!;
    if (at === "/portal") return trail; // the door: terminal, session or no session
    const result = await visit(at);
    if ("rendered" in result) return trail;

    if (trail.includes(result.to)) {
      trail.push(result.to);
      throw new Error(`redirect loop: ${trail.join(" → ")}`);
    }
    trail.push(result.to);
  }

  throw new Error(`redirect chain did not settle: ${trail.join(" → ")}`);
}

beforeEach(() => {
  current = null;
});

describe("signing in reaches somewhere, for every role", () => {
  const cases: { role: Role; hasPartner: boolean; hasRepresentative: boolean; lands: string }[] = [
    { role: "PARTNER", hasPartner: true, hasRepresentative: false, lands: "/portal/dashboard" },
    { role: "REPRESENTATIVE", hasPartner: false, hasRepresentative: true, lands: "/portal/representative" },
    { role: "STUDENT", hasPartner: false, hasRepresentative: false, lands: "/portal/student" },
    { role: "STAFF", hasPartner: false, hasRepresentative: false, lands: "/staff" },
    { role: "ADMIN", hasPartner: false, hasRepresentative: false, lands: "/staff" },
    { role: "SUPER_ADMIN", hasPartner: false, hasRepresentative: false, lands: "/staff" },
  ];

  for (const { role, hasPartner, hasRepresentative, lands } of cases) {
    it(`${role} reaches ${lands} without looping`, async () => {
      const trail = await walkFromSignIn({ role, hasPartner, hasRepresentative });

      // Landed somewhere that rendered — not back at the login form holding a valid
      // session, which is what a successful sign-in used to look like for three of these.
      expect(trail[trail.length - 1]).toBe(lands);
      expect(trail[trail.length - 1]).not.toBe("/portal");
    });
  }
});

describe("accounts with a role but no profile row", () => {
  it("sends a partner with no partner record back to the door rather than looping", async () => {
    // Mid-onboarding, or a profile since removed. There is genuinely nowhere to send
    // them, so the door is right — what matters is that it terminates.
    const trail = await walkFromSignIn({ role: "PARTNER", hasPartner: false, hasRepresentative: false });
    expect(trail[trail.length - 1]).toBe("/portal");
  });

  it("sends a representative with no representative record back to the door", async () => {
    const trail = await walkFromSignIn({ role: "REPRESENTATIVE", hasPartner: false, hasRepresentative: false });
    expect(trail[trail.length - 1]).toBe("/portal");
  });
});

describe("the junction itself", () => {
  it("never returns a signed-in user to the login form except when they have no profile", async () => {
    /*
     * The regression, stated directly. Before the fix every non-partner role took this
     * path: dashboard → /portal, with a valid session and no error shown.
     */
    for (const role of ["REPRESENTATIVE", "STUDENT", "STAFF", "ADMIN", "SUPER_ADMIN"] as Role[]) {
      current = {
        role,
        hasPartner: false,
        hasRepresentative: role === "REPRESENTATIVE",
      };
      const result = await visit("/portal/dashboard");
      expect(result).not.toEqual({ to: "/portal" });
    }
  });

  it("turns an unauthenticated visitor away", async () => {
    current = null;
    expect(await visit("/portal/dashboard")).toEqual({ to: "/portal" });
  });
});
