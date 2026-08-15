"use client";

/** University directory. Ported from site/Directory.jsx. */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button, CTABanner, Card, DirectoryToolbar, Icon, ScrollReveal, Tag, UniversityCard, ASSETS } from "@/ds";
import {
  useDirectory, useFacets, useFilters,
  type UniversityPin,
} from "@/features/universities/data";
import { go, useHref } from "@/app/router";
import { CardGrid } from "@/components/CardGrid";
import { tileLayerFor } from "@/features/map/tiles";

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
function TurkeyMap({
  universities, active, onSelect,
}: {
  /* Pins, not cards. The map needs five fields and drawing it from the card payload
     would tie the two together, so a change to the card shape would silently change
     what the map can render. */
  universities: UniversityPin[];
  active: string | null;
  onSelect: (slug: string | null) => void;
}) {
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
        {universities.length} campuses shown. Click a pin to open the university.
      </div>
    </Card>
  );
}

/**
 * The directory now queries the database rather than filtering an imported array.
 *
 * What changed and why: §44 requires server-side filtering and §78 forbids shipping the
 * whole catalogue to the browser. Every filter below sets state, the hook debounces and
 * fetches, and the result arrives paged. The visible behaviour is deliberately the same
 * — the same tags, the same toolbar, the same empty state — because the point was to
 * change where the work happens, not what the page looks like.
 *
 * Sort options are now the three the API can actually order by. "Most popular" and
 * "Lowest tuition" are gone: the first was `programs` descending under a label that
 * claimed something the data does not know, and the second parsed digits out of a
 * display string like "$400 – $1,500 / year", which sorts on 400 and silently ignores
 * the range. Real tuition sorting arrives with `Program.tuitionMinor`.
 */

const SORTS = [
  { value: "name", label: "Name A to Z" },
  { value: "city", label: "City A to Z" },
  { value: "founded", label: "Oldest first" },
] as const;

export default function Universities() {
  const href = useHref();
  const { filters, update, reset } = useFilters();
  const facets = useFacets();
  const directory = useDirectory(filters);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [pin, setPin] = useState<string | null>(null);

  const clear = () => { reset(); setPin(null); };

  const onPin = (slug: string | null) => {
    setPin(slug);
    if (slug) go(`university/${slug}`);
  };

  return (
    <div style={{ background: "var(--surface-subtle)", paddingTop: 140 }}>
      <div className="ct-container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)", paddingBottom: "var(--section-y)" }}>
        <ScrollReveal style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span className="ct-eyebrow">University directory</span>
          <h1 style={{ fontSize: "var(--fs-display-2)", lineHeight: "var(--lh-display)", letterSpacing: "var(--ls-display)", color: "var(--text-heading)", margin: 0, maxWidth: "20ch" }}>Find your university in Türkiye</h1>
          <p style={{ fontSize: "var(--fs-lead)", lineHeight: "var(--lh-body)", color: "var(--text-body)", margin: 0, maxWidth: 620 }}>
            Filter by city, type, language of instruction and scholarships.
          </p>
        </ScrollReveal>

        {/* Pins for every match, not just the visible page. A map that pages would drop
            and restore pins as somebody clicks through, which reads as broken. */}
        <ScrollReveal delay={80}><TurkeyMap universities={directory.pins} active={pin} onSelect={onPin} /></ScrollReveal>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", height: 44, padding: "0 16px", background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-pill)", minWidth: 260 }}>
            <Icon name="search" size={17} color="var(--neutral-500)" />
            <input value={filters.search} onChange={(e) => update({ search: e.target.value })}
              placeholder="Search by university or city" aria-label="Search universities"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)" }} />
          </div>
          {/* Counts are gone from the tags. They were computed from the full array, which
              no longer exists here; showing a per-filter count would mean a query per tag
              on every keystroke to display a number nobody acts on. The total is in the
              toolbar, where it answers the question people actually have. */}
          {facets.types.map((t) => (
            <Tag key={t} selected={filters.type === t}
              onClick={() => update({ type: filters.type === t ? null : t })}>
              {t === "PUBLIC" ? "Public" : "Private"}
            </Tag>
          ))}
          <Tag selected={filters.scholarship} onClick={() => update({ scholarship: !filters.scholarship })}>
            Scholarship
          </Tag>
          {facets.languages.includes("English") ? (
            <Tag selected={filters.language === "English"}
              onClick={() => update({ language: filters.language === "English" ? null : "English" })}>
              English-taught
            </Tag>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
          <span className="ct-eyebrow" style={{ marginInlineEnd: "var(--space-2)" }}>City</span>
          {facets.cities.slice(0, 10).map((c) => (
            <Tag key={c} selected={filters.city === c}
              onClick={() => update({ city: filters.city === c ? null : c })}
              onRemove={filters.city === c ? () => update({ city: null }) : undefined}>{c}</Tag>
          ))}
        </div>

        <DirectoryToolbar total={directory.total} shown={directory.items.length} view={view}
          onViewChange={setView} onClear={clear}
          sort={SORTS.find((s) => s.value === filters.sort)?.label ?? SORTS[0].label}
          sortOptions={SORTS.map((s) => s.label)}
          onSortChange={(e) => {
            const chosen = SORTS.find((s) => s.label === e.target.value);
            if (chosen) update({ sort: chosen.value });
          }} />

        {directory.error ? (
          <Card style={{ textAlign: "center", padding: "var(--space-16)" }}>
            <Icon name="alert-circle" size={26} color="var(--status-danger)" />
            <h3 style={{ margin: "var(--space-4) 0 var(--space-2)", fontSize: "var(--fs-h3)" }}>{directory.error}</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>This is usually temporary. Try again in a moment.</p>
          </Card>
        ) : directory.items.length ? (
          /* Grid and list are different layouts, not one layout with a different
             column count — the list is a single flowing column of row-shaped cards and
             has no rows to balance. Rendering the cards once and choosing the container
             keeps the two in step. */
          (() => {
            const cards = directory.items.map((u, i) => (
              <ScrollReveal key={u.slug} delay={(i % 3) * 80} style={{ display: "flex" }}>
                <UniversityCard
                  name={u.name} city={u.city}
                  /* The API returns the enum; the card renders the word. */
                  type={u.type === "PUBLIC" ? "Public" : "Private"}
                  languages={u.languages} tuition={u.tuitionDisplay}
                  scholarship={u.scholarship} programs={u.programCount}
                  href={href(`university/${u.slug}`)} layout={view === "grid" ? "grid" : "row"} style={{ width: "100%" }}
                />
              </ScrollReveal>
            ));

            return view === "grid" ? (
              <CardGrid min={280} gap="var(--space-6)">{cards}</CardGrid>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>{cards}</div>
            );
          })()
        ) : (
          <Card style={{ textAlign: "center", padding: "var(--space-16)" }}>
            <Icon name="search-x" size={26} color="var(--neutral-400)" />
            <h3 style={{ margin: "var(--space-4) 0 var(--space-2)", fontSize: "var(--fs-h3)" }}>No universities match those filters</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>Clear a filter and try again, or message us and we will search for you.</p>
            <Button variant="secondary" icon="rotate-ccw" onClick={clear} style={{ marginInline: "auto" }}>Clear filters</Button>
          </Card>
        )}

        {/* Numbered pages rather than "load more". The directory is something people
            scan and come back to, and "page 3 of 4" is a position you can return to
            while "I pressed load more twice" is not. */}
        {directory.pageCount > 1 ? (
          <nav aria-label="Directory pages" style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="secondary" size="md" icon="chevron-left"
              disabled={directory.page <= 1 || directory.loading}
              onClick={() => update({ page: directory.page - 1 })}>
              Previous
            </Button>
            <span aria-live="polite" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--text-body)", fontVariantNumeric: "tabular-nums" }}>
              Page {directory.page} of {directory.pageCount}
            </span>
            <Button variant="secondary" size="md" icon="chevron-right"
              disabled={directory.page >= directory.pageCount || directory.loading}
              onClick={() => update({ page: directory.page + 1 })}>
              Next
            </Button>
          </nav>
        ) : null}

        <ScrollReveal>
          <CTABanner eyebrow="Not sure which one" title="Send us your grades and we will shortlist for you"
            body="One short form. We reply with universities you can actually get into." primaryLabel="Apply Now"
            primaryHref={href("apply")} secondaryLabel="Book a Consultation" secondaryHref={href("contact")} assetBase={ASSETS} />
        </ScrollReveal>
      </div>
    </div>
  );
}
