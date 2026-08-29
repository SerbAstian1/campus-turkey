/**
 * The public lead forms: what may be submitted, and what is done with it.
 *
 * This is the trust boundary with the widest reach in the application. It is
 * unauthenticated by necessity, it is the only endpoint a stranger can write to, and on
 * the medical desk it carries health data — a special category almost everywhere the
 * site is published. It had no test at all.
 *
 * The properties below are the ones that would be expensive to get wrong and are
 * invisible when they break. Nothing here needs a database: the schemas and the retention
 * table are pure, and they are where the decisions live.
 *
 * What is deliberately *not* covered here, so the gap is stated rather than implied:
 * `submitLead` and `purgeExpiredLeads` both need a real Postgres and belong in the
 * integration suite. This file covers the intake rules they depend on.
 */

import { describe, expect, it } from "vitest";
import {
  RETENTION_DAYS,
  leadTypes,
  submitLeadBody,
  attributionSchema,
  type LeadType,
} from "./leads.service";

/** A minimally valid submission of any type. */
function submission(kind: LeadType, payload: Record<string, unknown> = {}) {
  return {
    kind,
    consent: true,
    captchaToken: "token",
    payload: { name: "Amara Okeke", email: "amara@example.com", ...payload },
  };
}

describe("consent", () => {
  it("refuses a submission that did not consent", () => {
    /*
     * `consent: z.literal(true)` rather than a boolean, and the difference is the whole
     * point. A boolean would accept `false` and the service would still write
     * `consentAt`, producing a stored record that falsely attests to permission. That is
     * worse than no record: it is evidence of a consent that was never given.
     */
    expect(submitLeadBody.safeParse({ ...submission("STUDY"), consent: false }).success).toBe(false);
  });

  it("refuses a submission with consent missing entirely", () => {
    const body = submission("STUDY") as Record<string, unknown>;
    delete body["consent"];
    expect(submitLeadBody.safeParse(body).success).toBe(false);
  });

  it("accepts a submission that consented", () => {
    expect(submitLeadBody.safeParse(submission("STUDY")).success).toBe(true);
  });
});

describe("health data cannot acquire a longer retention window", () => {
  /*
   * The sharpest privacy property in this file, and the reason it is worth testing at
   * all rather than trusting Zod.
   *
   * A medical enquiry is deleted after 90 days. Every other type is kept for two years
   * or more. So the question is not only "is health data accepted where it should be"
   * but "can it be smuggled into a type that keeps it eight times longer" — by posting
   * `treatment` on a STUDY form, which no browser would do and any script could.
   *
   * Zod strips unknown keys rather than rejecting them, so the field does not reach the
   * stored payload. That behaviour is load-bearing and would break silently if any of
   * these schemas were ever switched to `.passthrough()`.
   */
  it("keeps a treatment description out of a study enquiry", () => {
    const parsed = submitLeadBody.safeParse(
      submission("STUDY", { treatment: "oncology consultation" }),
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.payload).not.toHaveProperty("treatment");
  });

  it("keeps it out of every non-medical type", () => {
    for (const kind of leadTypes.filter((type) => type !== "MEDICAL")) {
      // PARTNER requires an organisation; supplying it keeps this a test about the
      // stripped field rather than about a missing one.
      const parsed = submitLeadBody.safeParse(
        submission(kind, { org: "Okeke Education", treatment: "cardiology" }),
      );

      expect(parsed.success, `${kind} should parse`).toBe(true);
      if (!parsed.success) continue;
      expect(parsed.data.payload, `${kind} must not carry treatment`).not.toHaveProperty("treatment");
    }
  });

  it("accepts it on the medical desk, which is the one place it belongs", () => {
    const parsed = submitLeadBody.safeParse(
      submission("MEDICAL", { treatment: "cardiology second opinion" }),
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.payload).toHaveProperty("treatment", "cardiology second opinion");
  });
});

describe("retention windows", () => {
  it("gives every accepted type a window", () => {
    // A type with no window would compute `undefined` days and store a lead the purge
    // can never select, which is an unbounded retention with no error anywhere.
    for (const kind of leadTypes) {
      expect(RETENTION_DAYS[kind], kind).toBeGreaterThan(0);
    }
  });

  it("keeps medical enquiries for the shortest time of any type", () => {
    const others = leadTypes.filter((type) => type !== "MEDICAL").map((type) => RETENTION_DAYS[type]);
    expect(Math.min(...others)).toBeGreaterThan(RETENTION_DAYS.MEDICAL);
  });

  it("matches the windows the privacy notice states in writing", () => {
    /*
     * These two numbers are published to every visitor in `content/privacy.ts`: ninety
     * days for a medical enquiry, two years for everything else. Changing them here
     * without changing the notice makes the site's own statement untrue, which is why
     * the test names the document rather than just the constant.
     */
    expect(RETENTION_DAYS.MEDICAL).toBe(90);
    expect(RETENTION_DAYS.STUDY).toBe(730);
    expect(RETENTION_DAYS.CONTACT).toBe(730);
  });

  it("accepts every type that has a retention window", () => {
    // The union is written out by hand so that adding a window without adding a union
    // member is a compile error. This asserts the same thing at runtime, in case the
    // compile-time guard is ever removed as clutter.
    for (const kind of leadTypes) {
      expect(submitLeadBody.safeParse(submission(kind, { org: "Okeke Education" })).success, kind).toBe(true);
    }
  });

  it("refuses a type with no window, including the retired one", () => {
    // `APPLY` still exists in the database enum. Migration 0012 rewrote it away and this
    // list is the narrower gate that stops it coming back through a request.
    expect(submitLeadBody.safeParse(submission("APPLY" as LeadType)).success).toBe(false);
    expect(submitLeadBody.safeParse(submission("ANYTHING" as LeadType)).success).toBe(false);
  });
});

describe("the fields a stranger controls are bounded", () => {
  it("refuses an unbounded message", () => {
    // Every string on this endpoint has a maximum, because an unbounded one is a payload
    // rather than a message: it costs a database row the size of whatever was posted.
    expect(submitLeadBody.safeParse(submission("CONTACT", { message: "x".repeat(4001) })).success).toBe(false);
    expect(submitLeadBody.safeParse(submission("CONTACT", { message: "x".repeat(4000) })).success).toBe(true);
  });

  it("refuses an address that is not one", () => {
    expect(submitLeadBody.safeParse(submission("STUDY", { email: "not-an-address" })).success).toBe(false);
  });

  it("normalises the address it stores", () => {
    // Lowercased and trimmed at the boundary so that two submissions from the same person
    // are the same person downstream, rather than two leads with two retention clocks.
    const parsed = submitLeadBody.safeParse(submission("STUDY", { email: "  Amara@Example.COM  " }));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.payload.email).toBe("amara@example.com");
  });

  it("refuses a name too short to be one", () => {
    expect(submitLeadBody.safeParse(submission("STUDY", { name: "A" })).success).toBe(false);
  });

  it("requires a partner application to name its organisation", () => {
    const body = submission("PARTNER") as { payload: Record<string, unknown> };
    expect(submitLeadBody.safeParse(body).success).toBe(false);
    expect(submitLeadBody.safeParse(submission("PARTNER", { org: "Okeke Education" })).success).toBe(true);
  });

  it("refuses a submission with no captcha token", () => {
    expect(submitLeadBody.safeParse({ ...submission("STUDY"), captchaToken: "" }).success).toBe(false);
  });
});

describe("campaign attribution", () => {
  it("is optional, so a visitor who arrived directly can still submit", () => {
    expect(attributionSchema.safeParse(undefined).success).toBe(true);
  });

  it("bounds a campaign name, which is a string somebody else chooses", () => {
    expect(attributionSchema.safeParse({ source: "x".repeat(121) }).success).toBe(false);
    expect(attributionSchema.safeParse({ source: "instagram" }).success).toBe(true);
  });
});
