/**
 * Money.
 *
 * Every amount in this system is an integer count of minor units — cents, kuruş,
 * kobo. There is no float arithmetic anywhere on a monetary value, and no string
 * parsing of one outside `parseMinor`.
 *
 * This module has no dependencies and no I/O. It is the bottom of the dependency
 * graph and everything above it may import it.
 */

/** ISO 4217: three uppercase letters. Matches the CHECK constraint on the database. */
const ISO_4217 = /^[A-Z]{3}$/;

/**
 * Postgres `integer` ceiling. A single row cannot exceed this, so neither can any
 * amount we accept. At two decimal places that is 21,474,836.47 — orders of magnitude
 * above any single commission or withdrawal this business will see, and low enough to
 * make an absurd request fail loudly at the boundary rather than silently wrap.
 */
export const MAX_MINOR = 2_147_483_647;

export function isValidCurrency(code: string): boolean {
  return ISO_4217.test(code);
}

/**
 * A safe integer minor-unit amount. Rejects floats, NaN, Infinity, and anything
 * outside the storable range. Negative values are permitted here because a *delta*
 * may legitimately be negative; the callers that require a positive amount say so.
 */
export function isValidMinor(value: number): boolean {
  return Number.isSafeInteger(value) && value >= -MAX_MINOR && value <= MAX_MINOR;
}

/**
 * Sum minor-unit amounts without ever leaving integer arithmetic.
 *
 * Postgres `SUM(integer)` returns `bigint`, so the database can produce a total larger
 * than any single row. JavaScript numbers are exact to 2^53, which is four million
 * times the per-row ceiling — an overflow here would require ~4M maximum-value rows
 * for one partner. The guard is still present because "impossible" totals are exactly
 * what a corrupted aggregate looks like, and silently rendering one as money is worse
 * than refusing to.
 */
export function sumMinor(values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    if (!isValidMinor(value)) {
      throw new RangeError(`Not a storable minor-unit amount: ${value}`);
    }
    total += value;
  }
  if (!Number.isSafeInteger(total)) {
    throw new RangeError("Minor-unit total exceeded exact integer range");
  }
  return total;
}

/**
 * Parse a user-supplied major-unit string ("1,250.50") into minor units.
 *
 * Used only where a human types an amount. The portal posts minor units directly, so
 * this is not on the withdrawal path — it exists for the staff console and for
 * importing commission data.
 *
 * Returns `null` rather than throwing: the caller is a validator and wants a result,
 * not an exception.
 */
export function parseMinor(input: string, exponent = 2): number | null {
  const cleaned = input.replace(/[\s,_]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;

  const negative = cleaned.startsWith("-");
  const [whole = "0", fraction = ""] = cleaned.replace(/^-/, "").split(".");

  // More decimal places than the currency has is a typo, not a rounding opportunity.
  // Rounding here would silently accept "10.005" as "10.01" or "10.00" depending on
  // the mood of the float, and the difference is someone's money.
  if (fraction.length > exponent) return null;

  const padded = fraction.padEnd(exponent, "0");
  const minor = Number(`${whole}${padded}`);
  if (!isValidMinor(minor)) return null;

  return negative ? -minor : minor;
}

/**
 * Format for display. Server-side rendering and email only — the client formats with
 * its own locale via `formatMinor` in features/portal/withdrawals.ts, and the two
 * deliberately produce the same output for the same input.
 */
export function formatMinor(minor: number, currency: string, locale = "en"): string {
  if (!isValidMinor(minor)) throw new RangeError(`Cannot format ${minor} as money`);
  if (!isValidCurrency(currency)) throw new RangeError(`Not an ISO 4217 code: ${currency}`);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);
}
