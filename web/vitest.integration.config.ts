import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

/**
 * Integration tests — the suite that needs a real Postgres.
 *
 * Separate from `vitest.config.ts` for one reason that is not organisational: the unit
 * config injects a **deliberately fake** `DATABASE_URL` pointing at a database that
 * does not exist, so that any unit test which would really connect fails loudly instead
 * of quietly talking to something. These tests must connect. The two cannot share a
 * config without one of them lying.
 *
 * What lives here is what `docs/TESTING.md` names as the largest open gap: the service
 * layer, whose coverage was 0%. Specifically the four behaviours that cannot be proven
 * any other way —
 *
 *   1. **Concurrent withdrawal admission.** Two requests, one balance, both admissible
 *      alone. Exactly one may win. This needs two real connections at SERIALIZABLE;
 *      PGlite is single-connection and physically cannot express the race, which is why
 *      it stayed unexecuted through every previous pass.
 *   2. **Idempotent replay.** The same key twice returns the original row rather than
 *      creating a second withdrawal.
 *   3. **Authorization denial.** The state machine refuses a `PARTNER` actor even when
 *      called directly, beneath the route guard.
 *   4. **The append-only trigger**, against a real Postgres rather than WASM.
 *
 * Run with `npm run test:integration`. It is not part of `npm test` and not part of the
 * CI gate — a suite that needs a live database would make the gate fail for reasons
 * that have nothing to do with the commit. Run it against a branch database before a
 * release; see docs/TESTING.md.
 *
 * **These tests write to whatever `DATABASE_URL` points at.** Every fixture is created
 * under a per-run namespace and torn down afterwards, but point this at a branch or a
 * throwaway database, never at production.
 */

const envPath = fileURLToPath(new URL("./.env", import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error(
    "Integration tests need a real DATABASE_URL. Put one in .env or pass it in the environment.",
  );
}

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: /^@\/server\//, replacement: fileURLToPath(new URL("./server/", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],

    /**
     * One file at a time, and no concurrency *between* files.
     *
     * The tests share one database. Two files creating fixtures simultaneously would
     * produce cross-talk that looks exactly like a serialization failure — which is the
     * thing one of these tests exists to detect, so a false positive there would be
     * worse than useless. Concurrency *inside* a test is created explicitly, with
     * `Promise.all`, where it is the subject rather than an accident.
     */
    fileParallelism: false,
    sequence: { concurrent: false },

    /** Neon's compute suspends when idle; the first connection of a run wakes it. */
    testTimeout: 60_000,
    hookTimeout: 60_000,

    env: {
      DATABASE_URL: databaseUrl,
      DIRECT_DATABASE_URL: process.env["DIRECT_DATABASE_URL"] ?? databaseUrl,
      SITE_ORIGIN: "https://test.campusturkey.invalid",
      SESSION_SECRET: "test-secret-not-used-for-anything-real",
      LOG_LEVEL: "fatal",
    },
  },
});
