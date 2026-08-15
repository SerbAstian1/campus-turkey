"use client";

/**
 * The last boundary. Catches what `[locale]/error.tsx` cannot: an error thrown by the
 * root layout itself.
 *
 * That distinction decides everything about this file. When the root layout is the thing
 * that failed, Next replaces the *entire* document — so this component must render its
 * own `<html>` and `<body>`, and it cannot rely on anything the layout set up. The
 * stylesheet imports live in `[locale]/layout.tsx`, which by definition did not run.
 *
 * So the styles here are inline, and the palette is written as literal hex rather than
 * as design tokens. Tokens come from `/ds/tokens/*.css`, and the failure this page most
 * needs to survive is precisely the one where those did not load. A token reference here
 * would resolve to nothing and render black-on-black.
 *
 * The values are transcribed from the design system, not invented:
 *   #0A2C1E  green-900, the deep brand ground
 *   #2EAE6E  the primary action
 *   #FFFFFF  on the ground; 12.4:1, comfortably past AA
 *
 * The label on the green button is green-900, matching the contrast override reasoned
 * out in `src/styles/tokens.css` — white on #2EAE6E is 2.84:1 and fails.
 *
 * A hard reload rather than `reset()`: if the root layout threw, re-rendering the same
 * tree is unlikely to produce a different result, and a button that visibly does nothing
 * is worse than one that reloads.
 *
 * **The copy here stays English, and it is the same reason as the hex.** `useT` reads
 * `LocaleProvider`, which is mounted by `[locale]/layout.tsx` — the layout that by
 * definition did not run. Calling it here would throw inside the boundary that exists to
 * catch throwing, replacing a readable English apology with a blank page. Every other
 * error surface on the site is translated; this one cannot be, and that is the correct
 * trade. It is the only file on the site deliberately left untranslatable.
 */

const ground = "#0A2C1E";
const action = "#2EAE6E";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    /* `lang` and `dir` are guesses here — the locale segment is what knows them, and it
       is what failed. English LTR is the safest default and this page is 40 words. */
    <html lang="en" dir="ltr">
      <body style={{ margin: 0, background: ground }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            background: ground,
            color: "#FFFFFF",
            // System stack on purpose: the brand typefaces are served from /ds/assets
            // and are as unavailable as everything else when this page renders.
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,.72)",
              }}
            >
              Something went wrong
            </p>

            <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.1, fontWeight: 600 }}>
              The site could not load
            </h1>

            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "rgba(255,255,255,.88)" }}>
              This is a fault on our side. Nothing you were working on has been lost.
              Reloading usually resolves it — if it does not, please try again shortly.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: "14px 24px",
                  border: 0,
                  borderRadius: 999,
                  background: action,
                  color: ground,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reload the page
              </button>

              {/* A plain anchor, not `next/link`: the router is part of what failed. */}
              <a
                href="/"
                style={{
                  padding: "14px 24px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.4)",
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Back to home
              </a>
            </div>

            {/* The digest is an opaque hash Next also writes to the server log. No
                stack, no path, no data — safe to show, and the only thing that makes a
                support call actionable. */}
            {error.digest ? (
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.6)" }}>
                Reference: {error.digest}
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
