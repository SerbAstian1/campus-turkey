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
import { emailOTP } from "better-auth/plugins";
import { db } from "./db";
import { env, isProduction } from "./config";
import { logger } from "./logger";
import { sendMail, verificationCodeEmail } from "./mail";
import { rememberCode } from "./dev-codes";

/**
 * How long a code is good for, and how many guesses it gets.
 *
 * Ten minutes is long enough to switch to a mail app on a slow connection and short
 * enough that a code read off a shoulder is usually dead. Three attempts because a
 * six-digit code has a million values: three guesses is 3-in-a-million, while the
 * default of several more, multiplied across unlimited re-requests, is how brute force
 * stops being theoretical. Better Auth invalidates the code once attempts are spent.
 */
const OTP_MINUTES = 10;
const OTP_ATTEMPTS = 3;

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
    /**
     * Required only when there is a way to actually send the verification.
     *
     * Hardcoded `true` with `MAIL_PROVIDER=disabled` is a guaranteed lockout, and it was
     * one: an account created exactly as staff would create it is refused at sign-in with
     * 403 `EMAIL_NOT_VERIFIED`, and no email can ever arrive to clear it. Verified by
     * creating such an account and attempting sign-in. It went unnoticed because
     * `seed.mjs` and `create-staff.mjs` both set `emailVerified: true` directly, so every
     * account anyone had tested with was pre-verified.
     *
     * Tying it to the mail provider means the rule is enforced exactly when it is
     * enforceable. Production cannot quietly opt out: `config.ts` refuses to boot with
     * `MAIL_PROVIDER=disabled` in production, so a deployed system always has both.
     */
    requireEmailVerification: env.MAIL_PROVIDER !== "disabled",
    minPasswordLength: 12,
    // Better Auth uses scrypt by default. Left as the library's choice deliberately:
    // overriding a password KDF is a decision that needs a reason, and there isn't one.
  },

  user: {
    /**
     * `role` and `status` live on the `user` table but are not part of Better Auth's own
     * schema, and the library returns **only** the fields it knows about on
     * `session.user`. Declaring them here keeps the library's own view of a user honest.
     *
     * **`input: false` is the load-bearing half.** It stops either field being writable
     * through the library's sign-up and update-user endpoints. Declared without it, an
     * authenticated partner could POST their own `role` and promote themselves to ADMIN,
     * or set their `status` back to ACTIVE after being suspended. Roles are granted only
     * by `scripts/create-staff.mjs`, by an approval flow, or by SQL — none of which is
     * reachable over HTTP.
     *
     * `resolveSession` reads both from the database rather than from here, so a
     * revocation takes effect on the next request instead of when the signed cookie
     * expires. These declarations exist so the library does not strip them, not so
     * authorization can trust them.
     */
    additionalFields: {
      role: { type: "string", required: false, input: false },
      status: { type: "string", required: false, input: false },
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

  plugins: [
    /**
     * Email codes, for partner onboarding and password reset.
     *
     * A six-digit code rather than a magic link, because the flow this serves keeps the
     * partner on one page: they set a password and confirm the code without navigating
     * away. A link would move them to a new tab mid-form and lose the password they had
     * just typed — and a link that survives that is a link that logs someone in from a
     * forwarded email.
     *
     * The code is generated, hashed and expired by the library. Nothing here stores or
     * compares one by hand.
     */
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_MINUTES * 60,
      allowedAttempts: OTP_ATTEMPTS,

      /**
       * Sign-up via OTP stays closed.
       *
       * Without this, requesting a code for an unknown address would create an account
       * for it — reopening the self-registration that `disableSignUp` exists to prevent,
       * through a different door. Partners are created by staff approving an
       * application; this plugin only ever finishes onboarding one that already exists.
       */
      disableSignUp: true,

      async sendVerificationOTP({ email, otp, type }) {
        const result = await sendMail(verificationCodeEmail({
          to: email,
          code: otp,
          minutesValid: OTP_MINUTES,
        }));

        if (!result.ok) {
          // Thrown, not swallowed. The caller is about to be told "check your email" for
          // a message that does not exist, and would then blame a code that never
          // arrived on themselves. Better Auth turns this into a failed request.
          logger.error({ type, error: result.error }, "verification code could not be sent");
          throw new Error("We could not send your code. Please try again in a moment.");
        }

        // Development only, and inert unless no mail provider is configured — see
        // `dev-codes.ts` for why that second condition is the one doing the work.
        rememberCode(email, otp);

        // Never log `otp`. It is the credential.
        logger.info({ type, delivered: result.delivered }, "verification code issued");
      },
    }),
  ],
});

export type Auth = typeof auth;
