/**
 * The marquee's university logos: right keys, real files, real transparency.
 *
 * **The slug is not the name, and that is the trap this exists for.** `slugify` reduces
 * anything outside `[a-z0-9]` to a dash, and most of these are Turkish names — so
 * Boğaziçi is `bo-azi-i-university`, Yıldız is `y-ld-z-technical-university`, and Koç is
 * `ko-university`. A logo map keyed by the readable name typechecks perfectly, ships, and
 * silently shows nothing for six of the fourteen: `universityLogo()` returns `undefined`,
 * `ImagePlaceholder` falls back to its reserved frame, and the page looks deliberate.
 *
 * Nothing else in the suite would notice. The map is a `Record<string, string>`, so every
 * key is valid to the compiler whether or not a university answers to it, and the
 * component's fallback is the same shape as its success. These assert the join.
 *
 * They also assert the files, because the map is only half of it — a correct key pointing
 * at a path that does not exist is the same broken image, and `assets/` is the tracked
 * source that `web/public/assets/` is generated from, so that is what gets checked.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { universities } from "@/content";
import { universityLogos, universityLogo } from "@/content/university-logos";

/** `web/src/test` → repository root, where the tracked `assets/` lives. */
const ASSETS_ROOT = join(__dirname, "..", "..", "..", "assets");

/** The slice `AffiliateMarquee` renders. */
const MARQUEE = universities.slice(0, 14);

const diskPath = (webPath: string) => join(ASSETS_ROOT, webPath.replace(/^\/assets\//, ""));

describe("the logo map", () => {
  it("has an entry for every university the marquee renders", () => {
    const missing = MARQUEE.filter((u) => !universityLogo(u.slug)).map((u) => `${u.name} (${u.slug})`);
    expect(missing).toEqual([]);
  });

  it("has no entry keyed to a slug no university answers to", () => {
    const slugs = new Set(universities.map((u) => u.slug));
    const orphans = Object.keys(universityLogos).filter((k) => !slugs.has(k));
    expect(orphans).toEqual([]);
  });

  it("resolves every path to a file that exists in the tracked assets", () => {
    const broken = Object.entries(universityLogos)
      .filter(([, p]) => !existsSync(diskPath(p)))
      .map(([slug, p]) => `${slug} -> ${p}`);
    expect(broken).toEqual([]);
  });

  it("points only at absolute paths, so they resolve at any route depth", () => {
    // Same defect as `ASSETS` had; see `asset-urls.test.ts`.
    const relative = Object.entries(universityLogos).filter(([, p]) => !p.startsWith("/"));
    expect(relative).toEqual([]);
  });
});

describe("each logo file", () => {
  /**
   * Read straight from the PNG header rather than decoding: bytes 16–23 are the IHDR
   * width and height, byte 25 is the colour type. 6 is RGBA and 4 is grey+alpha — either
   * carries the alpha channel the circular mask needs. An opaque logo would show as a
   * white square corner poking out of the circle.
   */
  const header = (p: string) => {
    const b = readFileSync(diskPath(p));
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] };
  };

  it("is a square 88px PNG — 44 CSS px in the marquee, at 2x", () => {
    const wrong = Object.entries(universityLogos)
      .map(([slug, p]) => [slug, header(p)] as const)
      .filter(([, h]) => h.width !== 88 || h.height !== 88)
      .map(([slug, h]) => `${slug}: ${h.width}x${h.height}`);
    expect(wrong).toEqual([]);
  });

  it("carries an alpha channel", () => {
    const opaque = Object.entries(universityLogos)
      .map(([slug, p]) => [slug, header(p).colorType] as const)
      .filter(([, t]) => t !== 6 && t !== 4)
      .map(([slug, t]) => `${slug}: colour type ${t}`);
    expect(opaque).toEqual([]);
  });

  /**
   * The corners have to be genuinely empty, not merely capable of it. A logo delivered on
   * a white plate declares RGBA all the same and passes every check above, then renders as
   * a square with its corners sliced off by the circular mask — the exact artefact this
   * whole conversion exists to avoid. So this decodes the pixels.
   */
  it("has transparent corners, so the circular mask has nothing to clip", async () => {
    const sharp = (await import("sharp")).default;
    const opaque: string[] = [];

    for (const [slug, p] of Object.entries(universityLogos)) {
      const { data, info } = await sharp(diskPath(p)).ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true });
      const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]!;
      const corners = [
        alphaAt(0, 0),
        alphaAt(info.width - 1, 0),
        alphaAt(0, info.height - 1),
        alphaAt(info.width - 1, info.height - 1),
      ];
      if (corners.some((a) => a > 8)) opaque.push(`${slug}: corner alpha ${corners.join(",")}`);
    }

    expect(opaque).toEqual([]);
  });
});
