"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, Icon } from "@/ds";
import type { UniversityPin } from "@/features/universities/data";
import { tileLayerFor } from "@/features/map/tiles";
import { useT } from "@/i18n/context";

/**
 * MapTiler view of Türkiye. Tiles wrap horizontally, so panning east or west never
 * runs out of map. Pins are university buildings, not city labels.
 *
 * The tile source is chosen in `features/map/tiles.ts`, which the CSP in
 * `middleware.ts` also reads — they have to name the same host or the tiles are
 * blocked, and they were out of step before that module existed.
 *
 * Leaflet is imperative and owns its own DOM, so this stays an effect-driven component
 * rather than being expressed in JSX — the same shape the prototype uses.
 */
export default function TurkeyMap({
  universities, active, onSelect,
}: {
  /* Pins, not cards. The map needs five fields and drawing it from the card payload
     would tie the two together, so a change to the card shape would silently change
     what the map can render. */
  universities: UniversityPin[];
  active: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const t = useT();
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!host.current || map.current) return;
    const m = L.map(host.current, {
      worldCopyJump: true, scrollWheelZoom: false, zoomControl: true,
      minZoom: 4, maxZoom: 14, attributionControl: true,
    });
    /*
     * The key is read here rather than passed in because Next inlines `NEXT_PUBLIC_*`
     * at build time — the literal `process.env.NEXT_PUBLIC_MAPTILER_KEY` is what gets
     * substituted, so it cannot be destructured or accessed dynamically and still work.
     */
    const tiles = tileLayerFor(process.env.NEXT_PUBLIC_MAPTILER_KEY);

    if (tiles.provider === "osm" && process.env.NODE_ENV === "production") {
      // Should be unreachable: `config.ts` refuses to boot in production without the
      // key. Said out loud anyway, because the failure it guards against is a map that
      // looks fine to whoever deployed it and violates OSM's usage policy silently.
      console.warn(
        "[map] NEXT_PUBLIC_MAPTILER_KEY was not inlined at build time; falling back to OSM.",
      );
    }

    L.tileLayer(tiles.url, {
      maxZoom: 19, noWrap: false, attribution: tiles.attribution,
    }).addTo(m);
    m.fitBounds([[35.8, 25.6], [42.4, 44.8]], { padding: [24, 24] });
    m.on("click", () => onSelect(null));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;

    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(host.current);
    const t = setTimeout(() => m.invalidateSize(), 250);
    return () => { clearTimeout(t); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    universities.forEach((u) => {
      // The API only returns pins that have coordinates, but the type still allows null
      // and a marker at [null, null] silently lands at the origin, off the coast of
      // Ghana, where it looks like a real university nobody can explain.
      if (u.latitude === null || u.longitude === null) return;

      const on = active === u.slug;
      const html = `<span class="ct-pin${on ? " ct-pin-on" : ""}" title="${u.name}">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V8l6-4 6 4v13"/><path d="M10 21v-5h4v5"/><path d="M10 11h.01"/><path d="M14 11h.01"/></svg></span>`;
      const marker = L.marker([u.latitude, u.longitude], {
        icon: L.divIcon({ html, className: "ct-pin-wrap", iconSize: [34, 34], iconAnchor: [17, 17] }),
        title: u.name, riseOnHover: true,
      });
      marker.bindTooltip(`${u.name}<br><b>${u.city}</b>`, { direction: "top", offset: [0, -14] });
      marker.on("click", (e) => { L.DomEvent.stopPropagation(e); onSelect(u.slug); });
      marker.addTo(layer.current!);
    });
  }, [universities, active, onSelect]);

  return (
    <Card padding="0" style={{ overflow: "hidden", position: "relative" }}>
      <div ref={host} style={{ width: "100%", height: "clamp(320px,46vh,520px)", background: "var(--neutral-100)" }} />
      <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 500, display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "8px 14px", borderRadius: "var(--radius-pill)", background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-ui)", fontSize: "var(--fs-caption)", color: "var(--green-800)" }}>
        <Icon name="mouse-pointer-click" size={14} color="var(--green-600)" />
        {t("{count} campuses shown. Click a pin to open the university.", { count: universities.length })}
      </div>
    </Card>
  );
}
