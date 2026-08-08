/**
 * Next.js configuration.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
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
   * `app/src` is EDSAI's territory and currently lives in the sibling `app/` workspace.
   * Until the consolidation step in docs/MIGRATION.md moves it here, Next has to be
   * told it may compile files from outside its own root.
   */
  outputFileTracingRoot: new URL("../", import.meta.url).pathname,

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
     * What *can* be redirected is the old flat shape, and the singular/plural drift
     * between the prototype's `#/university/:slug` and the contract's `/universities/
     * :slug`. 308 preserves the method and tells search engines the move is permanent.
     */
    return [
      { source: "/university/:slug", destination: "/universities/:slug", permanent: true },
      { source: "/service/:slug", destination: "/services/:slug", permanent: true },
      { source: "/blog/:slug", destination: "/resources/:slug", permanent: true },
      { source: "/institution/:slug", destination: "/institutions/:slug", permanent: true },
    ];
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
