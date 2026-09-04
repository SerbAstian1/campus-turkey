"use client";

/**
 * The boot screen while the design system loads, the design system once it is ready.
 *
 * `children` is the design system screen, which cannot render until `_ds_bundle.js` has
 * run in a browser. `server` is the same page's text, built by a server component and
 * already present in the first response's HTML.
 *
 * **The three states are answered differently, on purpose.**
 *
 * `loading` shows the branded holding screen. This is a product decision, taken
 * deliberately and with its cost understood, and the cost is not softened by anything:
 * the status is `loading` during server rendering, so this branch is what the HTML
 * carries, and `server` — passed but not rendered — reaches no document at all. Every
 * public page therefore ships to a crawler as the logo on a green field, with correct
 * metadata attached to no content. That is the exact regression the previous version was
 * written to fix, on a site whose stated purpose is organic search.
 *
 * It is here because the client asked for the holding screen back after seeing both, and
 * that is theirs to weigh. Restoring the previous behaviour is a two-line change: return
 * `server` instead of `<BootScreen />` below.
 *
 * `failed` shows `server`, and this half was NOT reverted. When the bundle cannot be
 * fetched at all, an apology screen helps nobody; the reader gets the article, the
 * university's facts, the fee table — degraded, unstyled, and readable. A page that
 * survives its own JavaScript failing is worth more than one that explains why it did
 * not, and that is a different question from what to show for the second it is loading.
 *
 * **Hydration.** The status is `loading` on the server and on the first client render
 * alike, so both render the boot screen and hydration matches before the effect that
 * resolves the bundle swaps it. Rendering `children` optimistically and falling back
 * would invert that and produce a mismatch on every page.
 */

import type { ReactNode } from "react";
import { useDesignSystemStatus } from "@/ds/status";
import { BootScreen } from "@/app/BootScreen";

export function Hydrated({ server, children }: { server: ReactNode; children: ReactNode }) {
  const status = useDesignSystemStatus();

  if (status === "ready") return <>{children}</>;
  if (status === "failed") return <>{server}</>;
  return <BootScreen />;
}
