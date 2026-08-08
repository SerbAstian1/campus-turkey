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

      // Strip whichever locale the URL currently carries, then re-apply the new one —
      // rather than prefixing blindly, which would turn /ar/study into /fr/ar/study.
      const { path } = splitLocale(pathname);
      router.push(localePath(path, next as Locale));
    },
    [router, pathname, locale],
  );

  return [locale.toUpperCase(), setLanguage];
}
