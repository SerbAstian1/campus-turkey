/**
 * Authentication — Better Auth, configured.
 *
 * Why Better Auth and not Clerk or Auth.js, for this project specifically:
 *
 *   Clerk is excellent and priced per monthly active user. The partner portal's
 *   population is agencies, not consumers — a few hundred accounts, each of real
 *   commercial value. Per-seat pricing is affordable at that size, but it puts the
 *   client's identity data in a third party for a system whose entire user base could
 *   fit in one Postgres table. That is a dependency the business does not need to own.
 *
 *   Auth.js handles sessions well and authorisation not at all, and the portal needs
 *   the staff/partner distinction wired into the session from the start.
 *
 *   Better Auth keeps sessions in the client's own database, has no per-seat cost, and
 *   exposes the session object directly, which is what `resolveSession` needs to attach
 *   the partner record. The trade accepted: it is a younger library, so the version is
 *   pinned and upgrades are deliberate rather than automatic.
 *
 * Nothing here is hand-rolled. No password hashing, no token signing, no session
 * generation — those are the library's, and writing them again is how they get written
 * wrong.
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { env, isProduction } from "./config";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: env.SESSION_SECRET,
  baseURL: env.SITE_ORIGIN,

  emailAndPassword: {
    enabled: true,
    // Partners are onboarded by Campus Turkey, not by self-signup. Registration goes
    // through the partner application form, which creates a lead a human reviews.
    // Leaving open signup on would let anyone mint a portal account.
    disableSignUp: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    // Better Auth uses scrypt by default. Left as the library's choice deliberately:
    // overriding a password KDF is a decision that needs a reason, and there isn't one.
  },

  user: {
    /**
     * `staffRole` lives on the `user` table but is not part of Better Auth's own schema,
     * and the library returns **only** the fields it knows about on `session.user`.
     * Without this declaration `session.user.staffRole` is `undefined` for everybody —
     * including ADMIN — so `handler.ts` refuses every `{ kind: "staff" }` route and the
     * entire staff API answers 403 to the people it exists for. The role was correct in
     * the database the whole time; it just never reached the session.
     *
     * `input: false` is the load-bearing half of this. It stops the field being writable
     * through the library's sign-up and update-user endpoints. Declared without it, an
     * authenticated partner could POST their own `staffRole` and promote themselves to
     * FINANCE — turning a read fix into privilege escalation. The role is granted only
     * by `scripts/create-staff.mjs` or by SQL, both of which require access nobody has
     * over HTTP.
     */
    additionalFields: {
      staffRole: { type: "string", required: false, input: false },
    },
  },

  session: {
    /**
     * Seven days absolute, refreshed once a day of activity. Long enough that an agency
     * working a weekly intake cycle is not signed out mid-task; short enough that a
     * stolen session cookie has a bounded life.
     */
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    /**
     * The `sessionExpired` error screen the prototype designed is triggered by a
     * refresh failure — see handoff note 12. That is this value elapsing.
     */
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  advanced: {
    /**
     * Better Auth mints its own short random ids by default. The auth tables here are
     * declared `@db.Uuid`, matching every other id in the schema, so Postgres rejects
     * those on insert — a sign-in fails with `Error creating UUID, invalid character
     * ... found 'p' at 1`, which is the library's id arriving in a uuid column.
     *
     * Overriding the generator rather than widening the columns to `text`: uuid columns
     * are 16 bytes against ~30, index better, and keep one id shape across the whole
     * database instead of two.
     */
    database: { generateId: "uuid" },

    /**
     * `SameSite=Lax` rather than `Strict`: Strict would drop the session cookie on a
     * link followed from an email, which is how partners actually arrive at the portal
     * after an "approved" notification. The origin check in `server/http/handler.ts`
     * covers what Lax does not.
     */
    defaultCookieAttributes: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
    },
    useSecureCookies: isProduction,
    // Enables Better Auth's own CSRF token alongside the origin check. Two independent
    // mechanisms, because this cookie authorises access to money.
    disableCSRFCheck: false,
  },

  rateLimit: {
    // Library-level limiting for the auth endpoints, in addition to the Redis-backed
    // limiter in ratelimit.ts. The library's is per-instance and therefore weak on
    // serverless; it is here as a second layer, not the control.
    enabled: true,
    window: 60,
    max: 20,
  },

  trustedOrigins: [env.SITE_ORIGIN],
});

export type Auth = typeof auth;
