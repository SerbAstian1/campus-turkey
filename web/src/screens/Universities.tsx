"use client";

/** University directory. Ported from site/Directory.jsx. */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button, CTABanner, Card, DirectoryToolbar, Icon, ScrollReveal, Tag, UniversityCard, ASSETS } from "@/ds";
import { universities as ALL, type University } from "@/content";
import { go } from "@/app/router";
import { CardGrid } from "@/components/CardGrid";

/**
 * OpenStreetMap view of Türkiye. Tiles wrap horizontally, so panning east or west never
 * runs out of map. Pins are university buildings, not city labels.
 *
 * Leaflet is imperative and owns its own DOM, so this stays an effect-driven component
 * rather than being expressed in JSX — the same shape the prototype uses.
 */
function TurkeyMap({
  universities, active, onSelect,
}: {
  universities: University[];
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
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, noWrap: false, attribution: "&copy; OpenStreetMap contributors",
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
      const on = active === u.slug;
      const html = `<span class="ct-pin${on ? " ct-pin-on" : ""}" title="${u.name}">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V8l6-4 6 4v13"/><path d="M10 21v-5h4v5"/><path d="M10 11h.01"/><path d="M14 11h.01"/></svg></span>`;
      const marker = L.marker([u.lat, u.lng], {
        icon: L.divIcon({ html, className: "ct-pin-wrap", iconSize: [34, 34], iconAnchor: [17, 17] }),
        title: u.name, riseOnHover: true,
      });
      marker.bindTooltip(`${u.name}<br><b>${u.city}</b> · ${u.type} · ${u.tuition}`, { direction: "top", offset: [0, -14] });
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

const money = (t: string) => parseInt(String(t).replace(/[^0-9]/g, ""), 10) || 0;

export default function Universities() {
  const [city, setCity] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [scholarship, setScholarship] = useState(false);
  const [lang, setLang] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("Most popular");
  const [shown, setShown] = useState(9);
  const [pin, setPin] = useState<string | null>(null);

  const cities = [...new Set(ALL.map((u) => u.city))]
    .map((c) => ({ name: c, count: ALL.filter((u) => u.city === c).length }))
    .sort((a, b) => b.count - a.count);

  const filtered = ALL.filter((u) =>
    (!city || u.city === city) && (!type || u.type === type) &&
    (!scholarship || u.scholarship) &&
    (!lang || u.languages.includes(lang)) &&
    (!query || u.name.toLowerCase().includes(query.toLowerCase()) || u.city.toLowerCase().includes(query.toLowerCase())));

  const sorted = [...filtered].sort((a, b) =>
    sort === "Name A to Z" ? a.name.localeCompare(b.name)
      : sort === "Lowest tuition" ? money(a.tuition) - money(b.tuition)
        : b.programs - a.programs);

  const list = sorted.slice(0, shown);
  const clear = () => { setCity(null); setType(null); setScholarship(false); setLang(null); setQuery(""); setPin(null); };

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
            {`${ALL.length} universities in the directory today, out of 200+ we hold agreements with. Filter by city, type, language of instruction and scholarships.`}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={80}><TurkeyMap universities={filtered} active={pin} onSelect={onPin} /></ScrollReveal>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", height: 44, padding: "0 16px", background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-pill)", minWidth: 260 }}>
            <Icon name="search" size={17} color="var(--neutral-500)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by university or city" aria-label="Search universities"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-ui)", fontSize: "var(--fs-body-sm)", color: "var(--green-900)" }} />
          </div>
          {["Public", "Private"].map((t) => (
            <Tag key={t} selected={type === t} onClick={() => setType(type === t ? null : t)}
              count={ALL.filter((u) => u.type === t).length}>{t}</Tag>
          ))}
          <Tag selected={scholarship} onClick={() => setScholarship(!scholarship)}
            count={ALL.filter((u) => u.scholarship).length}>Scholarship</Tag>
          <Tag selected={lang === "English"} onClick={() => setLang(lang === "English" ? null : "English")}
            count={ALL.filter((u) => u.languages.includes("English")).length}>English-taught</Tag>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
          <span className="ct-eyebrow" style={{ marginInlineEnd: "var(--space-2)" }}>City</span>
          {cities.slice(0, 10).map((c) => (
            <Tag key={c.name} selected={city === c.name} count={c.count}
              onClick={() => setCity(city === c.name ? null : c.name)}
              onRemove={city === c.name ? () => setCity(null) : undefined}>{c.name}</Tag>
          ))}
        </div>

        <DirectoryToolbar total={ALL.length} shown={list.length} view={view} onViewChange={setView} onClear={clear}
          sort={sort} sortOptions={["Most popular", "Name A to Z", "Lowest tuition"]} onSortChange={(e) => setSort(e.target.value)} />

        {list.length ? (
          /* Grid and list are different layouts, not one layout with a different
             column count — the list is a single flowing column of row-shaped cards and
             has no rows to balance. Rendering the cards once and choosing the container
             keeps the two in step. */
          (() => {
            const cards = list.map((u, i) => (
              <ScrollReveal key={u.slug} delay={(i % 3) * 80} style={{ display: "flex" }}>
                <UniversityCard
                  name={u.name} city={u.city} type={u.type} languages={u.languages} tuition={u.tuition}
                  scholarship={u.scholarship} programs={u.programs}
                  href={`#/university/${u.slug}`} layout={view === "grid" ? "grid" : "row"} style={{ width: "100%" }}
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

        {shown < filtered.length ? (
          <Button variant="secondary" size="lg" icon="chevron-down" onClick={() => setShown(shown + 9)} style={{ marginInline: "auto" }}>
            Load more universities
          </Button>
        ) : null}

        <ScrollReveal>
          <CTABanner eyebrow="Not sure which one" title="Send us your grades and we will shortlist for you"
            body="One short form. We reply with universities you can actually get into." primaryLabel="Apply Now"
            primaryHref="#/apply" secondaryLabel="Book a Consultation" secondaryHref="#/contact" assetBase={ASSETS} />
        </ScrollReveal>
      </div>
    </div>
  );
}
