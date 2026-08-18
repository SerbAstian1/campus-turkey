/**
 * Next.js configuration.
 *
 * TypeScript rather than `.mjs`, for one concrete reason: `redirects()` reads the route
 * table in `src/app/moved-routes.ts`, and a `.mjs` config cannot import a `.ts` module.
 * The alternative was keeping the same list in two files and trusting them to stay in
 * step — which is exactly how a redirect gets deleted from one place and left in the
 * other.
 */

import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { MOVED_ROUTES } from "./src/app/moved-routes";
import { LOCALES, DEFAULT_LOCALE } from "./src/i18n/locales";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Type and lint errors block the build.
   *
   * Both of these default to blocking; they are stated explicitly because the common
   * "fix" for a red build is to set them to `true`, and a future engineer should have
   * to delete a comment saying why not.
   */
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  /** The `x-powered-by: Next.js` header tells an attacker what to look up. */
  poweredByHeader: false,

  /**
   * Trailing-slash behaviour is a canonicalisation decision, not a style one: serving
   * both `/study` and `/study/` splits link equity between two URLs. Off, matching the
   * paths the frontend contract already uses in `NavLink.to`.
   */
  trailingSlash: false,

  /**
   * **Currently inert, and that is worth stating rather than discovering.**
   *
   * These options govern `next/image` only, and nothing in this application uses it.
   * The brand marks are rendered by the design system bundle, which is a classic script
   * outside React's control, and the three decorative images the app owns are absolutely
   * positioned backgrounds that `next/image` would complicate for no measured gain.
   *
   * The reason it stays is that the underlying problem is already solved by other means.
   * Handoff note 4 measured ~900KB of decorative raster on the critical path; the
   * delivery variants in `assets/` brought that to a 31KB map and a 25KB mark, which is
   * below where format negotiation would repay its complexity. Left in place so that the
   * first component to adopt `next/image` inherits the right sizes rather than Next's
   * defaults — the `220` and `440` entries exist because those are the widths the mark
   * and the lockup are actually displayed at.
   *
   * If nothing has adopted it by the next performance pass, delete this block. Config
   * that reads as a solved problem while doing nothing is worse than no config.
   */
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 220, 256, 440],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  /**
   * `web/` is self-contained and has its own lockfile. Without this, Next walks up,
   * finds the root workspace lockfile too, and guesses — which it warns about on every
   * build and which would trace the wrong files into a deployment bundle.
   */
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),

  experimental: {
    // The design system bundle is a classic script that reads a global `React`. Keeping
    // server components' payload small matters more than usual here because that bundle
    // is already on the critical path.
    optimizePackageImports: ["lucide-react"],

    /**
     * Build concurrency, capped to what one Prisma pool can serve.
     *
     * This build renders 680 pages — forty universities in seventeen locales — and Next
     * renders them in parallel across workers. Every one of them opens onto the same
     * `DATABASE_URL`, whose pooled Neon endpoint is capped at `connection_limit=10`, so
     * the default fan-out asks for far more connections than exist and the build dies
     * with "Timed out fetching a new connection from the connection pool".
     *
     * **Capping the build rather than raising the pool is deliberate.** The detail page
     * already documents what happened when the limit was raised instead: 25 got the
     * build further and then Neon's pooler refused connections outright (P1001). More
     * importantly `DATABASE_URL` is not build-only — the serving runtime reads the same
     * string, and on serverless each instance opens its own pool, so a bigger number
     * multiplies across every concurrently warm function. Raising it trades a loud,
     * reproducible build failure for an intermittent production one, which is the wrong
     * direction on both counts.
     *
     * These two knobs are build-only and cost nothing at runtime. A build that takes a
     * few minutes longer once per deploy is not a cost worth weighing against that.
     * Only `staticGenerationMaxConcurrency`, which bounds the pages a worker renders at
     * once. Pairing it with `experimental.cpus` was tried first and breaks this build
     * outright — Next fails collecting page data with `Cannot find module for page:
     * /_document` — so the worker count is left alone and the per-worker concurrency
     * does the work. 2 leaves headroom for the pages that issue several queries in
     * parallel, such as the directory's facet counts.
     */
    staticGenerationMaxConcurrency: 2,
  },

  async redirects() {
    /**
     * The prototype published hash routes. A hash never reaches the server, so these
     * cannot be redirected server-side — the rewrite happens client-side in the root
     * layout, which reads `location.hash` on first paint and replaces the URL.
     *
     * What *can* be redirected is every address that has moved since, and
     * `MOVED_ROUTES` is the single list of those. Each entry is emitted twice: once
     * unprefixed for English, and once as `/:locale/...` for the other sixteen.
     *
     * The locale form is the half that was missing. An English visitor following an old
     * link was redirected; an Arabic visitor following `/ar/university/itu` got a 404,
     * because the redirect matched `/university/:slug` and nothing else. Sixteen
     * languages of broken inbound links, invisible from an English browser.
     *
     * One `/:locale/...` pattern rather than sixteen copies, with the locale constrained
     * by an alternation built from `LOCALES` itself. The constraint is load-bearing:
     * unconstrained, `/:locale/blog` matches `/resources/blog` and redirects it into a
     * loop. Built from the list rather than typed out, so adding a language adds its
     * redirects.
     */
    const localePattern = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).join("|");

    return MOVED_ROUTES.flatMap(({ from, to }) => [
      { source: from, destination: to, permanent: true },
      {
        source: `/:locale(${localePattern})${from}`,
        destination: `/:locale${to}`,
        permanent: true,
      },
    ]);
  },

  async headers() {
    return [
      {
        // Fingerprinted build output is immutable by construction — a change produces
        // a new filename — so it can be cached for a year without a revalidation cost.
        source: "/_next/static/:path*",
        headers: [{ key: "cache-control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Brand artwork and the design system bundle are not fingerprinted (they are
        // copied by `npm run setup`), so they get a day with revalidation rather than
        // a year. Long enough to matter, short enough that a brand fix lands.
        source: "/:path(assets|ds|site)/:file*",
        headers: [{ key: "cache-control", value: "public, max-age=86400, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
