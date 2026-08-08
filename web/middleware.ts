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
function contentSecurityPolicy(nonce: string, tileHost: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
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

  // A fresh nonce per request. Reusing one across requests makes it a constant, and a
  // constant nonce is not a nonce.
  const nonce = btoa(crypto.randomUUID());
  const tileHost = process.env["MAP_TILE_HOST"] ?? "";

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers } });

  response.headers.set("content-security-policy", contentSecurityPolicy(nonce, tileHost));
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
