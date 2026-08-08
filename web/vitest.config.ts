import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests.
 *
 * What this suite covers, and — more importantly — what it does not.
 *
 * Covered: every module that can be exercised without I/O. That is the whole domain
 * core (balance arithmetic, the withdrawal admission rule, the state machine, money
 * primitives) plus the cross-cutting rules whose correctness is a security claim
 * (error mapping, log redaction, rate-limit keying).
 *
 * NOT covered: repositories, services and route handlers, because they need a live
 * Postgres and an HTTP layer. Their coverage is 0% and the honest overall figure is
 * ~17% of lines, against Department 21's ≥80% service-layer target. **That target is
 * not met.** It is recorded as QA issue #1 rather than disguised.
 *
 * The excluded files below are excluded from the *gate*, not from the obligation. A
 * global threshold that can never pass is a threshold that gets deleted in the first
 * red build, and then nothing is gated at all. This way the gate is real for what it
 * covers, and the gap is a number in a document rather than a silence.
 *
 * `tests/integration/` is where the missing coverage goes. It needs a disposable
 * Postgres — see docs/TESTING.md for the compose file and the four cases that matter
 * most: concurrent withdrawal admission, idempotent replay, authorization denial, and
 * the append-only trigger.
 */
export default defineConfig({
  /**
   * `tsconfig.json` sets `jsx: "preserve"` because Next.js does its own JSX transform.
   * Vitest has no Next.js in front of it, so it has to be told which runtime to use —
   * without this, any module holding JSX at the top level fails with
   * "React is not defined" the moment a test imports it.
   */
  esbuild: { jsx: "automatic" },

  resolve: {
    /**
     * Mirrors the `paths` map in tsconfig.json. Vite resolves aliases longest-prefix
     * first only if they are ordered that way, unlike TypeScript — so the specific
     * entries must come before the `@/` catch-all here even though they need not there.
     */
    alias: [
      { find: /^@\/server\//, replacement: fileURLToPath(new URL("./server/", import.meta.url)) },
      { find: /^@\/app\//, replacement: fileURLToPath(new URL("./src/app/", import.meta.url)) },
      { find: /^@\/components\//, replacement: fileURLToPath(new URL("./src/components/", import.meta.url)) },
      { find: /^@\/content$/, replacement: fileURLToPath(new URL("./src/content/index.ts", import.meta.url)) },
      { find: /^@\/content\//, replacement: fileURLToPath(new URL("./src/content/", import.meta.url)) },
      { find: /^@\/ds$/, replacement: fileURLToPath(new URL("./src/ds/index.ts", import.meta.url)) },
      { find: /^@\/ds\//, replacement: fileURLToPath(new URL("./src/ds/", import.meta.url)) },
      { find: /^@\/features\//, replacement: fileURLToPath(new URL("./src/features/", import.meta.url)) },
      { find: /^@\/i18n\//, replacement: fileURLToPath(new URL("./src/i18n/", import.meta.url)) },
      { find: /^@\/motion\//, replacement: fileURLToPath(new URL("./src/motion/", import.meta.url)) },
      { find: /^@\/screens\//, replacement: fileURLToPath(new URL("./src/screens/", import.meta.url)) },
      { find: /^@\/styles\//, replacement: fileURLToPath(new URL("./src/styles/", import.meta.url)) },
      { find: /^@contracts\//, replacement: fileURLToPath(new URL("./src/content/", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) },
    ],
  },
  test: {
    /**
     * Two environments in one suite. The server is plain Node; EDSAI's frontend tests
     * render components and need a DOM. `environmentMatchGlobs` is what keeps both in a
     * single `npm test` rather than splitting the command in two, which is how one half
     * quietly stops being run.
     */
    environment: "node",
    environmentMatchGlobs: [["src/**", "jsdom"]],
    include: [
      "server/**/*.test.ts",
      "tests/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],

    /**
     * `server/lib/config.ts` validates the environment at module load and throws if it
     * is incomplete — which is what we want in production, and what makes every module
     * importing it unimportable in a test without these.
     *
     * Set here rather than in a setup file that assigns `process.env`: `NODE_ENV` is
     * typed read-only by Next's ambient types, so an assignment compiles under plain
     * `tsc` and then fails `next build`. Vitest already sets `NODE_ENV=test` itself.
     *
     * Every value is an obvious fake. The database URL points at a database that does
     * not exist; any test that would really connect is an integration test supplying
     * its own.
     */
    env: {
      DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/campus_turkey_test",
      DIRECT_DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/campus_turkey_test",
      SITE_ORIGIN: "https://test.campusturkey.invalid",
      // 32 characters, the minimum config.ts enforces. Signs nothing that leaves the
      // test process.
      SESSION_SECRET: "test-secret-not-used-for-anything-real",
      LOG_LEVEL: "fatal",
    },

    // Guarded internally so it is a no-op under the node environment — see the file.
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "server/modules/wallet/balance.ts",
        "server/modules/withdrawals/withdrawal.state.ts",
        "server/lib/money.ts",
        "server/lib/errors.ts",
        "server/lib/logger.ts",
        "server/lib/ratelimit.ts",
      ],
      thresholds: {
        // The money path and the error boundary are held at 100%. These are the
        // payment and data-exposure paths Department 21 requires at 100%, and they
        // are the files where a missed branch is a missed refusal.
        "server/modules/wallet/balance.ts": {
          lines: 100, functions: 100, branches: 100, statements: 100,
        },
        "server/modules/withdrawals/withdrawal.state.ts": {
          lines: 100, functions: 100, branches: 100, statements: 100,
        },
        "server/lib/money.ts": {
          lines: 100, functions: 100, branches: 100, statements: 100,
        },
        "server/lib/errors.ts": {
          lines: 100, functions: 100, branches: 100, statements: 100,
        },
        // Redaction and rate-limit keying carry an I/O tail (pino transport, the
        // Upstash client) that a unit test cannot reach. The pure rules are fully
        // covered; the thresholds are set at what that actually amounts to so the
        // gate fails on a regression rather than on the untestable remainder.
        "server/lib/logger.ts": {
          lines: 85, functions: 75, branches: 95, statements: 85,
        },
        "server/lib/ratelimit.ts": {
          lines: 55, functions: 50, branches: 85, statements: 55,
        },
      },
    },
  },
});
