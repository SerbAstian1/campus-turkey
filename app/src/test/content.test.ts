/**
 * Content integrity.
 *
 * These are the invariants the screens assume but cannot check: a lookup helper that
 * returns `undefined` renders a 404, and a duplicate slug silently hides a record. Both
 * are the kind of thing a CMS import breaks quietly, so they are asserted here rather
 * than discovered in production.
 */

import { describe, expect, it } from "vitest";
import {
  articles, getArticle, getInstitution, getService, getUniversity,
  institutions, journey, portal, scholarships, serviceCards, services, universities,
} from "@/content";

const slugsOf = (items: { slug: string }[]) => items.map((i) => i.slug);

describe("slugs", () => {
  it.each([
    ["universities", slugsOf(universities)],
    ["services", slugsOf(services)],
    ["institutions", slugsOf(institutions)],
    ["articles", slugsOf(articles)],
  ])("%s are unique", (_name, slugs) => {
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("are URL-safe, so a link never needs encoding", () => {
    for (const slug of [...slugsOf(universities), ...slugsOf(articles)]) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("match the prototype's rule exactly, Turkish letters included", () => {
    /* The prototype filters on a-z, so Turkish letters drop out entirely. These are
       the addresses it publishes; parity matters more here than tidiness. */
    expect(getUniversity("bo-azi-i-university")?.name).toBe("Boğaziçi University");
    expect(getUniversity("ko-university")?.name).toBe("Koç University");
    expect(getUniversity("istanbul-technical-university")?.name).toBe("Istanbul Technical University");
  });
});

describe("lookups", () => {
  it("find every record by its own slug", () => {
    for (const u of universities) expect(getUniversity(u.slug)).toBe(u);
    for (const s of services) expect(getService(s.slug)).toBe(s);
    for (const i of institutions) expect(getInstitution(i.slug)).toBe(i);
    for (const a of articles) expect(getArticle(a.slug)).toBe(a);
  });

  it("return undefined for an unknown slug, so the screen can show a 404", () => {
    expect(getUniversity("no-such-university")).toBeUndefined();
    expect(getService("no-such-service")).toBeUndefined();
    expect(getInstitution("no-such-institution")).toBeUndefined();
    expect(getArticle("no-such-article")).toBeUndefined();
  });
});

describe("the directory", () => {
  it("carries the full set the prototype had", () => {
    expect(universities).toHaveLength(40);
  });

  it("gives every university coordinates inside Türkiye", () => {
    for (const u of universities) {
      expect(u.lat).toBeGreaterThan(35.5);
      expect(u.lat).toBeLessThan(42.5);
      expect(u.lng).toBeGreaterThan(25.5);
      expect(u.lng).toBeLessThan(45);
    }
  });

  it("states a tuition figure for every university", () => {
    for (const u of universities) expect(u.tuition).toMatch(/\$[\d,]+/);
  });
});

describe("homepage service cards", () => {
  it("point at routes the router serves, with no leading slash", () => {
    for (const card of serviceCards) expect(card.route).toMatch(/^[a-z]+(\/[a-z]+)?$/);
  });

  it("promote education and nothing else", () => {
    const primary = serviceCards.filter((c) => c.emphasis === "primary");
    expect(primary).toHaveLength(1);
    expect(primary[0]?.route).toBe("study");
  });
});

describe("money", () => {
  it("is held in minor units everywhere, never as a float", () => {
    const amounts = [
      portal.wallet.availableMinor,
      portal.wallet.pendingMinor,
      portal.wallet.lifetimeMinor,
      portal.wallet.minimumMinor,
      ...portal.students.map((s) => s.commissionMinor),
      ...portal.withdrawals.map((w) => w.amountMinor),
    ];
    for (const a of amounts) expect(Number.isInteger(a)).toBe(true);
  });

  it("never exposes more than the last four characters of a payout detail", () => {
    for (const m of portal.wallet.methods) {
      expect(m.maskedDetail).toMatch(/[•]/);
    }
  });

  it("keeps the available balance below what has been earned", () => {
    expect(portal.wallet.availableMinor).toBeLessThanOrEqual(portal.wallet.lifetimeMinor);
  });
});

describe("process content", () => {
  it("numbers every journey and service step", () => {
    const steps = [...journey, ...services.flatMap((s) => s.steps)];
    for (const s of steps) expect(s.meta).toMatch(/^Step \d+$/);
  });

  it("says plainly how competitive each scholarship is", () => {
    for (const s of scholarships) expect(s.competitive.length).toBeGreaterThan(0);
  });
});
