import { describe, expect, it } from "vitest";
import { COUNTRY_CODES, countryOptions } from "@/i18n/countries";

describe("registration countries", () => {
  it("offers the comprehensive country list from every registration form", () => {
    expect(COUNTRY_CODES.length).toBeGreaterThanOrEqual(195);

    const english = countryOptions("en");
    expect(english.options).toContain("Benin");
    expect(english.options).toContain("Togo");
  });

  it("localizes country labels while preserving the English value sent to staff", () => {
    const french = countryOptions("fr");

    expect(french.options).toContain("Bénin");
    expect(french.toEnglish("Bénin")).toBe("Benin");
    expect(french.display("Togo")).toBe("Togo");
  });
});
