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
