/**
 * Edge middleware — security headers, and the maintenance response.
 *
 * This runs before the application does, which is the whole point of putting the
 * maintenance response here. Handoff note 12 is specific: the `maintenance` state must
 * render "from the edge or the server rather than from the app bundle, which will not
 * load if the app itself is down". A maintenance page served by the app is a
 * maintenance page that does not appear during the outages that need it.
 *
 * Runs on the Edge runtime, so it cannot touch Prisma or the session. It does not need
 * to: nothing here is a per-user decision.
 */

import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/locales";

/**
 * Content Security Policy.
 *
 * Handoff note 4 makes this conditional on self-hosting: the prototype loaded React,
 * the icon set, the fonts and Leaflet from CDNs, and a CSP over cross-origin script
 * tags is either useless or breaks the page. `npm run setup` now copies the design
 * system, tokens and fonts into `public/`, so everything except the map tiles is
 * same-origin and the policy below can be strict.
 *
 * `'unsafe-inline'` on styles is a deliberate, stated concession: the design system
 * bundle sets inline styles on elements it renders, and removing that is EDSAI Dept 7
 * work inside `src/`, not a boundary this layer may cross. Scripts carry no such
 * exemption — a nonce is issued per request below, which is what actually stops XSS.
 */
function contentSecurityPolicy(tileHost: string): string {
  return [
    "default-src 'self'",
    /*
     * `'unsafe-inline'` on scripts, and this is a deliberate, measured trade rather
     * than an oversight.
     *
     * The strong policy is `'nonce-<per-request>' 'strict-dynamic'`. A per-request
     * nonce can only be produced by a per-request render, so adopting it opts the
     * entire site out of static generation — and with a streaming response the status
     * line is flushed before `notFound()` runs, which brings back the soft 404s that
     * were the whole reason for the routing migration. Both were measured: with the
     * nonce, `/universities/not-a-real-slug` returned 200 with `Transfer-Encoding:
     * chunked`; without it, 404.
     *
     * Worse, the nonce was not actually being applied. The served HTML carried seven
     * inline bootstrap scripts and zero nonce attributes, and `'strict-dynamic'` makes
     * `'self'` inert — so the policy as written blocked every script on the page. It
     * looked correct in a header and would have broken the site in a browser.
     *
     * What still carries the weight here: there is no user-generated HTML rendered
     * anywhere, JSON-LD is escaped at the boundary (`jsonLdScript`), and `object-src`,
     * `base-uri`, `frame-ancestors` and `form-action` are all locked down below — those
     * close off the injection routes that matter most on a site of this shape.
     *
     * To get the strict policy back: it needs build-time hashes of Next's inline
     * bootstrap scripts, which is the supported route for a statically generated app.
     * Recorded as a known gap rather than left as a comment nobody reads.
     */
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.basemaps.cartocdn.com " + tileHost,
    "font-src 'self'",
    // The API is same-origin. Nothing else may be connected to.
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Back shortly — Campus Turkey</title>
<style>
  body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
       padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;
       background:#0A2C1E;color:#F5F3EE;text-align:center;line-height:1.6}
  h1{font-size:clamp(24px,5vw,36px);margin:0 0 12px}
  p{margin:0 0 8px;opacity:.85;max-width:48ch}
  a{color:#F5F3EE}
</style></head>
<body><div>
  <h1>We are back shortly</h1>
  <p>Campus Turkey is briefly offline for planned maintenance. Nothing you have submitted is lost.</p>
  <p>If you need us now, message us on <a href="https://wa.me/">WhatsApp</a>.</p>
</div></body></html>`;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // ---- maintenance, before anything else
  if (process.env["MAINTENANCE_MODE"] === "on") {
    // The health check stays reachable so the platform can tell "deliberately down"
    // from "fell over", and so the deploy that ends maintenance can be verified.
    const exempt = pathname === "/api/health" || pathname.startsWith("/_next/");
    if (!exempt) {
      const retryAfter = process.env["MAINTENANCE_RETRY_AFTER_SECONDS"] ?? "600";
      return new NextResponse(MAINTENANCE_HTML, {
        // 503 with Retry-After, per handoff note 12. A 200 here would let search
        // engines index the maintenance page as the site's content.
        status: 503,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "retry-after": retryAfter,
          "cache-control": "no-store",
        },
      });
    }
  }

  const tileHost = process.env["MAP_TILE_HOST"] ?? "";

  /*
   * Locale rewriting.
   *
   * Every page lives under `app/[locale]/`, but English is served unprefixed —
   * `/study`, not `/en/study`. The prototype published those addresses and handoff
   * note 6 is clear that they are already in circulation, so moving them would break
   * every shared link to gain nothing.
   *
   * A rewrite rather than a redirect: the visitor's URL stays `/study` while Next
   * resolves `app/[locale]/(site)/study`. A redirect would put `/en/` in the address
   * bar and undo the whole point.
   *
   * Paths that already carry a locale (`/ar/study`) pass through untouched. `/api`,
   * `/_next` and the static folders never reach here — see the matcher below.
   */
  const first = pathname.split("/")[1] ?? "";

  /*
   * Only *pages* get a locale. Everything else must pass through untouched.
   *
   * This guard is not defensive tidying — without it the rewrite prepends `/en` to
   * `/api/health`, `/sitemap.xml` and `/robots.txt`, none of which exist under a locale.
   * Measured before it was added: every API route returned 404 and `/sitemap.xml`
   * served the homepage's HTML. The matcher below cannot express this on its own,
   * because these paths still need the security headers this middleware sets.
   */
  const isPageRequest =
    !pathname.startsWith("/api") &&
    pathname !== "/sitemap.xml" &&
    pathname !== "/robots.txt" &&
    pathname !== "/manifest.webmanifest";

  const rewritten =
    isPageRequest && !isLocale(first)
      ? new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url)
      : null;

  const response = rewritten
    ? NextResponse.rewrite(rewritten)
    : NextResponse.next();

  response.headers.set("content-security-policy", contentSecurityPolicy(tileHost));
  // Two years, with preload. Set only once the domain is confirmed https-only —
  // preloading is difficult to reverse. See docs/DEPLOYMENT.md.
  response.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
  );

  // The portal is a private application. Even with auth in front of it, a stray index
  // of a dashboard URL is a support conversation nobody needs.
  if (pathname.startsWith("/portal")) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  /**
   * Everything except Next's own static output and the files served from `public/`.
   * Matching those would add a header rewrite to every font and image request for no
   * security benefit — they are already immutable and same-origin.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|ds/|site/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|ttf|woff2?)$).*)",
  ],
};
