"use client";

/**
 * The 404's body, split out so it can be translated.
 *
 * `not-found.tsx` has to stay a server component — it exports `metadata`, which Next
 * does not allow from a client component — but `useT` is a client hook. Splitting is the
 * only way to have both, and it costs nothing: this still server-renders, so the 404 is
 * complete in the HTML rather than appearing after hydration.
 *
 * The recovery links go through `useHref`, which fixes a second fault. They were
 * hardcoded `/`, `/universities`, `/apply`, `/contact` — so a reader who got lost on
 * `/fr/…` was offered four routes back into the English site. The page that exists to
 * recover someone was the one place that quietly changed their language.
 */

import Link from "next/link";
import { useT } from "@/i18n/context";
import { useHref } from "@/app/router";

export function NotFoundBody() {
  const t = useT();
  const href = useHref();

  /*
   * Home, directory, apply, contact — EDSAI's `ErrorScreen` recovery set, and
   * deliberately not just "go home". A hook rather than a module constant so the labels
   * reach the catalogue as literals; see the note in About.tsx.
   */
  const recovery = [
    { to: href("home"), label: t("Go to the homepage") },
    { to: href("universities"), label: t("Browse universities") },
    { to: href("apply"), label: t("Start an application") },
    { to: href("contact"), label: t("Talk to someone") },
  ];

  return (
    <main id="main" className="ct-page ct-error">
      <div className="ct-error-inner">
        <p className="ct-error-eyebrow">404</p>
        <h1 className="ct-error-title">{t("We could not find that page")}</h1>
        <p className="ct-error-body">
          {t("The address may have changed, or the link that brought you here may be out of date. Nothing is wrong with your connection, and nothing you were working on has been lost.")}
        </p>

        <nav className="ct-error-actions" aria-label={t("Where to go next")}>
          {recovery.map((item) => (
            <Link key={item.to} href={item.to} className="ct-btn">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
