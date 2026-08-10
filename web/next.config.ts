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

  images: {
    // Handoff note 4, measured: ~900KB of decorative raster on the critical path.
    // AVIF first, WebP fallback, and the loader generates variants at the sizes the
    // brand marks are actually displayed at rather than their 6477px source.
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
