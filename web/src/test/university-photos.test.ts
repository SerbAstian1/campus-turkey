/**
 * Campus photographs: the university's own grounds, or nothing at all.
 *
 * **The absence is the assertion.** An earlier version filled every gap with a photograph
 * of the city the university sits in, captioned as such. That is gone: on a recruitment
 * page the picture is evidence, and a reader deciding where to move should not need to
 * read a caption to learn the building above it is not the place. Three universities —
 * Harran, Van Yüzüncü Yıl and Süleyman Demirel — have no verifiable free photograph of
 * their campus, and they render the reserved frame rather than a substitute.
 *
 * So the first test guards the rule rather than the coverage: every path must point into
 * `university-campus/`. A regression here does not look broken — a plausible photograph
 * of somewhere else renders perfectly — which is exactly why it is worth a test.
 *
 * The slug keys carry the trap `university-logos.ts` documents: `slugify` reduces
 * anything outside `[a-z0-9]` to a dash, so Boğaziçi is `bo-azi-i-university` and İnönü is
 * `i-n-n-university`. A wrong key typechecks and silently shows the empty state.
 *
 * The attribution tests have teeth of their own: CC BY, CC BY-SA and the Free Art Licence
 * grant use only while the author and licence are stated. An entry that loses either does
 * not degrade the page — it stops being licensed.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { universities } from "@/content";
import { universityPhotos, universityPhoto, universityCardImage } from "@/content/university-photos";

const ASSETS_ROOT = join(__dirname, "..", "..", "..", "assets");
const diskPath = (webPath: string) => join(ASSETS_ROOT, webPath.replace(/^\/assets\//, ""));

/** Licences permitting commercial use and derivatives. NC and ND permit neither. */
const PERMITTED = /^(cc0|cc by(-sa)?( \d(\.\d)?)?|public domain|fal)$/i;

/**
 * Universities with no photograph meeting the rule — a gate, a rectorate, or a building
 * carrying the university's name.
 *
 * **Empty, for the first time.** The last six were supplied by the client rather than
 * found: Harran's gate in particular, because every free search for it returns the ruins
 * of the *ancient* Harran university a thousand years older than the campus.
 *
 * It stays as a list rather than being deleted because the rule it encodes outlives the
 * current coverage: a university added tomorrow starts here, and an empty frame is the
 * correct rendering until a photograph of the right place exists. What it forbids is
 * filling that frame with a city, a landmark or a neighbouring campus.
 */
const WITHOUT_PHOTO: string[] = [];

describe("the campus photo map", () => {
  it("points only at campus photographs, never a stand-in", () => {
    const strays = Object.entries(universityPhotos)
      .filter(([, p]) => !p.src.startsWith("/assets/university-campus/"))
      .map(([slug, p]) => `${slug} -> ${p.src}`);
    expect(strays).toEqual([]);
  });

  it("leaves the universities with no verified photograph out entirely", () => {
    // Not a gap to be filled by the next person who notices it — a decision. Filling it
    // with a city, a landmark or a neighbouring campus is the thing this guards against.
    for (const slug of WITHOUT_PHOTO) expect(universityPhoto(slug)).toBeUndefined();
  });

  it("covers every other university in the directory", () => {
    const missing = universities
      .filter((u) => !WITHOUT_PHOTO.includes(u.slug) && !universityPhoto(u.slug))
      .map((u) => `${u.name} (${u.slug})`);
    expect(missing).toEqual([]);
  });

  it("is keyed only to slugs a university answers to", () => {
    const slugs = new Set(universities.map((u) => u.slug));
    const orphans = Object.keys(universityPhotos).filter((k) => !slugs.has(k));
    expect(orphans).toEqual([]);
  });

  it("resolves every path to a WEBP that exists in the tracked assets", () => {
    const broken = Object.entries(universityPhotos)
      .filter(([, p]) => !p.src.endsWith(".webp") || !existsSync(diskPath(p.src)))
      .map(([slug, p]) => `${slug} -> ${p.src}`);
    expect(broken).toEqual([]);
  });

  it("carries either a full attribution or none at all", () => {
    /*
     * A Commons photograph is licensed only while its author and licence are stated, so
     * a partial entry is a licence breach wearing the costume of a typo. A photograph the
     * client supplies carries nothing, and `PhotoCredit` renders no line for it — giving
     * it one would name somebody who did not take it, which is how Dicle came to credit a
     * Commons photographer for the client's own gate.
     */
    const half = Object.entries(universityPhotos)
      .filter(([, p]) => {
        const fields = [p.author, p.licence, p.source].filter((f) => f && f.trim());
        return fields.length !== 0 && fields.length !== 3;
      })
      .map(([slug]) => slug);
    expect(half).toEqual([]);
  });

  it("uses only licences that permit commercial use, where one is stated", () => {
    const unusable = Object.entries(universityPhotos)
      .filter(([, p]) => p.licence && !PERMITTED.test(p.licence.trim()))
      .map(([slug, p]) => `${slug}: ${p.licence}`);
    expect(unusable).toEqual([]);
  });

  it("points at absolute paths, so they resolve at any route depth", () => {
    const relative = Object.entries(universityPhotos).filter(([, p]) => !p.src.startsWith("/"));
    expect(relative).toEqual([]);
  });
});

describe("the card image", () => {
  /**
   * This assertion used to be `toBe(universityPhoto(slug).src)` — the card served the
   * page's own file. That is what made the directory download forty-four 1600x900
   * photographs to fill thumbnails a few hundred pixels wide: 7.25MB on the one page the
   * directory exists for, with single images arriving at 487KB.
   *
   * The intent behind the old assertion is kept and made specific. The card must still
   * show *the same photograph* — not a different one, not a placeholder — and it must be
   * the smaller rendition of it.
   */
  it("is the same photograph the page shows, in its card rendition", () => {
    const [slug] = Object.keys(universityPhotos);
    const full = universityPhoto(slug!)!.src;
    const card = universityCardImage(slug!)!;

    expect(card).not.toBe(full);
    expect(card).toContain("/university-campus/cards/");
    // Same file name on both sides: the card is a resize, never a substitution.
    expect(card.split("/").pop()).toBe(full.split("/").pop());
  });

  it("has a variant file on disk for every photograph", () => {
    /*
     * The failure this prevents is a 404 in every card on the directory. The path is
     * derived by string replacement, so a photograph added without regenerating the
     * `cards/` folder would point at a file that does not exist, and the card would show
     * a broken image rather than falling back to its gradient.
     */
    /*
     * Checked against the committed `assets/` tree, not `public/`. `public/assets` is
     * generated by the sync step, and CI runs the suite *before* that step — so looking
     * there would fail on a clean checkout for a reason that has nothing to do with the
     * photographs. `diskPath` is the helper the rest of this file already uses.
     */
    const missing = Object.keys(universityPhotos).filter((slug) => {
      const card = universityCardImage(slug);
      return !card || !existsSync(diskPath(card));
    });

    expect(missing, `no card variant generated for: ${missing.join(", ")}`).toEqual([]);
  });

  it("is undefined where there is no photograph, so the card keeps its gradient", () => {
    for (const slug of WITHOUT_PHOTO) expect(universityCardImage(slug)).toBeUndefined();
  });
});
