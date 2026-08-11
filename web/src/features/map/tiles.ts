/**
 * Where map tiles come from. One module, because two things need to agree about it and
 * previously did not.
 *
 * The directory map requested tiles from `tile.openstreetmap.org` while the CSP in
 * `middleware.ts` allowed `*.basemaps.cartocdn.com` — a host nothing in this codebase
 * has ever used. The two were edited at different times by different hands, and the
 * result is a map that renders as an empty grey pane with the pins floating on nothing,
 * with the only evidence a CSP violation in the browser console. Nothing failed a build
 * or a test.
 *
 * So the tile URL and the CSP allowlist are now derived from the same constants. Getting
 * them out of step requires editing this file in two places on purpose.
 *
 * Kept free of Node APIs: `middleware.ts` imports it and runs on the edge runtime.
 */

/** MapTiler's API origin. Also the value `MAP_TILE_HOST` should carry in production. */
export const MAPTILER_HOST = "https://api.maptiler.com";

/** OpenStreetMap's public tile server. Development fallback only — see `tileLayerFor`. */
export const OSM_HOST = "https://tile.openstreetmap.org";

/**
 * The MapTiler style the directory renders.
 *
 * `dataviz-light` is a deliberate choice rather than a default. It is MapTiler's
 * purpose-built backdrop for data overlays: low contrast, muted greys, minimal label
 * density. This map exists to show forty green pins across Türkiye, and a full
 * `streets-v2` basemap competes with them — the pins are the information, the basemap is
 * the context.
 *
 * Swappable to `basic-v2`, `bright-v2`, `streets-v2`, `topo-v2` or `satellite` by
 * changing this one string; the URL shape is identical for all of them.
 */
export const MAPTILER_STYLE = "dataviz-light";

/**
 * MapTiler's raster tile endpoint.
 *
 * Raster rather than vector, because the existing map is Leaflet and Leaflet's
 * `tileLayer` speaks raster. Vector tiles would mean MapLibre and a rewrite of a working
 * component, which is not what a provider swap should cost.
 *
 * The key travels in the query string because that is what MapTiler's raster API takes.
 * It is a **public, publishable key** — see the note on `NEXT_PUBLIC_MAPTILER_KEY` in
 * `.env.example`. The control that matters is the domain restriction set in MapTiler's
 * dashboard, not secrecy: this URL is visible in the network tab of every visitor.
 */
export function maptilerTileUrl(key: string): string {
  return `${MAPTILER_HOST}/maps/${MAPTILER_STYLE}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`;
}

/** MapTiler's terms require both attributions, and Leaflet renders them in the corner. */
export const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>';

export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>';

export interface TileLayerConfig {
  url: string;
  attribution: string;
  /** Which provider was chosen, for the CSP and for the console warning. */
  provider: "maptiler" | "osm";
}

/**
 * Choose a tile source for the key that is actually present.
 *
 * With a key, MapTiler. Without one, OpenStreetMap's public server — which handoff note
 * 13 is explicit must not serve production traffic, and which is exactly right for
 * development, where the alternative is that nobody can run the directory page without
 * signing up for a MapTiler account first.
 *
 * That split matches how every other external service in this application behaves:
 * `CAPTCHA_PROVIDER=disabled`, `MAIL_PROVIDER=disabled` and `STORAGE_PROVIDER=local` all
 * exist so the repository runs on a laptop. Production is prevented from inheriting the
 * relaxation by the boot check in `server/lib/config.ts`, not by hoping.
 */
export function tileLayerFor(key: string | undefined): TileLayerConfig {
  if (key && key.trim() !== "") {
    return {
      url: maptilerTileUrl(key.trim()),
      attribution: MAPTILER_ATTRIBUTION,
      provider: "maptiler",
    };
  }

  return { url: `${OSM_HOST}/{z}/{x}/{y}.png`, attribution: OSM_ATTRIBUTION, provider: "osm" };
}

/**
 * The hosts `img-src` must allow for tiles to load.
 *
 * Production is MapTiler alone. Development adds OSM, because that is what
 * `tileLayerFor` falls back to without a key — a CSP that forbids the fallback would
 * reproduce the blank map this module exists to prevent, just on a different machine.
 *
 * `extraHost` is `MAP_TILE_HOST`, kept as an escape hatch for a self-hosted or
 * proxied tile set without a code change. It is additive; it cannot remove MapTiler.
 */
export function tileImageSources(options: {
  isProduction: boolean;
  extraHost?: string | undefined;
}): string[] {
  const hosts = [MAPTILER_HOST];
  if (!options.isProduction) hosts.push(OSM_HOST);

  const extra = options.extraHost?.trim();
  if (extra && !hosts.includes(extra)) hosts.push(extra);

  return hosts;
}
