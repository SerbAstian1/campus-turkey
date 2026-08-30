/**
 * Structured logging.
 *
 * Two requirements pull against each other: log enough to debug production at 2am, and
 * never log anything that turns the log itself into a breach. The resolution is that
 * ids, amounts, statuses and timings are always safe; the things that identify a person
 * or authorise an action never are.
 *
 * `redact` is exported and pure so the redaction rules can be tested without a logger,
 * because "we redact secrets" is a claim that deserves a test rather than a comment.
 */

import pino from "pino";
import { configurationFingerprint, env, isProduction, isTest } from "./config";

/**
 * Keys whose values are replaced wherever they appear, at any depth.
 *
 * Matched case-insensitively against the key name. Substring matching is deliberate:
 * `providerToken`, `payoutProviderToken` and `token` all need to go, and enumerating
 * every future variant is a losing game. The cost is the occasional over-redaction of
 * something harmless, which is the correct direction to be wrong in.
 */
const SECRET_KEY_PATTERNS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "sessionid",
  "session_id",
  "idempotencykey",
  "providerref",
] as const;

/**
 * Keys that identify a person. Redacted in production; kept in development, where the
 * data is fake and the ability to read it is worth more than the exposure.
 *
 * `iban`, `accountNumber` and `walletAddress` are here as a backstop. They should
 * never reach the server at all — payout details are vaulted with the provider and
 * only a masked label comes back — but a log rule that assumes an upstream guarantee
 * is one provider change away from being wrong.
 */
const PII_KEY_PATTERNS = [
  "email",
  "phone",
  "whatsapp",
  "passport",
  "address",
  "iban",
  "swift",
  "accountnumber",
  "walletaddress",
  "maskeddetail",
  "name",
  "payload",
  "useragent",
] as const;

/**
 * Patterns too short to substring-match safely.
 *
 * `ip` is the whole reason this list exists: as a substring it matches `description`,
 * `recipient` and `zip`, so every one of those would be silently redacted and the log
 * would quietly lose context nobody knew it had. These match the whole key instead.
 */
const PII_EXACT_KEYS = ["ip", "ipaddress", "clientip", "remoteip"] as const;

const REDACTED = "[redacted]";

const normalise = (key: string): string => key.toLowerCase().replace(/[-_]/g, "");

const matches = (key: string, patterns: readonly string[]): boolean => {
  const normalised = normalise(key);
  return patterns.some((p) => normalised.includes(normalise(p)));
};

const matchesExact = (key: string, keys: readonly string[]): boolean =>
  keys.includes(normalise(key) as (typeof keys)[number]);

/**
 * Walk a value and replace anything sensitive.
 *
 * Handles cycles, because a logged object that references itself should produce a log
 * line rather than a stack overflow inside the logger — an error handler that throws
 * is how one bad request becomes an outage.
 */
export function redact<T>(value: T, redactPii = isProduction, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;

  if (seen.has(value as object)) return "[circular]" as unknown as T;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, redactPii, seen)) as unknown as T;
  }

  if (value instanceof Date) return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    } as unknown as T;
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (matches(key, SECRET_KEY_PATTERNS)) {
      output[key] = REDACTED;
    } else if (redactPii && (matches(key, PII_KEY_PATTERNS) || matchesExact(key, PII_EXACT_KEYS))) {
      output[key] = REDACTED;
    } else {
      output[key] = redact(item, redactPii, seen);
    }
  }
  return output as T;
}

const base = pino({
  level: isTest ? "silent" : env.LOG_LEVEL,
  // Vercel and most log aggregators parse JSON lines. Pretty printing is a local
  // convenience only, and pulling `pino-pretty` into the production bundle to get it
  // is not worth the dependency.
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  /**
   * Pino's own redaction, as a second layer. `redact()` above handles values we pass
   * deliberately; this catches the shapes that arrive by accident — a whole request
   * object logged in a hurry during an incident.
   */
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.providerToken",
      "*.idempotencyKey",
      "*.sessionToken",
    ],
    censor: REDACTED,
  },
});

export interface LogContext {
  /** Correlates every line emitted while handling one request. */
  requestId: string;
  /** Present once the session is resolved. The id, never the email. */
  userId?: string;
  partnerId?: string;
  route?: string;
  method?: string;
}

/**
 * A logger bound to one request. Every line it emits carries the correlation id, so
 * "show me everything that happened to request X" is one query rather than a guess.
 */
export function requestLogger(context: LogContext) {
  const child = base.child(redact(context));

  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      child.debug(data ? redact(data) : undefined, message),
    info: (message: string, data?: Record<string, unknown>) =>
      child.info(data ? redact(data) : undefined, message),
    warn: (message: string, data?: Record<string, unknown>) =>
      child.warn(data ? redact(data) : undefined, message),
    error: (message: string, data?: Record<string, unknown>) =>
      child.error(data ? redact(data) : undefined, message),
    /**
     * Money moved, or was refused. Written at info level with a stable `event` key so
     * these lines can be filtered into their own retention policy — they are the
     * operational half of the audit trail whose durable half is `withdrawal_event`.
     */
    audit: (event: string, data: Record<string, unknown>) =>
      child.info({ audit: true, event, ...redact(data) }, `audit:${event}`),
  };
}

export type RequestLogger = ReturnType<typeof requestLogger>;

export const logger = base;

/**
 * One line per cold start saying what this process is pointed at.
 *
 * Logged here rather than in `config.ts` because the dependency runs that way: the
 * logger needs `LOG_LEVEL` from the config, so the config cannot reach back for the
 * logger without a cycle. This module is the first thing that has both.
 *
 * Not in tests, where it would print on every file, and not in development, where the
 * answer is always localhost and the noise costs more than the line is worth. It exists
 * for the deployed environments, and specifically for the day the developer's database,
 * bucket and mail account are swapped for the client's on a site that is already live.
 * A swap that silently did not apply looks exactly like a swap that did.
 *
 * `configurationFingerprint` carries hosts and provider names only. See its docblock for
 * why every value there is either public or a `set` / `MISSING`.
 */
if (isProduction) {
  base.info({ config: configurationFingerprint() }, "configuration");
}
