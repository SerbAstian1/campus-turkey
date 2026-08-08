"use client";

/**
 * The locale and its messages, made available to client components.
 *
 * Every screen is a client component (the design system is a UMD bundle reading a
 * global React — see app/providers.tsx), so the catalogue has to reach them somehow.
 * A server component renders this provider with the locale's messages already loaded,
 * and the tree below reads them from context.
 *
 * That is the whole mechanism. There is no fetching, no effect and no loading state:
 * the strings arrive in the server's HTML alongside the markup they belong to, which is
 * the point — a crawler and a reader both see translated text in the first response.
 */

import { createContext, useContext, useMemo } from "react";
import { createTranslator, type Messages, type Translator } from "./messages";
import { DEFAULT_LOCALE, type Locale } from "./locales";

interface LocaleContextValue {
  locale: Locale;
  t: Translator;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: (english: string) => english,
});

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(messages) }),
    [locale, messages],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * The translator for the current locale.
 *
 * Named `useT` rather than `useTranslation` so the call site reads as
 * `const t = useT()` and then `t("Apply now")` — short enough that wrapping a string is
 * not a reason to avoid wrapping it.
 */
export function useT(): Translator {
  return useContext(LocaleContext).t;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
