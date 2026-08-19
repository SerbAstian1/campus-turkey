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
 * No free photograph of their campus exists that meets the rule — a gate, a rectorate, or
 * a building carrying the university's name. See the module's own note for what each one's
 * candidates actually were.
 *
 * The last four were deliberately *deleted* rather than left as they were: each held a
 * real photograph of the right campus that identified nothing — a misty plaza, a lawn in
 * blossom, a road at night, a valley seen from a hillside. An empty frame is the honest
 * result, and this list is what stops one of them quietly coming back.
 */
const WITHOUT_PHOTO = [
  "harran-university", "van-y-z-nc-y-l-university", "s-leyman-demirel-university",
  "middle-east-technical-university", "erciyes-university",
  "i-n-n-university",
  // Added to the directory so the client can feature them; their campus photography has
  // not been sourced yet. Their logos have, which is what the marquee actually renders.
  "bayburt-university", "i-d-r-university", "bolu-abant-i-zzet-baysal-university",
  "adana-alparslan-t-rke-science-and-technology-university",
];

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

  it("carries the author, licence and source every entry is published under", () => {
    const incomplete = Object.entries(universityPhotos)
      .filter(([, p]) => !p.author.trim() || !p.licence.trim() || !p.source.trim())
      .map(([slug]) => slug);
    expect(incomplete).toEqual([]);
  });

  it("uses only licences that permit commercial use", () => {
    const unusable = Object.entries(universityPhotos)
      .filter(([, p]) => !PERMITTED.test(p.licence.trim()))
      .map(([slug, p]) => `${slug}: ${p.licence}`);
    expect(unusable).toEqual([]);
  });

  it("points at absolute paths, so they resolve at any route depth", () => {
    const relative = Object.entries(universityPhotos).filter(([, p]) => !p.src.startsWith("/"));
    expect(relative).toEqual([]);
  });
});

describe("the card image", () => {
  it("is the same photograph the page shows", () => {
    const [slug] = Object.keys(universityPhotos);
    expect(universityCardImage(slug!)).toBe(universityPhoto(slug!)!.src);
  });

  it("is undefined where there is no photograph, so the card keeps its gradient", () => {
    for (const slug of WITHOUT_PHOTO) expect(universityCardImage(slug)).toBeUndefined();
  });
});
