"use client";

/**
 * Changing language.
 *
 * The whole job is one sentence: switching to Arabic from
 * `/universities/bilkent-university` must land on the Arabic version of *that page*,
 * not on the Arabic homepage. Sending people to the homepage is the most common way a
 * language switcher wastes the click that was meant to help them.
 *
 * The switcher speaks the design system's uppercase codes (`"AR"`); URLs use lowercase
 * (`/ar/...`). The conversion happens here and nowhere else.
 */

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "./context";
import { isLocale, localePath, splitLocale, type Locale } from "./locales";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "./detect";

/**
 * `[currentCode, setLanguage]`, matching the shape `LanguageSwitcher` already expects
 * from the old `useLanguage`, so the navbar, footer and portal sidebar did not change.
 */
export function useLocaleSwitch(): [string, (code: string) => void] {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const locale = useLocale();

  const setLanguage = useCallback(
    (code: string) => {
      const next = code.toLowerCase();
      if (!isLocale(next) || next === locale) return;

      /*
       * Record the choice before navigating.
       *
       * This is what makes the selection survive a refresh, a return visit and an
       * arrival on an unprefixed URL: `detectLocale` reads this cookie ahead of
       * `Accept-Language`, so an explicit choice is never overridden by a guess about
       * the browser. Written here rather than server-side because this is the only
       * place a *deliberate* selection happens — the middleware records header-derived
       * guesses separately, and conflating the two would let a guess masquerade as a
       * decision.
       *
       * No secret, and readable by the middleware, so `httpOnly` would buy nothing and
       * cost the client the ability to keep it in step.
       */
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;

      // Strip whichever locale the URL currently carries, then re-apply the new one —
      // rather than prefixing blindly, which would turn /ar/study into /fr/ar/study.
      const { path } = splitLocale(pathname);
      router.push(localePath(path, next as Locale));
    },
    [router, pathname, locale],
  );

  return [locale.toUpperCase(), setLanguage];
}
