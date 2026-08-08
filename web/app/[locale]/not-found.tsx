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
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  // A 404 that gets indexed is a 404 competing with real pages for the same queries.
  robots: { index: false, follow: true },
};

const RECOVERY = [
  { to: "/", label: "Go to the homepage" },
  { to: "/universities", label: "Browse universities" },
  { to: "/apply", label: "Start an application" },
  { to: "/contact", label: "Talk to someone" },
] as const;

export default function NotFound() {
  return (
    <main id="main" className="ct-page ct-error">
      <div className="ct-error-inner">
        <p className="ct-error-eyebrow">404</p>
        <h1 className="ct-error-title">We could not find that page</h1>
        <p className="ct-error-body">
          The address may have changed, or the link that brought you here may be out of
          date. Nothing is wrong with your connection, and nothing you were working on
          has been lost.
        </p>

        <nav className="ct-error-actions" aria-label="Where to go next">
          {RECOVERY.map((item) => (
            <Link key={item.to} href={item.to} className="ct-btn">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
