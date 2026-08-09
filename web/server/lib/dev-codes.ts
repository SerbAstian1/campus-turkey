/**
 * Verification codes, surfaced on screen — development only.
 *
 * ## Why this exists
 *
 * There is no mail provider yet, so a code that is only ever emailed cannot be received,
 * and the onboarding flow cannot be walked end to end by anybody. This holds the most
 * recent code in memory so the set-password page can fill it in, letting the whole
 * journey be exercised without leaving the page.
 *
 * ## Why this is safe, stated precisely
 *
 * A verification code proves one thing: that the person entering it can read the mailbox
 * it was sent to. **Showing the code to whoever asked for it proves nothing at all** —
 * anyone could then "verify" an address they do not control, which is the entire attack
 * that email verification exists to stop.
 *
 * So the guard is not "development mode". It is `codesMayBeShownOnScreen()`, which
 * requires *both* that this is not production *and* that no mail provider is configured.
 * Two independent conditions, and production fails the first one absolutely:
 * `config.ts` refuses to boot in production with `MAIL_PROVIDER=disabled`, so the second
 * condition cannot hold there either. Both would have to be defeated at once.
 *
 * The guard is checked in three places — here on write, in the route on read, and again
 * before the response is built. That is deliberate redundancy on a control whose failure
 * mode is silent: nothing looks broken when a code leaks, so nothing would report it.
 *
 * ## Why memory rather than the database
 *
 * A row would outlive the process, survive into a database dump, and quietly become a
 * column somebody has to remember to strip before restoring a production backup into
 * staging. Memory dies with the process it was made for, holds one entry per address,
 * and cannot be restored from anywhere.
 */

import { codesMayBeShownOnScreen } from "./mail";

interface HeldCode {
  code: string;
  at: number;
}

/**
 * One entry per address; a new code replaces the old one, matching the fact that
 * requesting a code invalidates the previous one.
 *
 * On `globalThis` for the same reason the Prisma client is (see `db.ts`), plus a second
 * one that is specific to this module and cost an end-to-end run to find: **route
 * handlers do not share module instances.** The code is written by the Better Auth hook
 * inside the `/api/auth/[...all]` bundle and read by `/api/dev/last-code`, which is a
 * different bundle with its own copy of every module it imports. A plain `const held`
 * gives each of them a private, permanently empty map — the write succeeds, the read
 * returns nothing, and neither side reports a problem.
 */
const globalForCodes = globalThis as unknown as { devCodes?: Map<string, HeldCode> };

const held: Map<string, HeldCode> = (globalForCodes.devCodes ??= new Map());

/** Codes expire from here faster than they expire in Better Auth. Holding one longer
 *  than it is usable would only widen the window in which it can be read. */
const HOLD_MS = 10 * 60 * 1000;

/** Never grow without bound: an unbounded map fed by a public endpoint is a memory leak
 *  with a request attached to it. */
const MAX_HELD = 50;

export function rememberCode(email: string, code: string): void {
  if (!codesMayBeShownOnScreen()) return;

  if (held.size >= MAX_HELD) {
    // Oldest first. Map preserves insertion order, so the first key is the least
    // recently written.
    const oldest = held.keys().next();
    if (!oldest.done) held.delete(oldest.value);
  }

  held.set(email.toLowerCase(), { code, at: Date.now() });
}

/**
 * The most recent code for an address, or null.
 *
 * Returns null rather than throwing when the guard is off, so the caller can treat "not
 * available" and "not allowed" identically — a distinction between them would tell an
 * attacker which environment they are in.
 */
export function peekCode(email: string): string | null {
  if (!codesMayBeShownOnScreen()) return null;

  const entry = held.get(email.toLowerCase());
  if (!entry) return null;

  if (Date.now() - entry.at > HOLD_MS) {
    held.delete(email.toLowerCase());
    return null;
  }

  return entry.code;
}

/** Consume on read: a code shown once has served its purpose here, and leaving it
 *  readable afterwards serves none. */
export function takeCode(email: string): string | null {
  const code = peekCode(email);
  if (code) held.delete(email.toLowerCase());
  return code;
}

/** For tests. Module-level state shared between test cases is a test that passes because
 *  of the one before it. */
export function resetHeldCodes(): void {
  held.clear();
}
