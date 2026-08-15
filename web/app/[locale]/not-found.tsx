/**
 * The real 404.
 *
 * This file is the reason the routing migration was worth doing. Handoff note 12:
 * *"Return a real HTTP 404 status for unknown paths, not a 200 with an error page. A
 * soft 404 gets the page indexed and dilutes the site's search presence."*
 *
 * A hash-routed SPA cannot do this — every address resolves to the same 200 — so no
 * amount of client-side error handling substitutes for it. Next's `not-found.tsx`
 * carries a genuine 404 status on the response.
 *
 * The copy and the recovery routes are EDSAI's, transcribed from `ErrorScreen`'s
 * `notFound` state: home, directory, apply, contact. That state answers the same three
 * questions every error state does, in the same order — what happened, whether it is
 * the visitor's fault, and what to do next — and "go home" is deliberately not the only
 * option offered.
 *
 * The body lives in `NotFoundBody` because it needs `useT`, and this file cannot be a
 * client component: it exports `metadata`, which Next only accepts from a server one.
 */

import type { Metadata } from "next";
import { NotFoundBody } from "./NotFoundBody";

export const metadata: Metadata = {
  /*
   * English, and it is a limitation rather than an oversight. Next does not support
   * `generateMetadata` in `not-found.tsx`, and a static `metadata` export cannot reach
   * the locale or a translator. The page body is translated; only this `<title>` is not.
   */
  title: "Page not found",
  // A 404 that gets indexed is a 404 competing with real pages for the same queries.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundBody />;
}
