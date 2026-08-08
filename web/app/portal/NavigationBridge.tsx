"use client";

/**
 * Parks the router for the portal subtree.
 *
 * The site chrome does this as part of `Shell`, but the portal deliberately does not
 * render the chrome — so without this, `go()` inside the portal would fall back to a
 * full document load on every navigation. Same bridge, no navbar.
 */

import { useNavigationBridge, usePlaceholderLinks } from "@/app/router";

export function NavigationBridge({ children }: { children: React.ReactNode }) {
  useNavigationBridge();
  usePlaceholderLinks();
  return <>{children}</>;
}
