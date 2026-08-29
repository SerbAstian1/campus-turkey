/**
 * The partner portal.
 *
 * Outside the `(site)` group on purpose: this is an application with its own
 * navigation, and the marketing chrome would be noise around someone's money.
 *
 * Two things happen here that do not happen anywhere else on the site — the session is
 * checked before anything renders, and the whole subtree is marked noindex.
 */

import type { Metadata } from "next";
import { DesignSystemBoundary } from "../../providers";
import { NavigationBridge } from "./NavigationBridge";

export const metadata: Metadata = {
  title: "Partner portal",
  /* Belt and braces with the `x-robots-tag` header middleware.ts sets on /portal —
     a header covers responses the crawler fetches directly, this covers the rendered
     page. A dashboard URL in a search result is a support conversation nobody needs. */
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  /* The boot screen still gates this subtree. The portal is noindex and auth-gated, so
     there is no crawler to serve here, and its screens are almost entirely design system
     components — a server-rendered version would be an empty frame. */
  return (
    <DesignSystemBoundary>
      <NavigationBridge>{children}</NavigationBridge>
    </DesignSystemBoundary>
  );
}
