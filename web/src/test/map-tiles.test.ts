/**
 * The tile URL and the CSP allowlist must name the same host.
 *
 * This is a regression test for a defect that shipped and was invisible: the map
 * requested tiles from `tile.openstreetmap.org` while `middleware.ts` allowed
 * `*.basemaps.cartocdn.com`, a host nothing in the codebase has ever used. Every tile
 * was blocked by the CSP. The page returned 200, the build was green, the test suite was
 * green, and the map was an empty grey pane with the pins floating on nothing.
 *
 * Nothing catches that except an assertion that the two agree, because the failure lives
 * in the gap between two files that no single file is responsible for. Both now derive
 * from `features/map/tiles.ts`, and these tests are what stop them drifting again.
 */

import { describe, expect, it } from "vitest";
import {
  MAPTILER_HOST,
  MAPTILER_STYLE,
  OSM_HOST,
  maptilerTileUrl,
  tileImageSources,
  tileLayerFor,
} from "@/features/map/tiles";

/** The origin a browser would connect to for this URL — what the CSP actually matches. */
const originOf = (url: string): string => new URL(url.replace(/\{[a-z]\}/g, "1")).origin;

describe("the MapTiler tile URL", () => {
  it("is MapTiler's raster endpoint for the configured style", () => {
    const url = maptilerTileUrl("test-key");

    expect(url).toBe(
      `https://api.maptiler.com/maps/${MAPTILER_STYLE}/{z}/{x}/{y}.png?key=test-key`,
    );
  });

  /** Leaflet substitutes these three. A typo in any of them is a 404 per tile. */
  it("keeps Leaflet's z/x/y placeholders intact", () => {
    const url = maptilerTileUrl("test-key");
    for (const token of ["{z}", "{x}", "{y}"]) expect(url).toContain(token);
  });

  it("encodes the key rather than interpolating it raw", () => {
    // A key is unlikely to contain a delimiter, but building a URL by concatenation and
    // hoping is how a query string acquires a second `?`.
    expect(maptilerTileUrl("a b&c=d")).toContain("key=a%20b%26c%3Dd");
  });

  it("does not carry a key anywhere but the query string", () => {
    const url = maptilerTileUrl("secret-looking-value");
    expect(url.split("?")[0]).not.toContain("secret-looking-value");
  });
});

describe("choosing a provider", () => {
  it("uses MapTiler when a key is present", () => {
    const layer = tileLayerFor("a-key");

    expect(layer.provider).toBe("maptiler");
    expect(originOf(layer.url)).toBe(MAPTILER_HOST);
    // MapTiler's terms require both credits.
    expect(layer.attribution).toContain("MapTiler");
    expect(layer.attribution).toContain("OpenStreetMap");
  });

  it("falls back to OpenStreetMap when the key is absent", () => {
    expect(tileLayerFor(undefined).provider).toBe("osm");
    expect(originOf(tileLayerFor(undefined).url)).toBe(OSM_HOST);
  });

  /**
   * An unset variable in a `.env` arrives as `""`, not `undefined`. Treating a blank as
   * a real key would build `?key=` and every tile would come back 403 — a blank map that
   * looks exactly like the CSP failure this module exists to prevent.
   */
  it("treats a blank or whitespace key as absent", () => {
    expect(tileLayerFor("").provider).toBe("osm");
    expect(tileLayerFor("   ").provider).toBe("osm");
  });

  it("trims a key that arrived with stray whitespace", () => {
    expect(maptilerTileUrl("k")).toBe(tileLayerFor("  k  ").url);
  });
});

describe("the CSP allowlist covers what the map requests", () => {
  /** The assertion the CARTO bug would have failed. */
  it("allows the MapTiler origin in production", () => {
    const hosts = tileImageSources({ isProduction: true });

    expect(hosts).toContain(originOf(tileLayerFor("a-key").url));
  });

  it("allows the fallback origin outside production, where the fallback is reachable", () => {
    const hosts = tileImageSources({ isProduction: false });

    expect(hosts).toContain(originOf(tileLayerFor(undefined).url));
    expect(hosts).toContain(MAPTILER_HOST);
  });

  /**
   * Production must not permit OSM. Allowing it would let a build that lost its key
   * fall back and keep serving tiles from a host whose usage policy forbids it — the
   * exact outcome the boot check exists to prevent, quietly restored by a CSP entry.
   */
  it("does not allow OpenStreetMap in production", () => {
    expect(tileImageSources({ isProduction: true })).not.toContain(OSM_HOST);
  });

  it("no longer allows CARTO, which nothing requests", () => {
    const hosts = tileImageSources({ isProduction: true, extraHost: undefined });
    expect(hosts.join(" ")).not.toContain("cartocdn");
  });
});

describe("MAP_TILE_HOST", () => {
  it("widens the allowlist without displacing MapTiler", () => {
    const hosts = tileImageSources({
      isProduction: true,
      extraHost: "https://tiles.internal.example",
    });

    expect(hosts).toContain(MAPTILER_HOST);
    expect(hosts).toContain("https://tiles.internal.example");
  });

  /**
   * The old behaviour was `process.env["MAP_TILE_HOST"] ?? ""`, concatenated straight
   * into the directive — so an unset value contributed a trailing space and an empty
   * allowlist entry, and the map depended on a variable nobody had set. It cannot now.
   */
  it("is optional, and its absence leaves MapTiler allowed", () => {
    for (const extra of [undefined, "", "   "]) {
      const hosts = tileImageSources({ isProduction: true, extraHost: extra });
      expect(hosts).toEqual([MAPTILER_HOST]);
    }
  });

  it("does not duplicate an entry that is already allowed", () => {
    const hosts = tileImageSources({ isProduction: true, extraHost: MAPTILER_HOST });
    expect(hosts).toEqual([MAPTILER_HOST]);
  });
});
