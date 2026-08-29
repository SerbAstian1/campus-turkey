"use client";

/**
 * Server-rendered content first, the design system over the top of it.
 *
 * `server` is built by a server component and arrives already rendered, so it is in the
 * HTML the first response carries. `children` is the design system screen, which cannot
 * render until `_ds_bundle.js` has run in a browser. This swaps one for the other.
 *
 * **Hydration.** The status is `loading` on the server and on the first client render
 * alike, so the first thing React renders in the browser is the same `server` tree the
 * HTML already holds. The swap happens in the effect that resolves the bundle, which is
 * after hydration has matched. Rendering `children` optimistically and falling back
 * would invert that and produce a mismatch on every page.
 *
 * **`failed` shows the server content too, and that is the useful part.** When the
 * bundle cannot be fetched the reader previously got an apology screen. Now they get
 * the article, the university's facts, the fee table: degraded, unstyled by the design
 * system, and readable. A page that survives its own JavaScript failing is worth more
 * than one that explains why it did not.
 */

import type { ReactNode } from "react";
import { useDesignSystemStatus } from "@/ds/status";

export function Hydrated({ server, children }: { server: ReactNode; children: ReactNode }) {
  const status = useDesignSystemStatus();

  return <>{status === "ready" ? children : server}</>;
}
