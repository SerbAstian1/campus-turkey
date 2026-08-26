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
 * Postgres and an HTTP layer. Coverage measures them regardless — see `include` below
 * — which is why the reported figure is 24.82% and not the 99.61% a six-file allowlist
 * used to print over the same summary row. Department 21's target is ≥80% of the
 * service layer. **That target is not met**, and the number now describes the scope a
 * reader would assume it describes. That gap was audit finding M2.
 *
 * Nothing is excluded from the gate in order to make the gate pass. The threshold is
 * pinned at what the widened scope actually measures, so the figure cannot drift down
 * while nobody is watching, and the next person to add tests raises it deliberately.
 *
 * `tests/integration/` is where the missing coverage goes. It needs a disposable
 * Postgres — see docs/TESTING.md for the compose file and the four cases that matter
 * most: concurrent withdrawal admission, idempotent replay, authorization denial, and
 * the append-only trigger. Since M3 it runs on every push against a Postgres service
 * container, as a blocking job, rather than when somebody remembers to type it.
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
     * `tests/integration/` needs a live Postgres and runs under
     * `vitest.integration.config.ts`. The `tests/**` glob above would otherwise sweep it
     * into `npm test`, where the deliberately fake `DATABASE_URL` set below means every
     * one of those tests fails on connection — turning a green suite red for a reason
     * that has nothing to do with the code under test, on any machine without a database.
     */
    exclude: ["**/node_modules/**", "**/dist/**", "tests/integration/**"],

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
      /*
       * The whole service layer, not a shortlist of the parts that already pass.
       *
       * This was six files: the money path, the error taxonomy, the logger and the
       * rate limiter. They genuinely hold their thresholds — but v8 prints the
       * summary row as `All files`, so a six-file allowlist reported 99.61% and read
       * as though it described the server. The audit's M2 is that number, not the
       * tests behind it.
       *
       * Nothing under `server/modules` is excluded, including the files with no test
       * at all. An exclude list that quietly drops whatever is uncovered is the same
       * flattery in a different shape, and the point of widening this is to make the
       * gap visible in CI rather than in an audit a year later.
       *
       * The four `server/lib` files stay: they are the security and money
       * infrastructure the per-file thresholds below hold at 100%, and dropping them
       * here would retire those gates.
       */
      include: [
        "server/modules/**/*.ts",
        "server/lib/money.ts",
        "server/lib/errors.ts",
        "server/lib/logger.ts",
        "server/lib/ratelimit.ts",
      ],
      thresholds: {
        /*
         * The global floor, set at what the widened scope actually measures.
         *
         * 24.82% statements across `server/modules/**` plus the four `server/lib`
         * files. It is not a good number and it is not presented as one: eight of
         * the sixteen module directories have no test at all. It is here so the
         * figure cannot quietly fall while nobody is looking, and so the next person
         * to widen coverage raises it deliberately rather than discovering it drifted.
         *
         * Before this the include list was six hand-picked files and v8 printed
         * `All files 99.61%` over them — a true number about a scope nobody could
         * infer from the label. That gap is audit finding M2.
         *
         * Department 21's target is >=80% on the service layer. This is 24.82%. Raise
         * these as tests land; do not lower them to make a build pass.
         */
        lines: 24,
        statements: 24,
        functions: 78,
        branches: 92,

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
        /*
         * The money-writing services, at the level this pass reached.
         *
         * The orchestration around the state machines: idempotent replay, the
         * refusals that must fire before an insert, the compare-and-swap that stops
         * two reviewers confirming one commission. The uncovered remainder in each is
         * its list endpoint, which is a paginated read with no money decision in it.
         */
        "server/modules/withdrawals/withdrawals.service.ts": {
          lines: 90, functions: 70, branches: 90, statements: 90,
        },
        "server/modules/commissions/commissions.service.ts": {
          lines: 80, functions: 66, branches: 95, statements: 80,
        },
        "server/modules/wallet/wallet.service.ts": {
          lines: 100, functions: 100, branches: 100, statements: 100,
        },
      },
    },
  },
});
