/**
 * Money primitives.
 *
 * On the payment path, so held to 100%. The interesting cases are all refusals:
 * `parseMinor` exists as much to reject "10.005" as to accept "10.00", because
 * silently rounding a third decimal place is a decision about someone's money made by
 * a regex.
 */

import { describe, it, expect } from "vitest";
import {
  MAX_MINOR,
  isValidCurrency,
  isValidMinor,
  sumMinor,
  parseMinor,
  formatMinor,
} from "./money";

describe("isValidCurrency", () => {
  it("accepts a three-letter uppercase code", () => {
    for (const code of ["USD", "EUR", "TRY", "NGN"]) {
      expect(isValidCurrency(code)).toBe(true);
    }
  });

  it("rejects lowercase, wrong length, digits and padding", () => {
    for (const code of ["usd", "Usd", "US", "USDD", "US1", " USD", "USD ", ""]) {
      expect(isValidCurrency(code)).toBe(false);
    }
  });
});

describe("isValidMinor", () => {
  it("accepts integers within the storable range, including the bounds", () => {
    for (const value of [0, 1, -1, 100, MAX_MINOR, -MAX_MINOR]) {
      expect(isValidMinor(value)).toBe(true);
    }
  });

  it("rejects anything past the Postgres integer ceiling", () => {
    expect(isValidMinor(MAX_MINOR + 1)).toBe(false);
    expect(isValidMinor(-MAX_MINOR - 1)).toBe(false);
  });

  it("rejects fractions, NaN and the infinities", () => {
    for (const value of [1.5, 0.1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(isValidMinor(value)).toBe(false);
    }
  });
});

describe("sumMinor", () => {
  it("sums an ordinary list", () => {
    expect(sumMinor([100_00, 250_50, 49_50])).toBe(400_00);
  });

  it("returns zero for an empty list", () => {
    expect(sumMinor([])).toBe(0);
  });

  it("handles negatives, which a correction legitimately is", () => {
    expect(sumMinor([100_00, -40_00])).toBe(60_00);
  });

  it("refuses a fractional member rather than quietly producing a fractional total", () => {
    expect(() => sumMinor([100, 0.5])).toThrow(RangeError);
  });

  it("refuses a member past the storable range", () => {
    expect(() => sumMinor([MAX_MINOR + 1])).toThrow(/not a storable/i);
  });

  it("refuses NaN", () => {
    expect(() => sumMinor([100, Number.NaN])).toThrow(RangeError);
  });

  it("refuses a total that leaves exact integer range", () => {
    // Each member is individually storable; the total is not exactly representable.
    const huge = Array.from({ length: 5_000_000 }, () => MAX_MINOR);
    expect(() => sumMinor(huge)).toThrow(/exact integer range/i);
  });
});

describe("parseMinor", () => {
  it("parses a plain major-unit amount", () => {
    expect(parseMinor("10")).toBe(1000);
    expect(parseMinor("10.5")).toBe(1050);
    expect(parseMinor("10.55")).toBe(1055);
  });

  it("parses zero", () => {
    expect(parseMinor("0")).toBe(0);
    expect(parseMinor("0.00")).toBe(0);
  });

  it("strips thousands separators and incidental whitespace", () => {
    expect(parseMinor("1,250.50")).toBe(125050);
    expect(parseMinor(" 1 250.50 ")).toBe(125050);
    expect(parseMinor("1_250.50")).toBe(125050);
  });

  it("parses a negative amount", () => {
    expect(parseMinor("-10.50")).toBe(-1050);
  });

  it("refuses more decimal places than the currency has — this is a typo, not a rounding", () => {
    // The whole reason this function returns null instead of rounding. "10.005" is
    // either 1000 or 1001 depending on which way you round, and both are wrong because
    // the user did not mean either.
    expect(parseMinor("10.005")).toBeNull();
    expect(parseMinor("10.999")).toBeNull();
  });

  it("honours a non-two exponent for zero-decimal currencies", () => {
    expect(parseMinor("1500", 0)).toBe(1500);
    expect(parseMinor("1500.5", 0)).toBeNull();
  });

  it("refuses anything that is not a number", () => {
    for (const input of ["", "abc", "10.", ".5", "1.2.3", "1e5", "--5", "10-", "$10"]) {
      expect(parseMinor(input)).toBeNull();
    }
  });

  it("refuses an amount past the storable range", () => {
    expect(parseMinor("99999999999.99")).toBeNull();
  });
});

describe("formatMinor", () => {
  it("formats minor units as major-unit currency", () => {
    // Asserted on the digits rather than the exact glyph: Intl's currency symbol and
    // spacing vary by ICU version, and pinning them would make this a test of Node.
    expect(formatMinor(125050, "USD", "en-US")).toMatch(/1,250\.50/);
  });

  it("formats zero", () => {
    expect(formatMinor(0, "USD", "en-US")).toMatch(/0\.00/);
  });

  it("formats a negative amount", () => {
    expect(formatMinor(-1050, "USD", "en-US")).toMatch(/10\.50/);
  });

  it("refuses to format a fractional minor amount", () => {
    expect(() => formatMinor(10.5, "USD")).toThrow(/cannot format/i);
  });

  it("refuses a currency code that is not ISO 4217", () => {
    expect(() => formatMinor(1000, "usd")).toThrow(/ISO 4217/);
  });

  it("agrees with the client formatter in features/portal/withdrawals.ts", () => {
    // Both do `Intl.NumberFormat(locale, { style: "currency", currency }).format(m/100)`.
    // If they ever diverge, a partner sees one number in the list and another in the
    // confirmation email, which reads as a bug in the amount rather than in the format.
    const clientEquivalent = new Intl.NumberFormat("en", {
      style: "currency",
      currency: "USD",
    }).format(125050 / 100);
    expect(formatMinor(125050, "USD", "en")).toBe(clientEquivalent);
  });
});
