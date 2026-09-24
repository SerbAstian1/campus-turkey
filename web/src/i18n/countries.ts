"use client";

/**
 * Countries offered by every public registration form.
 *
 * Keep ISO codes here rather than translated names. `Intl.DisplayNames` supplies the
 * visitor-facing name in the active site language, while the English display name is
 * stored for staff. This avoids maintaining seventeen copies of a two-hundred-country
 * list and prevents one registration path quietly having fewer countries than another.
 */

import { useMemo } from "react";
import { BCP47, type Locale } from "./locales";
import { useLocale } from "./context";
import type { TranslatedOptions } from "./options";

export const COUNTRY_CODES = [
  "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI",
  "CV", "KH", "CM", "CA", "CF", "TD", "CL", "CN", "CO", "KM", "CG", "CD", "CR", "CI", "HR", "CU", "CY", "CZ",
  "DK", "DJ", "DM", "DO",
  "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET",
  "FJ", "FI", "FR",
  "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY",
  "HT", "HN", "HU",
  "IS", "IN", "ID", "IR", "IQ", "IE", "IL", "IT",
  "JM", "JP", "JO",
  "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "XK",
  "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU",
  "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ", "MM",
  "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO",
  "OM",
  "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PL", "PT",
  "QA",
  "RO", "RU", "RW",
  "KN", "LC", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SK", "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD", "SR", "SE", "CH", "SY",
  "TW", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TM", "TV",
  "UG", "UA", "AE", "GB", "US", "UY", "UZ",
  "VU", "VA", "VE", "VN",
  "EH", "YE", "ZM", "ZW",
] as const;

function regionName(displayNames: Intl.DisplayNames, code: string): string {
  return displayNames.of(code) ?? code;
}

/** Pure counterpart used by the hook and by coverage tests. */
export function countryOptions(locale: Locale): TranslatedOptions {
  const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
  const localNames = new Intl.DisplayNames([BCP47[locale]], { type: "region" });
  const collator = new Intl.Collator(BCP47[locale], { sensitivity: "base" });

  const entries = COUNTRY_CODES.map((code) => ({
    english: regionName(englishNames, code),
    label: regionName(localNames, code),
  })).sort((left, right) => collator.compare(left.label, right.label));

  const backwards = new Map(entries.map(({ label, english }) => [label, english]));
  const forwards = new Map(entries.map(({ english, label }) => [english, label]));

  return {
    options: entries.map(({ label }) => label),
    display: (english: string) => (english === "" ? "" : (forwards.get(english) ?? english)),
    toEnglish: (label: string) => backwards.get(label) ?? "",
  };
}

export function useCountryOptions(): TranslatedOptions {
  const locale = useLocale();
  return useMemo(() => countryOptions(locale), [locale]);
}
