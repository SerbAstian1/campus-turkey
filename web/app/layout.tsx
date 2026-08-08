/**
 * Root layout.
 *
 * Owns the document shell, the base metadata and the organisation-level structured
 * data. It does **not** own the navbar, the footer or the WhatsApp bubble — those are
 * `src/app/App.tsx`, which is EDSAI Dept 7's territory and moves here unchanged during
 * the consolidation step in docs/MIGRATION.md.
 *
 * The boundary this file respects: DEVPOINT decides what the server sends and what the
 * crawler reads. What it looks like was decided already.
 */

import type { Metadata, Viewport } from "next";
import { baseMetadata, organizationJsonLd, jsonLdScript } from "@/server/lib/seo";
import { DesignSystemProvider } from "./providers";

/* Token imports resolve to /ds/tokens/*.css, which `npm run setup` copies into
   public/. Order matters: tokens before the component classes that consume them. */
import "@/styles/tokens.css";
import "@/styles/base.css";

export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom is never disabled. `maximum-scale=1` is an accessibility failure that
  // costs nothing to avoid, and EDSAI's accessibility targets are inherited, not
  // renegotiated for engineering convenience.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0A2C1E" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * No `headers()` call here, deliberately.
   *
   * Reading a header in the root layout opts *every route in the application* into
   * dynamic rendering — it has to, because the output now varies per request. That cost
   * two things at once: the whole marketing site lost static generation, and unknown
   * slugs started returning **200** instead of 404, because a streaming response has
   * already flushed its status line by the time `notFound()` runs. Measured, not
   * theorised: the response carried `Transfer-Encoding: chunked` and a 200.
   *
   * The nonce is still applied. Next reads the `content-security-policy` header that
   * middleware.ts sets and propagates the nonce to its own scripts by itself; it does
   * not need this layout to pass one. And `application/ld+json` is data, not an
   * executable script block, so CSP's `script-src` does not gate it.
   */
  return (
    <html lang="en" dir="ltr">
      <head>
        <script
          type="application/ld+json"
          // Server-rendered, escaped by `jsonLdScript`. Structured data injected after
          // hydration is not read by crawlers, so this cannot move to a client effect.
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }}
        />
      </head>
      <body>
        {/* Holds every screen back until the design system bundle has resolved.
            See providers.tsx for why that gate has to exist at all. */}
        <DesignSystemProvider>{children}</DesignSystemProvider>
      </body>
    </html>
  );
}
