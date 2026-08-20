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

/**
 * The datasource URL, with `pool_timeout` reconciled against `connect_timeout`.
 *
 * **These two settle a race, and by default they settle it wrongly.** `connect_timeout`
 * is how long Prisma will wait for a *new TCP connection* to the database;
 * `pool_timeout` is how long a query will wait for the pool to *hand it* a connection.
 * Prisma defaults the second to 10 seconds regardless of the first, so a URL that raises
 * `connect_timeout` to 30 — as this one does, deliberately, for a serverless database
 * that suspends when idle — leaves every query giving up at 10 while the connection it
 * is waiting for is still legitimately being established.
 *
 * The symptom is specific and misleading: the first request after an idle period returns
 * 500 with "Timed out fetching a new connection from the connection pool", the next one
 * succeeds, and by the third everything is fast. On the directory that surfaced as "We
 * could not load the directory" on a cold load and nothing at all on a refresh, which
 * reads like a flaky network rather than a setting.
 *
 * Raising `pool_timeout` is not the same trade as raising `connection_limit`. The limit
 * governs how many connections exist at once, and on serverless that number multiplies
 * across every warm instance — which is why the build caps its concurrency instead. This
 * only governs how long a query is willing to queue for one that already exists, so it
 * costs nothing in connections and turns a failed cold start into a slow one.
 *
 * An explicit `pool_timeout` in the URL is left alone: an operator who set it meant it.
 */
export function datasourceUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // Not a shape we can reason about — hand it back untouched rather than guess.
    return raw;
  }

  if (url.searchParams.has("pool_timeout")) return raw;

  // Prisma's own defaults, so the arithmetic below is the same one it would do.
  const connect = Number(url.searchParams.get("connect_timeout") ?? 5);
  const DEFAULT_POOL_TIMEOUT = 10;
  if (!Number.isFinite(connect) || connect <= DEFAULT_POOL_TIMEOUT) return raw;

  // A margin over `connect_timeout`, so a query outlives the connection attempt it is
  // queued behind rather than expiring one tick before it lands.
  url.searchParams.set("pool_timeout", String(connect + 5));
  return url.toString();
}

function create(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" },
      ...(isProduction ? [] : [{ emit: "event" as const, level: "query" as const }]),
    ],
    datasources: { db: { url: datasourceUrl(env.DATABASE_URL) } },
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

/**
 * Prisma error codes that mean "the database was not reachable just then", as opposed to
 * "the query was wrong".
 *
 * P1001 is a refused or unroutable connection, P1008 a connection timeout, P1017 a
 * server that closed the connection, and P2024 a query that waited out the pool. Every
 * one of them is a statement about the moment rather than about the request, which is why
 * repeating the request is a reasonable answer to them and would not be to anything else.
 */
const TRANSIENT_CONNECTION_CODES = new Set(["P1001", "P1008", "P1017", "P2024"]);

export function isTransientConnectionError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && TRANSIENT_CONNECTION_CODES.has(code);
}

/**
 * Run a read again when the database was merely unreachable.
 *
 * **Reads only, and deliberately not wired into the client itself.** A write that fails
 * with a connection error may still have committed — the connection can drop after the
 * server has applied it — so retrying one risks doing it twice. A `findMany` has no such
 * hazard, and the callers here are all `SELECT`s.
 *
 * The delays double from half a second, which is shaped to Neon rather than chosen for
 * neatness: its compute suspends when idle and a cold start is seconds, not milliseconds,
 * so the first retry usually lands while the instance is still waking and the third lands
 * after it has. Five attempts spans about fifteen seconds in total.
 */
export async function withTransientRetry<T>(
  run: () => Promise<T>,
  { attempts = 5, label = "query" }: { attempts?: number; label?: string } = {},
): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!isTransientConnectionError(error)) throw error;
      last = error;
      if (attempt === attempts) break;
      const wait = 500 * 2 ** (attempt - 1);
      logger.warn(
        { err: error, attempt, attempts, wait, label },
        "database unreachable, retrying",
      );
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw last;
}
