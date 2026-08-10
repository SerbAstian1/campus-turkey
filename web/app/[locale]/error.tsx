"use client";

/**
 * The route-level error boundary — EDSAI's "Load Failure" state, mockup 28.
 *
 * Next renders this when a **server component throws while rendering**. Nothing covered
 * that before: `RouteBoundary` in `src/app/Shell.tsx` is a React class component inside
 * a client tree, so it catches client render errors and cannot see a server one. The
 * result was Next's own unstyled error page on a site that has a designed error screen
 * for exactly this.
 *
 * **It does not report to Sentry, and that is deliberate.** `server/lib/reporting.ts`
 * documents the gap: API errors funnel through one catch block in
 * `server/http/handler.ts` and reach Sentry; a server component that throws reaches the
 * structured log and stops there. Closing it from *here* would mean initialising the
 * browser Sentry SDK, which is the client-bundle version of the cost that file rejected
 * when it measured `instrumentation.ts` adding 263kB to the edge output. Trading a
 * bundle on every page for a report on a rare page is the wrong way round.
 *
 * What is shown instead is `digest` — the hash Next writes to the server log alongside
 * the stack. Support can quote it and the trace is findable. The proper fix, if the gap
 * ever outweighs the bundle, is `onRequestError` in `instrumentation.ts`; the cost is
 * written down in `reporting.ts` so that choice can be made knowingly.
 *
 * Deliberately plain markup on the token stylesheet, not the design system's components.
 * An error boundary that depends on the component bundle cannot render the one failure
 * most worth rendering: the bundle failing to load.
 */

import Link from "next/link";

/** The recovery routes from `ErrorScreen`'s `loadFailure` state, in its order. */
const RECOVERY = [
  { to: "/", label: "Back to home" },
  { to: "/universities", label: "Browse universities" },
  { to: "/contact", label: "Talk to someone" },
] as const;

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="ct-error">
      <div className="ct-error-inner">
        <p className="ct-error-eyebrow">Something went wrong</p>
        <h1 className="ct-error-title">This page did not load</h1>
        <p className="ct-error-body">
          The problem is on our side, not yours. Nothing you were working on has been
          lost, and trying again usually works — this kind of fault is normally brief.
        </p>

        <div className="ct-error-actions">
          {/* `reset()` re-renders the segment without a full document load, which is
              why it is first: it is the cheapest thing that fixes a transient fault. */}
          <button type="button" className="ct-error-btn" onClick={reset}>
            Try again
          </button>
          {RECOVERY.map((item) => (
            <Link key={item.to} href={item.to} className="ct-error-btn ct-error-btn--outline">
              {item.label}
            </Link>
          ))}
        </div>

        {/*
          The reference the support desk needs, and the only detail shown in production.
          `RUNBOOK.md` says to suppress the technical detail toggle in production; the
          digest is not that — it is an opaque hash Next also writes to the server log,
          carrying no stack, no path and no data.
        */}
        {error.digest ? (
          <p className="ct-error-body" style={{ fontSize: "var(--fs-micro)", opacity: 0.7 }}>
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
