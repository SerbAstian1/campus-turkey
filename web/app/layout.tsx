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
import { headers } from "next/headers";
import { baseMetadata, organizationJsonLd, jsonLdScript } from "@/server/lib/seo";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The per-request CSP nonce, set by middleware.ts. Any inline script must carry it
  // or the browser refuses to run it — which is the entire value of the policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" dir="ltr">
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          // Server-rendered, escaped by `jsonLdScript`. Structured data injected after
          // hydration is not read by crawlers, so this cannot move to a client effect.
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
