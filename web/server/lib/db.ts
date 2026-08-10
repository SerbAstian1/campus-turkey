/**
 * The Prisma client, and the transaction helper the money path runs inside.
 *
 * This is the only module permitted to construct a `PrismaClient`. Repositories import
 * `db` from here; nothing else in the codebase imports `@prisma/client` for anything
 * but its generated types.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { env, isProduction } from "./config";
import { logger } from "./logger";
import { ConflictError } from "./errors";

/**
 * Next.js keeps modules alive across hot reloads in development, so a plain `new
 * PrismaClient()` at module scope creates one client per reload and exhausts the
 * connection limit within a few minutes of editing. Stashing it on `globalThis` is the
 * documented workaround.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" },
      ...(isProduction ? [] : [{ emit: "event" as const, level: "query" as const }]),
    ],
    datasources: { db: { url: env.DATABASE_URL } },
  });

  client.$on("warn" as never, (e: Prisma.LogEvent) => logger.warn({ prisma: e }, "prisma warning"));
  client.$on("error" as never, (e: Prisma.LogEvent) => logger.error({ prisma: e }, "prisma error"));

  return client;
}

export const db: PrismaClient = globalForPrisma.prisma ?? create();

if (!isProduction) globalForPrisma.prisma = db;

/**
 * The type a repository function accepts so it can run either standalone or inside a
 * transaction. Every repository method takes this rather than importing `db` directly,
 * which is what makes the withdrawal path able to compose reads and writes atomically.
 */
export type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Run `fn` inside a SERIALIZABLE transaction, retrying on serialisation failure.
 *
 * Isolation level, and why it is the strictest one:
 *
 *   The withdrawal admission rule reads a set of rows (a partner's commissions and
 *   withdrawals), computes an aggregate over them, and writes a row that changes that
 *   aggregate. That is a write skew: under READ COMMITTED, two concurrent requests can
 *   each read the same $400 balance, each decide $400 is affordable, and each insert —
 *   producing $800 of withdrawals against $400 of commissions. Neither transaction
 *   sees the other's row, so no unique constraint is violated and nothing complains.
 *
 *   Postgres SERIALIZABLE detects exactly this pattern and aborts one of the two with
 *   SQLSTATE 40001. The loser is retried here, re-reads the now-smaller balance, and
 *   is correctly refused.
 *
 *   `SELECT ... FOR UPDATE` on the partner row (as BACKEND-PLAN.md proposed) would also
 *   work and is cheaper. SERIALIZABLE is chosen because it is correct without anyone
 *   having to remember to take the lock — the next engineer adding a second write path
 *   against the same balance inherits the guarantee instead of having to know about it.
 *   The cost is retries under contention, and contention on a single partner's balance
 *   is not a load pattern this system will see: it is one human pressing one button.
 *
 * Retries are bounded and only for 40001/40P01. Anything else propagates immediately —
 * retrying an unknown failure against a money path is how one bug becomes several.
 *
 * When the budget *is* spent on a genuine conflict, the caller gets a `ConflictError`
 * rather than the raw Prisma error. That distinction is the difference between a 409
 * telling a partner to press the button again and a 500 telling them nothing, and the
 * integration suite caught it as exactly that: under Neon's round-trip latency the
 * collision window is wide enough that three attempts occasionally all lose, and the
 * loser escaped as `PrismaClientKnownRequestError`. A serialisation failure is by
 * definition transient and by definition the current state refusing the request, which
 * is what a 409 means — propagating it as an unhandled error says "the server is
 * broken" about a database doing precisely its job.
 */
/**
 * True when Postgres aborted the transaction for contention rather than for a fault.
 *
 * P2034 is Prisma's wrapper for "transaction failed due to a write conflict or a
 * deadlock". 40001 is serialisation failure, 40P01 deadlock detected.
 */
export function isSerialisationConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const pgCode = error.meta?.["code"] as string | undefined;
  return error.code === "P2034" || pgCode === "40001" || pgCode === "40P01";
}

/**
 * What to do about a failed attempt.
 *
 * Pure, exported and separately tested, because it is the part with the decisions in it
 * and the part around it needs two live connections to exercise at all. The integration
 * suite proved the `exhausted` branch existed by hitting it; this is what pins the
 * behaviour without waiting for a race to happen to lose three times.
 */
export type RetryDecision = "retry" | "exhausted" | "propagate";

export function retryDecision(
  error: unknown,
  attempt: number,
  maxAttempts: number,
): RetryDecision {
  if (!isSerialisationConflict(error)) return "propagate";
  return attempt >= maxAttempts ? "exhausted" : "retry";
}

/** Full jitter. Two transactions that back off by the same fixed amount collide again. */
export function retryBackoffMs(attempt: number): number {
  return Math.random() * 25 * 2 ** (attempt - 1);
}

export async function serializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: { maxAttempts?: number; timeoutMs?: number } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const timeout = options.timeoutMs ?? 10_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout,
        maxWait: 5_000,
      });
    } catch (error) {
      const decision = retryDecision(error, attempt, maxAttempts);

      if (decision === "propagate") throw error;

      if (decision === "exhausted") {
        logger.warn(
          { attempt, maxAttempts },
          "serialisable transaction still conflicting after the last attempt",
        );
        throw new ConflictError(
          "write_conflict",
          "Another change to this account was in progress. Please try that again.",
        );
      }

      const backoff = retryBackoffMs(attempt);
      logger.warn(
        { attempt, maxAttempts, backoffMs: Math.round(backoff) },
        "serialisable transaction conflicted, retrying",
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  // Unreachable: the loop either returns, or the last attempt throws above. Thrown
  // rather than left implicit so a future edit to the loop bounds cannot fall out of
  // the function having silently done nothing.
  throw new ConflictError(
    "write_conflict",
    "Another change to this account was in progress. Please try that again.",
  );
}

/** True when the error is Postgres rejecting a duplicate on a unique constraint. */
export function isUniqueViolation(error: unknown, target?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  if (!target) return true;
  const fields = error.meta?.["target"];
  return Array.isArray(fields) ? fields.includes(target) : fields === target;
}

export { Prisma };
