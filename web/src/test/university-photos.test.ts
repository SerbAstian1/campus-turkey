/**
 * Every university has a picture, every picture is honestly labelled, and every licence
 * that demands a credit gets one.
 *
 * The second and third tests are the ones with teeth. Twenty-two of the forty show the
 * *city* rather than the campus, because no freely licensed photograph of those campuses
 * exists — and a city view presented as a campus is a false claim on the page a student
 * uses to choose where to move. So `kind` must be set, and a `city` entry must name its
 * city or the rendered caption would read "undefined, where X is based".
 *
 * The credit is a licence condition, not a courtesy: CC BY, CC BY-SA and the Free Art
 * Licence all grant use only while the author and licence are stated. An entry that loses
 * either does not look wrong on the page — it simply stops being licensed.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { universities } from "@/content";
import { universityPhotos, universityPhoto } from "@/content/university-photos";

const ASSETS_ROOT = join(__dirname, "..", "..", "..", "assets");
const diskPath = (webPath: string) => join(ASSETS_ROOT, webPath.replace(/^\/assets\//, ""));

/** Licences permitting commercial use and derivatives. NC and ND permit neither. */
const PERMITTED = /^(cc0|cc by(-sa)?( \d(\.\d)?)?|public domain|fal)$/i;

describe("the university photo map", () => {
  it("covers every university in the directory", () => {
    const missing = universities.filter((u) => !universityPhoto(u.slug)).map((u) => `${u.name} (${u.slug})`);
    expect(missing).toEqual([]);
  });

  it("is keyed only to slugs a university answers to", () => {
    const slugs = new Set(universities.map((u) => u.slug));
    const orphans = Object.keys(universityPhotos).filter((k) => !slugs.has(k));
    expect(orphans).toEqual([]);
  });

  it("names the city on every entry that shows one", () => {
    const unlabelled = Object.entries(universityPhotos)
      .filter(([, p]) => p.kind === "city" && !p.city?.trim())
      .map(([slug]) => slug);
    expect(unlabelled).toEqual([]);
  });

  it("never marks a city photograph as a campus, or the reverse", () => {
    const wrong = Object.entries(universityPhotos)
      .filter(([, p]) =>
        (p.kind === "campus" && p.src.includes("/city-photos/"))
        || (p.kind === "city" && p.src.includes("/university-campus/")))
      .map(([slug, p]) => `${slug}: ${p.kind} -> ${p.src}`);
    expect(wrong).toEqual([]);
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
