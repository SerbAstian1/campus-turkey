"use client";

/**
 * The auth client.
 *
 * Talks to the Better Auth endpoints mounted at `/api/auth/*`. Nothing here handles a
 * password, a hash or a token directly — the library does that, and the whole reason to
 * use one is to not write those three things by hand.
 *
 * Sign-*up* is deliberately absent. Partners are onboarded by Campus Turkey through the
 * registration form, which creates a lead a human reviews; the server has open
 * registration disabled (`disableSignUp` in server/lib/auth.ts), so a sign-up call here
 * would be refused anyway.
 */

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
  // Same origin. The API and the site are one deployable, which is the point of the
  // consolidation — there is no cross-origin cookie problem to solve.
  baseURL: typeof window === "undefined" ? undefined : window.location.origin,
});

export const { useSession, signOut } = authClient;

export type SignInResult = { ok: true } | { ok: false; message: string };

/**
 * Sign in with email and password.
 *
 * The failure message is deliberately the same for an unknown address and a wrong
 * password. Distinguishing them tells an attacker which half they got right, and turns
 * the sign-in form into a way to enumerate who has an account.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<SignInResult> {
  try {
    const { error } = await authClient.signIn.email({ email, password });

    if (!error) return { ok: true };

    if (error.status === 429) {
      return {
        ok: false,
        message: "Too many attempts. Please wait a few minutes and try again.",
      };
    }

    return { ok: false, message: "That email and password do not match an account." };
  } catch {
    return {
      ok: false,
      message: "We could not reach the server. Check your connection and try again.",
    };
  }
}

/* ── Setting a password for the first time ──────────────────────────────────────
 *
 * Two calls, one page. A partner approved by staff has an account with no password
 * and an unverified address; both are settled here without navigating away, because
 * navigating away is how you lose a password somebody has already typed.
 *
 * The code is what proves the address belongs to them, so it does double duty: it
 * authorises setting the password *and* it is the verification. There is no separate
 * "confirm your email" step to forget.
 */

export type CodeRequest =
  | { ok: true; /** Dev only, and only with no mail provider — see server/lib/dev-codes.ts */ code?: string }
  | { ok: false; message: string };

/**
 * Ask for a code.
 *
 * The success message must not say whether the address has an account. Saying so turns
 * this into an oracle for who Campus Turkey works with, which is commercially sensitive
 * quite apart from being a privacy problem — so an unknown address gets the same
 * "check your email" as a known one, and the server sends nothing.
 */
export async function requestSetupCode(email: string): Promise<CodeRequest> {
  try {
    const { error } = await authClient.forgetPassword.emailOtp({ email });

    if (error && error.status === 429) {
      return { ok: false, message: "Too many requests. Please wait a few minutes and try again." };
    }
    if (error) {
      return { ok: false, message: "We could not send a code just now. Please try again." };
    }

    // Development affordance. 404 is the normal answer — it means the endpoint is
    // disabled, which is the case everywhere a real mail provider exists.
    try {
      const response = await fetch(`/api/dev/last-code?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const body = (await response.json()) as { code?: string };
        if (body.code) return { ok: true, code: body.code };
      }
    } catch {
      // Never let the convenience break the flow it is a convenience for.
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "We could not reach the server. Check your connection." };
  }
}

export type SetPasswordResult = { ok: true } | { ok: false; message: string };

/** Confirm the code and set the password. */
export async function setPasswordWithCode(
  email: string,
  otp: string,
  password: string,
): Promise<SetPasswordResult> {
  try {
    const { error } = await authClient.emailOtp.resetPassword({ email, otp, password });

    if (!error) return { ok: true };

    if (error.status === 429) {
      return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
    }

    // The code is the only thing the person can get wrong here that is worth naming —
    // it expires, it is single use, and it runs out of attempts. Saying so is not a
    // leak: they already hold it.
    return {
      ok: false,
      message: "That code is not right, or it has expired. Request a new one and try again.",
    };
  } catch {
    return { ok: false, message: "We could not reach the server. Check your connection." };
  }
}
