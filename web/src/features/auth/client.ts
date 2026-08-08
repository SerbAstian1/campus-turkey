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

export const authClient = createAuthClient({
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
